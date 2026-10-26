import * as ILang from 'services/contracts/ILang'
import * as Attach from 'model/Attach'
import * as Convo from 'model/Convo'
import * as Peer from 'model/Peer'
import { isNonEmptyArray, NonEmptyArray, Opaque } from 'misc/utils'

export type Cmid = Opaque<number, Message>

export type Message = Confirmed | Pending
export type Confirmed = Normal | Service | Expired

export interface BaseMessage {
  peerId: Peer.Id
  cmid: Cmid
  authorId: Peer.OwnerId
  isOut: boolean
  sentAt: number
  updatedAt: number | undefined
  randomId: number
  /**
   * Момент, когда сообщение удалили.
   *
   * Заполняется только при включённом сохранении удалённых: обычно сообщение
   * просто пропадает из истории
   */
  deletedAt?: number
  /** Прежние версии текста, от самой старой к последней замененной */
  editHistory?: string[]
}

export interface Normal extends BaseMessage {
  kind: 'Normal'
  text: string
  attaches: Attach.Attaches
  replyMessage: Foreign | undefined
  forwardedMessages: NonEmptyArray<Foreign> | undefined
  /** Упомянут ли текущий пользователь в сообщении. Реплай тоже считается */
  hasMentioned: boolean
  /** Реакции по убыванию популярности. Пустой список не храним, чтобы не рисовать плашку */
  reactions?: NonEmptyArray<Reaction>
  /** Реакция, поставленная текущим пользователем */
  myReactionId?: number
  /**
   * Отмечено как важное — отметка видна только самому пользователю.
   *
   * Необязательное, потому что Normal наследуют и ещё не отправленные сообщения,
   * и пересланные, где такой отметки не бывает
   */
  isImportant?: boolean
}

/**
 * Счётчик одной реакции. Кто именно её поставил, здесь не храним:
 * ВК присылает список обрезанным, поэтому состав всё равно запрашивается
 * отдельно через messages.getReactedPeers, когда его собрались показать
 */
export type Reaction = {
  id: number
  count: number
}

export interface Service extends BaseMessage {
  kind: 'Service'
  action: ServiceAction
}

export interface Expired extends BaseMessage {
  kind: 'Expired'
}

/**
 * Пересчитывает счётчики после того, как пользователь сменил свою реакцию.
 *
 * Нужна, чтобы плашка обновилась сразу по клику, не дожидаясь ответа ВК:
 * задержка в полсекунды на такой мелочи ощущается поломкой
 */
export function withOwnReaction(
  reactions: NonEmptyArray<Reaction> | undefined,
  previousId: number | undefined,
  nextId: number | undefined
): NonEmptyArray<Reaction> | undefined {
  const updated = (reactions ?? []).map((reaction) => ({ ...reaction }))

  if (previousId !== undefined) {
    const previous = updated.find(({ id }) => id === previousId)

    if (previous) {
      previous.count--
    }
  }

  if (nextId !== undefined) {
    const next = updated.find(({ id }) => id === nextId)

    if (next) {
      next.count++
    } else {
      updated.push({ id: nextId, count: 1 })
    }
  }

  const result = updated
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count)

  return isNonEmptyArray(result) ? result : undefined
}

/** Ключ сообщения среди всех переписок: cmid уникален только внутри своей */
export function key(message: Confirmed): string {
  return `${message.peerId}_${message.cmid}`
}

/** Текст сообщения там, где он есть. Служебные и исчезнувшие текста не имеют */
export function textOf(message: Confirmed): string {
  return message.kind === 'Normal' ? message.text : ''
}

/**
 * Короткое описание вложений: «Фотография», «2 файла» и подобное.
 * Нужно везде, где сообщение показывается одной строкой — в списке бесед и в уведомлениях
 */
export function attachesPreview(
  message: Normal | Pending | Foreign | Pinned,
  lang: ILang.Lang
): string | undefined {
  const kindsCount = Attach.kindsCount(message.attaches)
  const count = Attach.count(message.attaches)

  if (
    kindsCount === 2 &&
    message.attaches.unknown?.length === 1 && message.attaches.unknown[0].type === 'story' &&
    message.attaches.sticker
  ) {
    return lang.use('me_message_attach_story_reaction')
  }

  if (kindsCount > 1) {
    return lang.usePlural('me_message_attaches', count)
  }

  const firstAttach = Object.values(message.attaches)[0]
  if (firstAttach) {
    return Attach.preview(firstAttach, lang)
  }

  if (message.replyMessage) {
    return lang.usePlural('me_messages', 1)
  }

  if (message.forwardedMessages) {
    return lang.usePlural('me_messages', message.forwardedMessages.length)
  }
}

export interface Foreign extends Omit<
  Normal,
  'kind' | 'peerId' | 'cmid' | 'randomId' | 'hasMentioned'
> {
  kind: 'Foreign'
  peerId: Peer.Id | undefined
  cmid: Cmid | undefined
  rootPeerId: Peer.Id
  rootCmid: Cmid
  isUnavailable: boolean
}

export interface Pinned extends Omit<Normal, 'kind' | 'updatedAt' | 'randomId' | 'hasMentioned'> {
  kind: 'Pinned'
  isUnavailable: boolean
}

export interface Pending extends Omit<Normal, 'kind' | 'cmid' | 'isOut' | 'hasMentioned'> {
  kind: 'Pending'
  /** Проставляется после ответа messages.send, если движок не успел отдать сообщение быстрее */
  cmid: Cmid | undefined
  isOut: true
  isFailed: boolean
}

export type ServiceAction =
  | {
      type: 'chat_create'
      title: string
    }
  | {
      type: 'chat_title_update'
      title: string
      oldTitle: string
    }
  | {
      type: 'chat_photo_update'
      photo: Attach.Photo | undefined
    }
  | {
      type:
        | 'chat_photo_remove'
        | 'chat_kick_don'
        | 'call_transcription_failed'
        | 'chat_invite_user_by_link'
        | 'chat_screenshot'
        | 'chat_group_call_started'
        | 'chat_invite_user_by_call_join_link'
    }
  | {
      type: 'chat_invite_user' | 'chat_kick_user' | 'accepted_message_request'
      peerId: Peer.OwnerId
    }
  | {
      type:
        | 'chat_invite_user_by_message_request'
        | 'chat_invite_user_by_call'
        | 'chat_kick_user_call_block'
      peerId: Peer.UserId
    }
  | {
      type: 'chat_pin_message' | 'chat_unpin_message'
      cmid: Cmid
      message: string
    }
  | {
      type: 'conversation_style_update' | 'conversation_style_update_action'
      style: Convo.Style | undefined
    }
  | {
      type: 'custom'
      message: string
    }
  | { type: 'unknown' }

export const flags = {
  out: 1 << 1,
  important: 1 << 3,
  spam: 1 << 6,
  deleted: 1 << 7,
  voiceListened: 1 << 12
}

export function resolveCmid(cmid: number): Cmid {
  if (cmid <= 0) {
    throw new Error('Message.Cmid = ' + cmid)
  }

  return cmid as Cmid
}

export function isUnread(message: Message, convo: Convo.Convo): boolean {
  if (message.kind === 'Pending') {
    return true
  }

  return message.isOut
    ? message.cmid > convo.outReadBy
    : message.cmid > convo.inReadBy
}

export function toForeign(message: Normal): Foreign {
  return {
    kind: 'Foreign',
    peerId: message.peerId,
    cmid: message.cmid,
    rootPeerId: message.peerId,
    rootCmid: message.cmid,
    authorId: message.authorId,
    isOut: message.isOut,
    sentAt: message.sentAt,
    text: message.text,
    attaches: message.attaches,
    replyMessage: message.replyMessage,
    forwardedMessages: message.forwardedMessages,
    updatedAt: message.updatedAt,
    isUnavailable: false
  }
}

export function toPinned(message: Normal): Pinned {
  return {
    kind: 'Pinned',
    peerId: message.peerId,
    cmid: message.cmid,
    authorId: message.authorId,
    isOut: message.isOut,
    sentAt: message.sentAt,
    text: message.text,
    attaches: message.attaches,
    replyMessage: message.replyMessage,
    forwardedMessages: message.forwardedMessages,
    isUnavailable: false
  }
}
