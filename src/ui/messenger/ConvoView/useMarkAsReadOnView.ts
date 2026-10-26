import { ComputedRef, onUnmounted, watch } from 'vue'
import * as Convo from 'model/Convo'
import { markConvoAsRead } from 'actions'

/**
 * Отмечает открытую беседу прочитанной.
 *
 * Читаем только когда окно в фокусе: свёрнутое окно с открытой перепиской
 * не должно тихо отмечать всё прочитанным
 */
export function useMarkAsReadOnView(convo: ComputedRef<Convo.Convo>) {
  const readIfVisible = () => {
    if (document.hasFocus() && Convo.isUnread(convo.value)) {
      markConvoAsRead(convo.value)
    }
  }

  watch(
    () => [convo.value.id, convo.value.unreadCount, convo.value.isMarkedUnread] as const,
    readIfVisible,
    { immediate: true }
  )

  window.addEventListener('focus', readIfVisible)

  onUnmounted(() => {
    window.removeEventListener('focus', readIfVisible)
  })
}
