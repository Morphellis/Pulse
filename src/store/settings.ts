import { defineStore } from 'pinia'
import { RendererStorage } from 'store/Storage'
import { Locale } from 'lang/dictionaries'
import { DEFAULT_NOTIFICATION_SOUND, NotificationSoundId } from 'misc/notificationSounds'

export type Settings = {
  lang: Locale
  /** Ширина списка диалогов в пикселях. null - размер по умолчанию из CSS */
  convoListWidth: number | null
  convoListCollapsed: boolean
  /** Акцентный цвет в формате #rrggbb. null - цвет темы по умолчанию */
  accentColor: string | null
  /** Цвет своих сообщений. null - цвет темы по умолчанию */
  outgoingMessageColor: string | null
  /** Оставлять удалённые собеседником сообщения в переписке */
  keepDeletedMessages: boolean
  /** Сохранять прежние версии отредактированных сообщений */
  keepEditHistory: boolean
  /** Не отмечать сообщения прочитанными автоматически */
  stealthRead: boolean
  /** Всплывающие уведомления о новых сообщениях */
  notifications: boolean
  /** Звуковой сигнал при новом сообщении */
  notificationSound: boolean
  /** Какой из готовых сигналов проигрывать */
  notificationSoundId: NotificationSoundId
  /** Громкость сигнала, от 0 до 1 */
  notificationVolume: number
  /** Показывать текст сообщения в уведомлении, а не только отправителя */
  notificationShowText: boolean
}

const settingsStorage = new RendererStorage<Settings>('settings', {
  lang: 'ru',
  convoListWidth: null,
  convoListCollapsed: false,
  accentColor: null,
  outgoingMessageColor: null,
  keepDeletedMessages: true,
  keepEditHistory: true,
  stealthRead: false,
  notifications: true,
  notificationSound: true,
  notificationSoundId: DEFAULT_NOTIFICATION_SOUND,
  notificationVolume: 0.6,
  notificationShowText: true
})

export const useSettingsStore = defineStore('settings', {
  state: () => settingsStorage.data
})

export function init() {
  useSettingsStore().$subscribe((mutation, state) => {
    settingsStorage.update(state)
  })
}
