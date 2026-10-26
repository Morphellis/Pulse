import { watch } from 'vue'
import { useRouter } from 'vue-router'
import * as Peer from 'model/Peer'
import { useNotificationsStore } from 'store/notifications'
import { useUnreadCount } from 'hooks'
import { subscribeToElectronEvent } from 'misc/utils'
import { electronBridge } from 'misc/electronBridge'
import { useAppearanceColors } from './useAppearanceColors'
import { useThemeScheme } from './useThemeScheme'

/**
 * Связывает основное окно с окном всплывающих уведомлений и значком в трее:
 * отдает туда тему и счетчик, принимает обратно клик по уведомлению
 */
export function useNotificationsBridge() {
  const router = useRouter()
  const presence = useNotificationsStore()
  const scheme = useThemeScheme()
  const appearanceColors = useAppearanceColors()
  const unreadCount = useUnreadCount()

  // Окно уведомлений живет отдельно и о настройках оформления само не знает
  watch([scheme, appearanceColors], ([scheme, colors]) => {
    electronBridge.notifications.setTheme({ scheme, colors })
  }, { immediate: true })

  watch(unreadCount, (count) => {
    electronBridge.tray.setUnread(count)
  }, { immediate: true })

  subscribeToElectronEvent(() => {
    const unsubscribeFocus = electronBridge.window.onFocus(() => {
      presence.isWindowFocused = true

      // Вернувшись в приложение, пользователь увидит непрочитанное сам
      electronBridge.notifications.clear()
    })
    const unsubscribeBlur = electronBridge.window.onBlur(() => {
      presence.isWindowFocused = false
    })

    return () => {
      unsubscribeFocus()
      unsubscribeBlur()
    }
  })

  subscribeToElectronEvent(() => (
    electronBridge.notifications.onOpen((peerId) => {
      void router.push({ name: 'Convo', params: { peerId: Peer.resolveId(peerId) } })
    })
  ))
}
