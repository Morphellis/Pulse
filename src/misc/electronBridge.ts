import type { ElectronBridge } from 'main-process/bridge'

/**
 * Заглушка для юнит-тестов: там нет preload-скрипта и окна Electron.
 * Хранит настройки в памяти и ничего не шифрует
 */
function createFallbackBridge(): ElectronBridge {
  let settingsJson = '{}'
  const noop = () => undefined
  const unsubscribe = () => noop

  return {
    appInfo: { platform: 'win32', version: '0.0.0', useCustomTitlebarDefault: false },
    window: {
      getBounds: () => ({ x: 0, y: 0, width: 0, height: 0 }),
      isMaximized: () => false,
      isFullScreen: () => false,
      minimize: noop,
      maximize: noop,
      unmaximize: noop,
      restore: noop,
      close: noop,
      setBackgroundColor: noop,
      onBoundsChange: unsubscribe,
      onMaximizeChange: unsubscribe,
      onFocus: unsubscribe,
      onBlur: unsubscribe,
      onHidden: unsubscribe
    },
    app: { quit: noop, setCloseToTray: noop },
    tray: { setUnread: noop },
    nativeTheme: {
      shouldUseDarkColors: () => false,
      setThemeSource: noop,
      onUpdated: unsubscribe
    },
    notifications: { show: noop, clear: noop, setTheme: noop, onOpen: unsubscribe },
    mainSettings: {
      read: () => settingsJson,
      write: (json) => {
        settingsJson = json
      }
    },
    secureStorage: {
      isAvailable: () => false,
      encrypt: (plain) => plain,
      decrypt: (encrypted) => encrypted
    },
    menu: { build: noop }
  }
}

/**
 * Единственная точка доступа рендерера к Electron.
 * Объект выставляется preload-скриптом через contextBridge (см. main-process/preload.ts)
 */
export const electronBridge: ElectronBridge = typeof window !== 'undefined' && window.vkDesktop
  ? window.vkDesktop
  : createFallbackBridge()
