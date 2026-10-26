import { useServices } from 'services'
import * as Attach from 'model/Attach'
import * as Convo from 'model/Convo'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'
import { useConvosStore } from 'store/convos'

/**
 * Правит своё сообщение.
 *
 * keep_forward_messages и keep_snippets обязательны: без них правка текста
 * сносит пересланные сообщения и превью ссылок
 */
export async function editMessage(
  peerId: Peer.Id,
  cmid: Message.Cmid,
  text: string
): Promise<boolean> {
  const { api } = useServices()
  const { convos } = useConvosStore()
  const convo = convos.get(peerId)
  const existing = convo && Convo.findMessage(convo, cmid)

  try {
    await api.fetch('messages.edit', {
      peer_id: peerId,
      conversation_message_id: cmid,
      message: text,
      // Вложения нужно перечислить заново, иначе они пропадут
      attachment: existing?.kind === 'Normal' ? Attach.ids(existing.attaches) : undefined,
      keep_forward_messages: 1,
      keep_snippets: 1
    })

    return true
  } catch (err) {
    console.warn('[editMessage] error', err)
    return false
  }
}
