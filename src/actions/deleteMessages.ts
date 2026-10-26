import { useServices } from 'services'
import * as Convo from 'model/Convo'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'
import { useConvosStore } from 'store/convos'

export type DeleteResult = {
  deleted: Message.Cmid[]
  failed: Array<{ cmid: Message.Cmid, reason: string }>
}

/**
 * Сообщения, которые пользователь удалил сам.
 *
 * Событие об удалении приходит одинаковое и на чужое, и на своё удаление. Без этой
 * отметки включённое «оставлять удалённые» удержало бы в переписке и то, что
 * пользователь только что удалил намеренно
 */
const deletedByUs = new Set<string>()

/**
 * Отметка нужна только до прихода события об удалении, но событие может и не дойти —
 * например если связь оборвалась сразу после запроса. Поэтому просто не даём
 * множеству расти без предела: оно жило всю сессию и никогда не чистилось
 */
const DELETED_BY_US_LIMIT = 500

const key = (peerId: Peer.Id, cmid: Message.Cmid) => `${peerId}_${cmid}`

function rememberDeletedByUs(peerId: Peer.Id, cmid: Message.Cmid) {
  deletedByUs.add(key(peerId, cmid))

  // Set обходится в порядке вставки, поэтому первым идёт самое старое
  while (deletedByUs.size > DELETED_BY_US_LIMIT) {
    const oldest = deletedByUs.values().next().value
    if (oldest === undefined) {
      break
    }
    deletedByUs.delete(oldest)
  }
}

export function wasDeletedByUs(peerId: Peer.Id, cmid: Message.Cmid): boolean {
  return deletedByUs.has(key(peerId, cmid))
}

export async function deleteMessages(
  peerId: Peer.Id,
  cmids: Message.Cmid[],
  forEveryone: boolean
): Promise<DeleteResult> {
  const { api } = useServices()
  const { convos } = useConvosStore()

  for (const cmid of cmids) {
    rememberDeletedByUs(peerId, cmid)
  }

  const deleted: Message.Cmid[] = []
  const failed: DeleteResult['failed'] = []

  try {
    const response = await api.fetch('messages.delete', {
      peer_id: peerId,
      cmids: cmids.join(','),
      delete_for_all: forEveryone ? 1 : 0
    })

    for (const item of response) {
      const cmid = Message.resolveCmid(item.conversation_message_id)

      if (item.error) {
        failed.push({ cmid, reason: item.error.description })
        deletedByUs.delete(key(peerId, cmid))
      } else {
        deleted.push(cmid)
      }
    }
  } catch (err) {
    console.warn('[deleteMessages] error', err)

    for (const cmid of cmids) {
      failed.push({ cmid, reason: String(err) })
      deletedByUs.delete(key(peerId, cmid))
    }

    return { deleted, failed }
  }

  /*
    Убираем из истории сразу, не дожидаясь события: иначе удалённое сообщение
    висит на экране ещё пару секунд
  */
  const convo = convos.get(peerId)

  if (convo) {
    for (const cmid of deleted) {
      Convo.removeMessage(convo, cmid)
    }
  }

  return { deleted, failed }
}
