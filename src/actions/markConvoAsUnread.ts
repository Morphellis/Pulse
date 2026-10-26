import { useServices } from 'services'
import { describeApiError } from 'services/contracts/IApi'
import * as Convo from 'model/Convo'
import * as Lists from 'model/Lists'
import { useConvosStore } from 'store/convos'
import { exclusiveByKey } from 'misc/utils'

/**
 * Отмечает прочитанную беседу непрочитанной (без сброса счётчиков).
 *
 * Название REST-метода не задокументировано официально: встречается только
 * по аналогии с messages.markAsRead, см. комментарий у MessagesMarkAsUnreadParams
 */
export const markConvoAsUnread = exclusiveByKey(
  async (convo: Convo.Convo) => {
    const { api } = useServices()
    const { lists } = useConvosStore()

    if (Convo.isUnread(convo)) {
      return
    }

    convo.isMarkedUnread = true
    Lists.refresh(lists, convo)

    try {
      await api.fetch('messages.markAsUnread', { peer_id: convo.id })
    } catch (error) {
      console.warn('[markConvoAsUnread] error:', describeApiError(error))

      convo.isMarkedUnread = false
      Lists.refresh(lists, convo)
    }
  },
  (convo) => String(convo.id)
)
