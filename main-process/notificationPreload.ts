import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type { NotificationWindowBridge } from './bridge'

function subscribe<T>(channel: string, callback: (payload: T) => void) {
  const listener = (event: IpcRendererEvent, payload: T) => callback(payload)
  ipcRenderer.on(channel, listener)

  return () => {
    ipcRenderer.off(channel, listener)
  }
}

const bridge: NotificationWindowBridge = {
  onAdd: (callback) => subscribe('notification:add', callback),
  onClear: (callback) => subscribe('notification:clear', callback),
  onTheme: (callback) => subscribe('notification:theme', callback),
  resize: (height) => ipcRenderer.send('notification:resize', height),
  activate: (peerId) => ipcRenderer.send('notification:activate', peerId)
}

contextBridge.exposeInMainWorld('vkDesktopNotifications', bridge)
