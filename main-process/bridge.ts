import type { Rectangle } from 'electron'
import type { NotificationPayload, NotificationTheme } from './shared'

/**
 * Контракт моста между main-процессом и рендерером.
 * Реализуется в preload.ts и доступен в рендерере как window.vkDesktop.
 * Рендерер работает в песочнице без доступа к Node.js, поэтому всё, что ему нужно
 * от Electron, перечислено здесь явно
 */

export type AppInfo = {
  platform: NodeJS.Platform
  version: string
  useCustomTitlebarDefault: boolean
}

export type WindowAction = 'minimize' | 'maximize' | 'unmaximize' | 'restore' | 'close'

export type ThemeSource = 'light' | 'dark' | 'system'

export type Unsubscribe = () => void

export type ElectronBridge = {
  appInfo: AppInfo
  window: {
    getBounds(): Rectangle
    isMaximized(): boolean
    isFullScreen(): boolean
    minimize(): void
    maximize(): void
    unmaximize(): void
    restore(): void
    close(): void
    setBackgroundColor(color: string): void
    onBoundsChange(callback: (bounds: Rectangle) => void): Unsubscribe
    onMaximizeChange(callback: (isMaximized: boolean) => void): Unsubscribe
    onFocus(callback: () => void): Unsubscribe
    onBlur(callback: () => void): Unsubscribe
    /** Окно спрятано в трей по крестику */
    onHidden(callback: () => void): Unsubscribe
  }
  app: {
    quit(): void
    /** Настройку хранит рендерер, а решение по крестику принимает main-процесс */
    setCloseToTray(value: boolean): void
  }
  tray: {
    setUnread(count: number): void
  }
  nativeTheme: {
    shouldUseDarkColors(): boolean
    setThemeSource(theme: ThemeSource): void
    onUpdated(callback: () => void): Unsubscribe
  }
  notifications: {
    show(payload: NotificationPayload): void
    /** Без peerId убирает все карточки */
    clear(peerId?: number): void
    setTheme(theme: NotificationTheme): void
    /** Клик по карточке в окне уведомлений */
    onOpen(callback: (peerId: number) => void): Unsubscribe
  }
  mainSettings: {
    /** Возвращает содержимое storage-v1.json (строка с JSON) */
    read(): string
    write(json: string): void
  }
  secureStorage: {
    isAvailable(): boolean
    /** Возвращает base64 зашифрованных данных */
    encrypt(plain: string): string
    decrypt(encrypted: string): string
  }
  menu: {
    build(labels: unknown): void
  }
}

/** Мост окна всплывающих уведомлений, доступен там как window.vkDesktopNotifications */
export type NotificationWindowBridge = {
  onAdd(callback: (payload: NotificationPayload) => void): Unsubscribe
  onClear(callback: (peerId: number | undefined) => void): Unsubscribe
  onTheme(callback: (theme: NotificationTheme) => void): Unsubscribe
  /** Высоту стопки меряет рендерер: только он знает, сколько места занял текст */
  resize(height: number): void
  activate(peerId: number): void
}

declare global {
  interface Window {
    vkDesktop: ElectronBridge
    vkDesktopNotifications: NotificationWindowBridge
  }
}
