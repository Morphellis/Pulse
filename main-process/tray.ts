import fs from 'fs'
import path from 'path'
import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron'

let tray: Tray | null = null

/**
 * Иконка лежит рядом с кодом в упакованном приложении и в build при разработке,
 * поэтому проверяем оба варианта
 */
function resolveIconPath() {
  const fileName = process.platform === 'win32' ? 'icon.ico' : 'icon.png'
  const candidates = [
    path.join(__dirname, 'build', fileName),
    path.join(app.getAppPath(), 'build', fileName),
    path.join(process.cwd(), 'build', fileName)
  ]

  return candidates.find((candidate) => fs.existsSync(candidate))
}

type TrayHandlers = {
  onOpen: () => void
  onQuit: () => void
}

/**
 * Возвращает false, если иконку не удалось создать: без значка в трее прятать окно нельзя,
 * иначе пользователь останется без способа вернуть приложение
 */
export function initTray({ onOpen, onQuit }: TrayHandlers): boolean {
  const iconPath = resolveIconPath()
  if (!iconPath) {
    console.warn('[tray] иконка не найдена, трей отключен')
    return false
  }

  const icon = nativeImage.createFromPath(iconPath)
  if (icon.isEmpty()) {
    console.warn('[tray] иконка не читается, трей отключен')
    return false
  }

  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('VK Desktop')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Открыть VK Desktop', click: onOpen },
    { type: 'separator' },
    { label: 'Выход', click: onQuit }
  ]))

  tray.on('click', onOpen)
  tray.on('double-click', onOpen)

  return true
}

/** Пока окно спрятано, единственный признак новых сообщений — подсказка у значка */
export function setTrayUnread(count: number) {
  tray?.setToolTip(count > 0 ? `VK Desktop — непрочитанных: ${count}` : 'VK Desktop')
}

export function destroyTray() {
  tray?.destroy()
  tray = null
}

/**
 * Возвращает окно из свернутого состояния и поднимает поверх остальных
 */
export function revealWindow(win: BrowserWindow) {
  if (win.isMinimized()) {
    win.restore()
  }

  win.show()
  win.focus()
}
