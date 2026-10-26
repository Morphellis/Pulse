import { useServices } from 'services'
import * as Attach from 'model/Attach'
import * as Convo from 'model/Convo'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'
import { useConvosStore } from 'store/convos'
import { useStickersStore } from 'store/stickers'
import { useViewer } from 'hooks'
import { random } from 'misc/utils'
import { INTEGER_BOUNDARY } from 'misc/constants'

type SendOptions = {
  /** Сообщение, на которое отвечаем */
  replyTo?: Message.Foreign
}

export function sendMessage(
  peerId: Peer.Id,
  text: string,
  attaches: Attach.Attaches,
  options: SendOptions = {}
) {
  const { convos } = useConvosStore()
  const convo = Convo.safeGet(convos, peerId)
  const pendingMessage = toPendingMessage(peerId, text, attaches, options)

  convo.pendingMessages.push(pendingMessage)
  sendNextPendingMessage(convo)
}

/**
 * Отправляет стикер отдельным сообщением.
 *
 * Идет через ту же очередь отправки, что и обычные сообщения: так стикер сразу
 * появляется в переписке, а обрыв связи обрабатывается уже готовым кодом
 */
export function sendSticker(peerId: Peer.Id, stickerId: number, options: SendOptions = {}) {
  const { convos } = useConvosStore()
  const stickers = useStickersStore()
  const convo = Convo.safeGet(convos, peerId)

  const pendingMessage = toPendingMessage(peerId, '', {
    sticker: {
      kind: 'Sticker',
      id: stickerId,
      packId: stickers.packIdOf(stickerId)
    }
  }, options)

  convo.pendingMessages.push(pendingMessage)
  stickers.rememberRecent(stickerId)
  sendNextPendingMessage(convo)
}

/** Повторяет отправку сообщения, которое не ушло из-за обрыва связи */
export function retryPendingMessage(convo: Convo.Convo, pending: Message.Pending) {
  pending.isFailed = false
  sendNextPendingMessage(convo)
}

/** Убирает неотправленное сообщение из очереди */
export function discardPendingMessage(convo: Convo.Convo, pending: Message.Pending) {
  const index = convo.pendingMessages.indexOf(pending)

  if (index !== -1) {
    convo.pendingMessages.splice(index, 1)
  }
}

export async function sendNextPendingMessage(convo: Convo.Convo) {
  const { api } = useServices()
  const { sendMessageLock } = useConvosStore()

  if (sendMessageLock.has(convo.id)) {
    return
  }

  const pending = convo.pendingMessages.find(
    (pending) => !pending.isFailed && !pending.cmid
  )
  if (!pending) {
    return
  }

  sendMessageLock.add(convo.id)

  try {
    const { cmid } = await api.fetch('messages.send', {
      peer_id: pending.peerId,
      random_id: pending.randomId,
      message: pending.text,
      attachment: Attach.ids(pending.attaches),
      forward: toForwardParam(pending),
      sticker_id: pending.attaches.sticker?.id
    })
    pending.cmid = Message.resolveCmid(cmid)
  } catch (err) {
    console.warn('[sendMessage] failed', err)
    pending.isFailed = true
  }

  sendMessageLock.delete(convo.id)
  sendNextPendingMessage(convo)
}

/**
 * Собирает параметр forward для ответа.
 *
 * Внутри обязателен peer_id исходной беседы: без него сервер отвечает
 * «peer_id required», даже если сам JSON корректен
 */
function toForwardParam(pending: Message.Pending): string | undefined {
  const reply = pending.replyMessage

  if (!reply?.cmid) {
    return undefined
  }

  return JSON.stringify({
    peer_id: reply.rootPeerId,
    conversation_message_ids: [reply.cmid],
    is_reply: 1
  })
}

function toPendingMessage(
  peerId: Peer.Id,
  text: string,
  attaches: Attach.Attaches,
  options: SendOptions
): Message.Pending {
  const viewer = useViewer()
  const randomId = random(-INTEGER_BOUNDARY, INTEGER_BOUNDARY)

  return {
    kind: 'Pending',
    peerId,
    cmid: undefined,
    randomId,
    authorId: viewer.id,
    isOut: true,
    sentAt: Date.now(),
    updatedAt: undefined,
    text,
    attaches,
    replyMessage: options.replyTo,
    forwardedMessages: undefined,
    isFailed: false
  }
}
