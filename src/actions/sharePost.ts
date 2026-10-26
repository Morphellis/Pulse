import { useServices } from 'services'
import * as Peer from 'model/Peer'
import * as Post from 'model/Post'
import { random } from 'misc/utils'
import { INTEGER_BOUNDARY } from 'misc/constants'

export type ShareResult = {
  sent: Peer.Id[]
  failed: Peer.Id[]
}

/**
 * Отправляет запись сообщением выбранным получателям.
 *
 * Каждому уходит отдельный запрос: messages.send не умеет рассылать нескольким
 * получателям сразу. Очередь запросов ограничивает семафор внутри Api,
 * поэтому лимит ВК не превысим
 */
export async function sharePost(
  post: Post.Post,
  peerIds: Peer.Id[],
  message: string
): Promise<ShareResult> {
  const { api } = useServices()

  const results = await Promise.allSettled(peerIds.map((peerId) => (
    api.fetch('messages.send', {
      peer_id: peerId,
      random_id: random(-INTEGER_BOUNDARY, INTEGER_BOUNDARY),
      message: message.trim(),
      attachment: Post.apiId(post)
    })
  )))

  const sent: Peer.Id[] = []
  const failed: Peer.Id[] = []

  results.forEach((result, index) => {
    const peerId = peerIds[index]

    if (peerId === undefined) {
      return
    }

    if (result.status === 'fulfilled') {
      sent.push(peerId)
    } else {
      console.warn('[sharePost] send error', peerId, result.reason)
      failed.push(peerId)
    }
  })

  return { sent, failed }
}
