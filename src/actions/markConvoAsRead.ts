import { useServices } from 'services'
import * as Convo from 'model/Convo'
import { useSettingsStore } from 'store/settings'

/** Беседы, по которым сейчас летит запрос: событие о прочтении приходит с задержкой */
const pendingPeers = new Set<number>()

/**
 * Отмечает беседу прочитанной.
 *
 * Апстрим этот метод не вызывал вообще, поэтому счётчики непрочитанных не сбрасывались
 * даже после того, как переписку открыли и пролистали
 */
export async function markConvoAsRead(convo: Convo.Convo) {
  const { api } = useServices()
  const settings = useSettingsStore()

  if (settings.stealthRead) {
    return
  }

  if (!Convo.isUnread(convo) || pendingPeers.has(convo.id)) {
    return
  }

  pendingPeers.add(convo.id)

  try {
    await api.fetch('messages.markAsRead', {
      peer_id: convo.id,
      mark_conversation_as_read: 1
    })

    /*
      Не ждём события лонгполла: оно придёт и приведёт состояние к тому же виду,
      но до тех пор счётчик продолжал бы висеть
    */
    convo.unreadCount = 0
    convo.isMarkedUnread = false

    if (convo.kind === 'ChatConvo') {
      convo.mentionedCmids.clear()
    }
  } catch (err) {
    console.warn('[markConvoAsRead] error', err)
  } finally {
    pendingPeers.delete(convo.id)
  }
}
