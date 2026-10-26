import type { Rectangle } from 'electron'
import { defineStore } from 'pinia'
import { MainStorage } from 'store/Storage'
import { currentWindow } from 'misc/utils'
import { electronBridge } from 'misc/electronBridge'

export type AppearanceScheme = 'vkcom' | 'vkui'
export type AppearanceTheme = 'light' | 'dark' | 'system'

export type MainSettings = {
  bounds: Rectangle
  useCustomTitlebar: boolean
  appearance: {
    scheme: AppearanceScheme
    theme: AppearanceTheme
  }
  alwaysOnTop: boolean
  /** Прятать окно в трей по крестику вместо выхода из приложения */
  closeToTray: boolean
}

const mainSettingsStorage = new MainStorage<MainSettings>({
  // Дефолтные значения используются только один раз, причем не сразу
  get bounds() {
    return currentWindow.getBounds()
  },
  useCustomTitlebar: electronBridge.appInfo.useCustomTitlebarDefault,
  appearance: {
    scheme: 'vkcom',
    theme: 'system'
  },
  alwaysOnTop: false,
  closeToTray: true
})

export const useMainSettingsStore = defineStore('mainSettings', {
  state: () => mainSettingsStorage.data
})

export function init() {
  useMainSettingsStore().$subscribe((mutation, state) => {
    mainSettingsStorage.update(state)
  })
}
