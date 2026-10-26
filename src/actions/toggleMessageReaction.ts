import { useServices } from 'services'
import * as Message from 'model/Message'
import { exclusiveByKey } from 'misc/utils'

/*
  Пока свой тоггл ещё не подтверждён сервером, отдельный refetch по событию 601
  (см. handleEngineUpdates) может догнать нас со снимком, снятым до нашей
  записи, и затереть ещё не подтверждённое состояние. Помечаем сообщение
  как «занятое», чтобы такой обгоняющий снимок временно пропускался —
  как только наш запрос завершится, следующее событие применится как обычно
*/
const pendingKeys = new Set<string>()

export function isReactionTogglePending(message: Message.Normal): boolean {
  return pendingKeys.has(Message.key(message))
}

/**
 * Ставит реакцию на сообщение, а если она уже стоит — снимает.
 *
 * Реакция от пользователя всего одна: ВК заменяет прежнюю сам,
 * снимать её отдельным запросом не нужно
 */
export const toggleMessageReaction = exclusiveByKey(
  async (message: Message.Normal, reactionId: number) => {
    const { api } = useServices()
    const key = Message.key(message)

    const previousReactions = message.reactions
    const previousId = message.myReactionId
    const nextId = previousId === reactionId ? undefined : reactionId

    // Меняем сразу, не дожидаясь ответа: иначе реакция ощущается тормозной
    message.reactions = Message.withOwnReaction(previousReactions, previousId, nextId)
    message.myReactionId = nextId

    pendingKeys.add(key)

    try {
      if (nextId === undefined) {
        await api.fetch('messages.deleteReaction', {
          peer_id: message.peerId,
          cmid: message.cmid
        })
      } else {
        await api.fetch('messages.sendReaction', {
          peer_id: message.peerId,
          cmid: message.cmid,
          reaction_id: nextId
        })
      }
    } catch (error) {
      console.warn('[toggleMessageReaction] error', error)

      message.reactions = previousReactions
      message.myReactionId = previousId
    } finally {
      pendingKeys.delete(key)
    }
  },
  (message) => Message.key(message)
)
