import { useServices } from 'services'
import * as Convo from 'model/Convo'
import * as History from 'model/History'
import * as Lists from 'model/Lists'
import { useConvosStore } from 'store/convos'

/** Полностью очищает историю беседы, включая ещё не отправленные сообщения */
export async function clearConvoHistory(convo: Convo.Convo) {
  const { api } = useServices()
  const { lists } = useConvosStore()

  await api.fetch('messages.deleteConversation', { peer_id: convo.id })

  /*
    Не ждём события лонгполла: оно придёт и приведёт состояние к тому же виду,
    но до тех пор история продолжала бы висеть на экране
  */
  History.clearHistory(convo.history, Number.MAX_SAFE_INTEGER)
  convo.pendingMessages = []

  /*
    Непрочитанных сообщений после очистки не остаётся, но событие лонгполла
    счётчики не сбрасывает — без этого беседа висела бы с бейджем и в списке
    непрочитанного поверх пустой истории
  */
  convo.unreadCount = 0
  convo.isMarkedUnread = false

  if (convo.kind === 'ChatConvo') {
    convo.mentionedCmids.clear()
  }

  Lists.refresh(lists, convo)
}
