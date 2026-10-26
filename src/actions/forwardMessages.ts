import { useServices } from 'services'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'
import { random } from 'misc/utils'
import { INTEGER_BOUNDARY } from 'misc/constants'

export type ForwardResult = {
  sent: Peer.Id[]
  failed: Peer.Id[]
}

/**
 * Пересылает сообщения в выбранные беседы.
 *
 * Тот же параметр forward, что и у ответа, только без is_reply: с ним сообщения
 * прикрепляются как цитата, без него - как пересланные
 */
export async function forwardMessages(
  fromPeerId: Peer.Id,
  cmids: Message.Cmid[],
  toPeerIds: Peer.Id[],
  message: string
): Promise<ForwardResult> {
  const { api } = useServices()

  const forward = JSON.stringify({
    peer_id: fromPeerId,
    conversation_message_ids: [...cmids].sort((a, b) => a - b)
  })

  const results = await Promise.allSettled(toPeerIds.map((peerId) => (
    api.fetch('messages.send', {
      peer_id: peerId,
      random_id: random(-INTEGER_BOUNDARY, INTEGER_BOUNDARY),
      message: message.trim(),
      forward
    })
  )))

  const sent: Peer.Id[] = []
  const failed: Peer.Id[] = []

  results.forEach((result, index) => {
    const peerId = toPeerIds[index]

    if (peerId === undefined) {
      return
    }

    if (result.status === 'fulfilled') {
      sent.push(peerId)
    } else {
      console.warn('[forwardMessages] send error', peerId, result.reason)
      failed.push(peerId)
    }
  })

  return { sent, failed }
}
