import { useServices } from 'services'
import { describeApiError } from 'services/contracts/IApi'
import * as Convo from 'model/Convo'
import * as Lists from 'model/Lists'
import { useConvosStore } from 'store/convos'
import { exclusiveByKey } from 'misc/utils'

/**
 * Архивирует беседу или возвращает её из архива.
 *
 * Название REST-метода не задокументировано официально (см. комментарий
 * у MessagesArchiveConversationParams) — если ВК ответит ошибкой неизвестного
 * метода, откат будет виден в консоли по логу [toggleConvoArchived] error
 */
export const toggleConvoArchived = exclusiveByKey(
  async (convo: Convo.Convo) => {
    const { api } = useServices()
    const { lists } = useConvosStore()
    const wasArchived = convo.isArchived

    convo.isArchived = !wasArchived
    Lists.refresh(lists, convo)

    try {
      if (wasArchived) {
        await api.fetch('messages.unarchiveConversation', { peer_id: convo.id })
      } else {
        await api.fetch('messages.archiveConversation', { peer_id: convo.id })
      }
    } catch (error) {
      console.warn('[toggleConvoArchived] error:', describeApiError(error))

      convo.isArchived = wasArchived
      Lists.refresh(lists, convo)
    }
  },
  (convo) => String(convo.id)
)
