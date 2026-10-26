import { useServices } from 'services'
import { describeApiError } from 'services/contracts/IApi'
import * as Convo from 'model/Convo'
import * as Lists from 'model/Lists'
import { useConvosStore } from 'store/convos'
import { exclusiveByKey } from 'misc/utils'

/**
 * Закрепляет беседу вверху списка или открепляет её.
 *
 * Название REST-метода не задокументировано официально (см. комментарий
 * у MessagesPinConversationParams). Реальный majorSortId после закрепления
 * назначает сервер и присылает его событием лонгполла 20 — здесь лишь
 * временно поднимаем беседу заметно выше остальных, чтобы не ждать ответа
 */
const OPTIMISTIC_PINNED_MAJOR_SORT_ID = Number.MAX_SAFE_INTEGER

export const toggleConvoPinned = exclusiveByKey(
  async (convo: Convo.Convo) => {
    const { api } = useServices()
    const { lists } = useConvosStore()
    const wasPinned = Convo.isPinned(convo)
    const prevMajorSortId = convo.majorSortId

    convo.majorSortId = wasPinned ? 0 : OPTIMISTIC_PINNED_MAJOR_SORT_ID
    Lists.refresh(lists, convo)

    try {
      if (wasPinned) {
        await api.fetch('messages.unpinConversation', { peer_id: convo.id })
      } else {
        await api.fetch('messages.pinConversation', { peer_id: convo.id })
      }
    } catch (error) {
      console.warn('[toggleConvoPinned] error:', describeApiError(error))

      convo.majorSortId = prevMajorSortId
      Lists.refresh(lists, convo)
    }
  },
  (convo) => String(convo.id)
)
