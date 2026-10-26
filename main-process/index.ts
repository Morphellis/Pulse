import fs from 'fs'
import os from 'os'
import path from 'path'
import Electron, {
  app,
  BrowserWindow,
  ipcMain,
  nativeTheme,
  safeStorage,
  screen,
  session,
  shell
} from 'electron'
import type { Dictionary } from 'services/contracts/ILang'
import type { MainSettings as PostMainSettings } from 'store/mainSettings'
import type { AppInfo, WindowAction } from './bridge'
import { buildMacOSMenu } from './buildMacOSMenu'
import { initIpcEvents } from './ipcEvents'
import {
  clearNotifications,
  initNotificationWindow,
  setNotificationTheme,
  showNotification
} from './notificationWindow'
import {
  getColorBackgroundContent,
  isWebUrl,
  NotificationPayload,
  NotificationTheme
} from './shared'
import { destroyTray, initTray, revealWindow, setTrayUnread } from './tray'

const isMacOS = process.platform === 'darwin'

// Кастомный тайтлбар по умолчанию включаем только для винды < 10 версии
const shouldUseCustomTitlebar = process.platform === 'win32' && parseInt(os.release(), 10) < 10

/*
  ВК отдаёт прямые ссылки на видео только клиенту, который представился не браузером:
  запрос за files уходит с User-Agent вида VKDesktop/x.y.z (см. подмену X-User-Agent ниже),
  и ВК подписывает ссылку параметром srcAg=UNKNOWN.

  Дальше эту подпись сверяет уже CDN: если за самим файлом прийти с обычным
  User-Agent окна (Chrome), в ответ прилетает 400, а плеер показывает ошибку формата.
  Поэтому запросам за медиа возвращаем тот же User-Agent, под который выдана ссылка
*/
const VIDEO_CDN_USER_AGENT = `VKDesktop/${app.getVersion()}`

/*
  Обработчик заголовков один на всю сессию и вызывается на каждый запрос
  приложения, поэтому проверяем адрес регуляркой, а не разбором URL
*/
const VIDEO_CDN_URL = /^https?:\/\/[^/]+\.(okcdn\.ru|mycdn\.me)\//

/** Открывает ссылку в системном браузере, если это вообще веб-ссылка — см. isWebUrl */
function openExternalUrl(rawUrl: string) {
  if (!isWebUrl(rawUrl)) {
    console.warn('[main] non-web url rejected:', rawUrl)
    return
  }

  shell.openExternal(rawUrl)
}

/*
  Второй запуск не поднимает вторую копию, а показывает уже работающую.
  Без этого свернутое в трей приложение легко продублировать ярлыком
*/
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

const appDataPath = path.join(app.getPath('appData'), 'vk-desktop')
const storePath = path.join(appDataPath, 'storage-v1.json')

type MainSettings = Omit<PostMainSettings, 'bounds'> & {
  bounds: PostMainSettings['bounds'] | null
}

let mainSettings: MainSettings = {
  bounds: null,
  useCustomTitlebar: shouldUseCustomTitlebar,
  appearance: {
    scheme: 'vkcom',
    theme: 'system'
  },
  alwaysOnTop: false,
  closeToTray: true
}

try {
  const localMainSettings = JSON.parse(fs.readFileSync(storePath, 'utf-8')) as MainSettings
  mainSettings = {
    ...mainSettings,
    ...localMainSettings
  }
} catch {
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath, { recursive: true })
  }
  fs.writeFileSync(storePath, JSON.stringify(mainSettings))
}

nativeTheme.themeSource = mainSettings.appearance.theme

function createWindow(params: Electron.BrowserWindowConstructorOptions = {}) {
  const isFrameEnabled = 'frame' in params
    ? params.frame
    : !mainSettings.useCustomTitlebar

  const backgroundColor = getColorBackgroundContent(
    nativeTheme.shouldUseDarkColors ? 'dark' : 'light',
    mainSettings.appearance.scheme
  )

  const win = new BrowserWindow({
    minWidth: 400,
    minHeight: 550,
    show: false,
    frame: isFrameEnabled,
    titleBarStyle: isFrameEnabled ? 'default' : 'hidden',
    trafficLightPosition: isFrameEnabled ? undefined : { x: 8, y: 4 },
    alwaysOnTop: mainSettings.alwaysOnTop,
    backgroundColor,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Рендерер изолирован от Node.js: всё общение с Electron идет через preload-мост
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Отключено, чтобы ходить в api.vk.com/oauth.vk.com со страницы file://
      // и подменять Origin/Referer/User-Agent через заголовки X-* (см. onBeforeSendHeaders)
      webSecurity: false,
      spellcheck: true
    },
    ...params
  })

  win.webContents.session.setSpellCheckerLanguages(['ru', 'en-US'])

  return win
}

let settingsWriteQueue = Promise.resolve()

function writeMainSettings(json: string) {
  settingsWriteQueue = settingsWriteQueue
    .then(() => fs.promises.writeFile(storePath, json))
    .catch((error: unknown) => {
      console.warn('[main] failed to write settings', error)
    })
}

type IpcHandlers = {
  handleSync: (channel: string, handler: (...args: unknown[]) => unknown) => void
  handle: (channel: string, handler: (...args: unknown[]) => void) => void
}

/**
 * Обработчики IPC принимают сообщения только от главного окна:
 * любой другой webContents (например, случайно открытая внешняя страница) игнорируется
 */
function createIpcHandlers(mainWindow: BrowserWindow): IpcHandlers {
  const isTrustedSender = (event: Electron.IpcMainEvent) => (
    event.sender === mainWindow.webContents &&
    event.senderFrame === mainWindow.webContents.mainFrame
  )

  return {
    handleSync(channel, handler) {
      ipcMain.on(channel, (event, ...args: unknown[]) => {
        if (!isTrustedSender(event)) {
          event.returnValue = undefined
          return
        }

        try {
          event.returnValue = handler(...args)
        } catch (error) {
          console.warn(`[main] ${channel} failed`, error)
          event.returnValue = undefined
        }
      })
    },
    handle(channel, handler) {
      ipcMain.on(channel, (event, ...args: unknown[]) => {
        if (!isTrustedSender(event)) {
          return
        }

        try {
          handler(...args)
        } catch (error) {
          console.warn(`[main] ${channel} failed`, error)
        }
      })
    }
  }
}

function initBridgeIpc(mainWindow: BrowserWindow, { handleSync, handle }: IpcHandlers) {
  const windowActions: Record<WindowAction, () => void> = {
    minimize: () => mainWindow.minimize(),
    maximize: () => mainWindow.maximize(),
    unmaximize: () => mainWindow.unmaximize(),
    restore: () => mainWindow.restore(),
    close: () => mainWindow.close()
  }

  handleSync('app:get-info', (): AppInfo => ({
    platform: process.platform,
    version: app.getVersion(),
    useCustomTitlebarDefault: shouldUseCustomTitlebar
  }))

  handleSync('window:get-bounds', () => mainWindow.getBounds())
  handleSync('window:is-maximized', () => mainWindow.isMaximized())
  handleSync('window:is-full-screen', () => mainWindow.isFullScreen())

  handle('window:action', (action) => {
    if (typeof action === 'string' && Object.hasOwn(windowActions, action)) {
      windowActions[action as WindowAction]()
    }
  })

  handle('window:set-background-color', (color) => {
    if (typeof color === 'string' && /^#[0-9a-f]{3,8}$/i.test(color)) {
      mainWindow.setBackgroundColor(color)
    }
  })

  mainWindow.on('focus', () => mainWindow.webContents.send('window:focus'))
  mainWindow.on('blur', () => mainWindow.webContents.send('window:blur'))

  handleSync('theme:should-use-dark-colors', () => nativeTheme.shouldUseDarkColors)

  handle('theme:set-source', (theme) => {
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      nativeTheme.themeSource = theme
    }
  })

  nativeTheme.on('updated', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('theme:updated')
    }
  })

  handleSync('main-settings:read', () => {
    try {
      return fs.readFileSync(storePath, 'utf-8')
    } catch {
      return '{}'
    }
  })

  handle('main-settings:write', (json) => {
    if (typeof json !== 'string') {
      return
    }

    // Проверяем, что нам прислали валидный JSON, прежде чем перезаписывать файл
    JSON.parse(json)
    writeMainSettings(json)
  })

  handleSync('secure-storage:is-available', () => safeStorage.isEncryptionAvailable())

  handleSync('secure-storage:encrypt', (plain) => (
    typeof plain === 'string'
      ? safeStorage.encryptString(plain).toString('base64')
      : undefined
  ))

  handleSync('secure-storage:decrypt', (encrypted) => (
    typeof encrypted === 'string'
      ? safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
      : undefined
  ))

  handle('notification:show', (payload) => {
    if (typeof payload === 'object' && payload !== null) {
      showNotification(payload as NotificationPayload)
    }
  })

  handle('notification:clear', (peerId) => {
    clearNotifications(typeof peerId === 'number' ? peerId : undefined)
  })

  handle('notification:theme', (theme) => {
    if (typeof theme === 'object' && theme !== null) {
      setNotificationTheme(theme as NotificationTheme)
    }
  })

  handle('tray:unread', (count) => {
    if (typeof count === 'number') {
      setTrayUnread(count)
    }
  })

  if (isMacOS) {
    handle('menu:build', (labels) => {
      buildMacOSMenu(mainWindow, labels as Dictionary['app_menu_labels'])
    })
  }
}

app.once('ready', () => {
  const mainWindow = createWindow()
  const ipc = createIpcHandlers(mainWindow)

  initIpcEvents(mainWindow)
  initBridgeIpc(mainWindow, ipc)

  initNotificationWindow(mainWindow, {
    onActivate: (peerId) => {
      revealWindow(mainWindow)
      mainWindow.webContents.send('notification:open', peerId)
    }
  })

  app.on('second-instance', () => revealWindow(mainWindow))

  mainWindow.webContents.once('dom-ready', () => {
    if (mainSettings.bounds) {
      const { bounds } = mainSettings
      const { width, height } = screen.getPrimaryDisplay().workAreaSize
      const isMaximized = bounds.width >= width && bounds.height >= height

      mainWindow.setBounds({
        x: bounds.x,
        y: bounds.y,
        width: isMaximized ? width : bounds.width,
        height: isMaximized ? height : bounds.height
      })

      if (isMaximized) {
        mainWindow.maximize()
      }
    }

    mainWindow.show()
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url)
    return { action: 'deny' }
  })

  /*
    Уводить само окно приложения на другой адрес нельзя ни при каких условиях:
    открытая в нём внешняя страница получила бы доступ к мосту с main-процессом.
    Роутер работает на хеше, а хеш-переходы сюда не приходят,
    так что легальных навигаций здесь просто нет
  */
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url === mainWindow.webContents.getURL()) {
      return
    }

    event.preventDefault()
    openExternalUrl(url)
  })

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    if (details.responseHeaders) {
      details.responseHeaders['x-original-url-by-electron'] = [details.url]
    }
    callback(details)
  })

  session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const rewrite = (proxyHeaderName: string, targetHeaderName: string) => {
      const headerValue = details.requestHeaders[proxyHeaderName]

      if (headerValue) {
        details.requestHeaders[targetHeaderName] = headerValue
        delete details.requestHeaders[proxyHeaderName]
      }
    }

    rewrite('X-User-Agent', 'User-Agent')
    rewrite('X-Origin', 'Origin')
    rewrite('X-Referer', 'Referer')

    if (VIDEO_CDN_URL.test(details.url)) {
      details.requestHeaders['User-Agent'] = VIDEO_CDN_USER_AGENT
    }

    callback(details)
  })

  if (isMacOS) {
    let forceClose = false

    app.on('before-quit', () => {
      forceClose = true
    })

    mainWindow.on('close', (event) => {
      // Позволяем полностью закрыть приложение
      if (forceClose) {
        return
      }

      event.preventDefault()

      if (mainWindow.isFullScreen()) {
        mainWindow.setFullScreen(false)
        mainWindow.once('leave-full-screen', () => mainWindow.hide())
      } else {
        mainWindow.hide()
      }
    })

    app.on('activate', (event, hasVisibleWindows) => {
      // Приложение было закрыто через ⌘ + W
      if (!hasVisibleWindows) {
        mainWindow.show()
      }
    })
  } else {
    mainWindow.setMenuBarVisibility(false)

    let forceClose = false
    const quit = () => {
      forceClose = true
      destroyTray()
      app.quit()
    }

    /*
      Трей нужен, чтобы спрятанное окно можно было вернуть. Если значок создать не вышло,
      крестик так и остается выходом из приложения: иначе окно пропало бы безвозвратно
    */
    const hasTray = initTray({
      onOpen: () => revealWindow(mainWindow),
      onQuit: quit
    })

    ipc.handle('window:quit', quit)

    // Настройку хранит рендерер, а решение по крестику принимается здесь
    ipc.handle('window:close-to-tray', (value) => {
      if (typeof value === 'boolean') {
        mainSettings.closeToTray = value
      }
    })

    app.on('before-quit', () => {
      forceClose = true
    })

    mainWindow.on('close', (event) => {
      if (forceClose || !hasTray || !mainSettings.closeToTray) {
        destroyTray()
        return
      }

      event.preventDefault()
      mainWindow.hide()
      mainWindow.webContents.send('window:hidden')
    })

    app.on('window-all-closed', () => {
      app.quit()
    })
  }
})
