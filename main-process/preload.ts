import { contextBridge, ipcRenderer, IpcRendererEvent, Rectangle } from 'electron'
import type { AppInfo, ElectronBridge, WindowAction } from './bridge'

function subscribe<T>(channel: string, callback: (payload: T) => void) {
  const listener = (event: IpcRendererEvent, payload: T) => callback(payload)
  ipcRenderer.on(channel, listener)

  return () => {
    ipcRenderer.off(channel, listener)
  }
}

function sendWindowAction(action: WindowAction) {
  ipcRenderer.send('window:action', action)
}

const bridge: ElectronBridge = {
  appInfo: ipcRenderer.sendSync('app:get-info') as AppInfo,

  window: {
    getBounds: () => ipcRenderer.sendSync('window:get-bounds') as Rectangle,
    isMaximized: () => ipcRenderer.sendSync('window:is-maximized') as boolean,
    isFullScreen: () => ipcRenderer.sendSync('window:is-full-screen') as boolean,
    minimize: () => sendWindowAction('minimize'),
    maximize: () => sendWindowAction('maximize'),
    unmaximize: () => sendWindowAction('unmaximize'),
    restore: () => sendWindowAction('restore'),
    close: () => sendWindowAction('close'),
    setBackgroundColor: (color) => ipcRenderer.send('window:set-background-color', color),
    onBoundsChange: (callback) => subscribe('bounds-change', callback),
    onMaximizeChange: (callback) => subscribe('maximize-change', callback),
    onFocus: (callback) => subscribe('window:focus', () => callback()),
    onBlur: (callback) => subscribe('window:blur', () => callback()),
    onHidden: (callback) => subscribe('window:hidden', () => callback())
  },

  app: {
    quit: () => ipcRenderer.send('window:quit'),
    setCloseToTray: (value) => ipcRenderer.send('window:close-to-tray', value)
  },

  tray: {
    setUnread: (count) => ipcRenderer.send('tray:unread', count)
  },

  nativeTheme: {
    shouldUseDarkColors: () => ipcRenderer.sendSync('theme:should-use-dark-colors') as boolean,
    setThemeSource: (theme) => ipcRenderer.send('theme:set-source', theme),
    onUpdated: (callback) => subscribe('theme:updated', () => callback())
  },

  notifications: {
    show: (payload) => ipcRenderer.send('notification:show', payload),
    clear: (peerId) => ipcRenderer.send('notification:clear', peerId),
    setTheme: (theme) => ipcRenderer.send('notification:theme', theme),
    onOpen: (callback) => subscribe('notification:open', callback)
  },

  mainSettings: {
    read: () => ipcRenderer.sendSync('main-settings:read') as string,
    write: (json) => ipcRenderer.send('main-settings:write', json)
  },

  secureStorage: {
    isAvailable: () => ipcRenderer.sendSync('secure-storage:is-available') as boolean,
    encrypt: (plain) => ipcRenderer.sendSync('secure-storage:encrypt', plain) as string,
    decrypt: (encrypted) => ipcRenderer.sendSync('secure-storage:decrypt', encrypted) as string
  },

  menu: {
    build: (labels) => ipcRenderer.send('menu:build', labels)
  }
}

contextBridge.exposeInMainWorld('vkDesktop', bridge)
