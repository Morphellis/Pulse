import { computed } from 'vue'
import * as Convo from 'model/Convo'
import { useConvosStore } from 'store/convos'

/**
 * Считаем непрочитанные беседы, а не сообщения: так число остаётся небольшим
 * и читается с одного взгляда. Архив и беседы с выключенными уведомлениями
 * в счётчик не попадают
 */
export function useUnreadCount() {
  const { convos } = useConvosStore()

  return computed(() => {
    let count = 0

    for (const convo of convos.values()) {
      if (convo.isArchived || !convo.notifications.enabled) {
        continue
      }
      if (Convo.isUnread(convo)) {
        count++
      }
    }

    return count
  })
}
