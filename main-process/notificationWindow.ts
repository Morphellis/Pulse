import path from 'path'
import { BrowserWindow, ipcMain, screen } from 'electron'
import { NOTIFICATION_WIDTH, NotificationPayload, NotificationTheme } from './shared'

/** Отступ от края рабочей области, чтобы окно не липло к панели задач */
const SCREEN_MARGIN = 12

let notificationWindow: BrowserWindow | null = null
let lastTheme: NotificationTheme | null = null

/*
  Окно создается при первом уведомлении, а страница в нем загружается не мгновенно.
  Отправленное в этот промежуток просто пропало бы, поэтому копим и досылаем после загрузки
*/
let isWindowReady = false
const pendingPayloads: NotificationPayload[] = []

/**
 * Сколько уведомлений держим, пока окно грузится.
 *
 * Если страница не загрузится вовсе, очередь без предела копила бы каждое
 * пришедшее сообщение до конца работы приложения, а потом вывалила всё разом
 */
const MAX_PENDING_PAYLOADS = 10

function createNotificationWindow() {
  /*
    Окно намеренно нефокусируемое и без рамки: оно не должно перехватывать фокус у того,
    чем пользователь сейчас занят, но клики по себе принимать обязано
  */
  const win = new BrowserWindow({
    width: NOTIFICATION_WIDTH,
    height: 1,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    alwaysOnTop: true,
    acceptFirstMouse: true,
    webPreferences: {
      preload: path.join(__dirname, 'notificationPreload.js'),
      // Окно рисует чужой текст и аватары, поэтому Node.js ему не положен
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Аватары грузятся с CDN ВК со страницы file://
      webSecurity: false,
      /*
        Пока окно спрятано, Chromium душит таймеры вплоть до одного срабатывания в минуту,
        и уведомление, пришедшее следом, висело бы на экране до упора
      */
      backgroundThrottling: false
    }
  })

  // Поверх полноэкранных приложений и чужих окон «поверх всех»
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(new URL('notification.html', process.env.VITE_DEV_SERVER_URL).href)
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'notification.html'))
  }

  win.webContents.once('did-finish-load', () => {
    isWindowReady = true

    // Окно могло быть пересоздано, поэтому сразу возвращаем ему актуальную тему
    if (lastTheme) {
      win.webContents.send('notification:theme', lastTheme)
    }

    for (const payload of pendingPayloads) {
      win.webContents.send('notification:add', payload)
    }
    pendingPayloads.length = 0
  })

  /*
    Без этого неудачная загрузка выглядит как полное отсутствие уведомлений:
    isWindowReady навсегда остаётся false, и всё уходит в очередь молча
  */
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[notification] окно не загрузилось:', errorCode, errorDescription)
  })

  win.on('closed', () => {
    notificationWindow = null
    isWindowReady = false
    pendingPayloads.length = 0
  })

  return win
}

export function showNotification(payload: NotificationPayload) {
  if (!notificationWindow || notificationWindow.isDestroyed()) {
    isWindowReady = false
    notificationWindow = createNotificationWindow()
  }

  if (isWindowReady) {
    notificationWindow.webContents.send('notification:add', payload)
  } else {
    pendingPayloads.push(payload)

    while (pendingPayloads.length > MAX_PENDING_PAYLOADS) {
      pendingPayloads.shift()
    }
  }
}

export function clearNotifications(peerId?: number) {
  notificationWindow?.webContents.send('notification:clear', peerId)
}

export function setNotificationTheme(theme: NotificationTheme) {
  lastTheme = theme
  notificationWindow?.webContents.send('notification:theme', theme)
}

/**
 * Ставит окно в правый нижний угол того экрана, где сейчас курсор:
 * на нескольких мониторах уведомление должно появиться там, куда смотрит пользователь
 */
function placeWindow(win: BrowserWindow, height: number) {
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())

  win.setBounds({
    x: workArea.x + workArea.width - NOTIFICATION_WIDTH - SCREEN_MARGIN,
    y: workArea.y + workArea.height - height - SCREEN_MARGIN,
    width: NOTIFICATION_WIDTH,
    height
  })
}

type NotificationHandlers = {
  onActivate: (peerId: number) => void
}

/** Сообщения принимаем только от самого окна уведомлений */
function isNotificationWindowSender(event: Electron.IpcMainEvent) {
  return notificationWindow !== null && event.sender === notificationWindow.webContents
}

export function initNotificationWindow(
  mainWindow: BrowserWindow,
  { onActivate }: NotificationHandlers
) {
  ipcMain.on('notification:resize', (event, height: unknown) => {
    const win = notificationWindow
    if (!isNotificationWindowSender(event) || !win || win.isDestroyed()) {
      return
    }

    if (typeof height !== 'number' || !Number.isFinite(height) || height <= 0) {
      win.hide()
      return
    }

    placeWindow(win, Math.min(Math.ceil(height), 2000))

    if (!win.isVisible()) {
      // Именно showInactive: обычный show увел бы фокус с текущего окна пользователя
      win.showInactive()
    }
  })

  ipcMain.on('notification:activate', (event, peerId: unknown) => {
    if (isNotificationWindowSender(event) && typeof peerId === 'number') {
      onActivate(peerId)
    }
  })

  mainWindow.on('closed', () => {
    notificationWindow?.destroy()
    notificationWindow = null
    isWindowReady = false
  })
}
