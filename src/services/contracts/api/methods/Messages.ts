import { GroupsGroup } from 'services/contracts/api/objects/GroupsGroup'
import { MessagesConversation } from 'services/contracts/api/objects/MessagesConversation'
import { MessagesConversationWithMessage } from 'services/contracts/api/objects/MessagesConversationWithMessage'
import { MessagesCounters } from 'services/contracts/api/objects/MessagesCounters'
import { MessagesFolder } from 'services/contracts/api/objects/MessagesFolder'
import { MessagesGetDiffContentItem } from 'services/contracts/api/objects/MessagesGetDiffContentItem'
import { MessagesGetDiffConversationInfo } from 'services/contracts/api/objects/MessagesGetDiffConversationInfo'
import { MessagesLongpollCredentials } from 'services/contracts/api/objects/MessagesLongpollCredentials'
import { MessagesMessage } from 'services/contracts/api/objects/MessagesMessage'
import { MessagesReactionCounter } from 'services/contracts/api/objects/MessagesReactionCounter'
import { UsersUser } from 'services/contracts/api/objects/UsersUser'

// messages.getConversations
export type MessagesGetConversationsParams = {
  count?: number
  fields: string
  extended: 1
  offset?: number
  filter?: 'all' | 'archive' | 'business_notify' | 'chats' | 'important' | 'message_request' | 'sorted_chats' | 'unanswered' | 'unread'
  folder_id?: number
  start_from_minor_sort_id?: number
  group_id?: number
}

export type MessagesGetConversationsResponse = {
  count: number
  unread_count?: number
  items: MessagesConversationWithMessage[]
  profiles?: UsersUser[]
  groups?: GroupsGroup[]
  // contacts?: MessagesContact[]
}

// messages.getConversationsById
export type MessagesGetConversationsByIdParams = {
  peer_ids: string | number
  with_last_messages?: 0 | 1
  extended: 1
  fields: string
}

export type MessagesGetConversationsByIdResponse = {
  count: number
  items: MessagesConversation[]
  last_messages?: MessagesMessage[]
  profiles?: UsersUser[]
  groups?: GroupsGroup[]
}

// messages.getHistory
export type MessagesGetHistoryParams = {
  peer_id: number
  start_cmid?: number
  count?: number
  offset?: number
  filter?: 'all' | 'audio' | 'file' | 'link' | 'media_viewer' | 'photo' | 'pinned_messages' | 'video'
  extended: 1
  fwd_extended: 1
  fields: string
  group_id?: number
}

export type MessagesGetHistoryResponse = {
  count: number
  items: MessagesMessage[]
  profiles?: UsersUser[]
  groups?: GroupsGroup[]
  conversations?: MessagesConversation[]
  // contacts?: MessagesContact[]
  // apps?: AppsApp[]
}

// messages.getByConversationMessageId
export type MessagesGetByConversationMessageIdParams = {
  peer_id: number
  conversation_message_ids: number | string
  extended: 1
  fields: string
  group_id?: number
}

export type MessagesGetByConversationMessageIdResponse = {
  count: number
  items: MessagesMessage[]
  profiles?: UsersUser[]
  groups?: GroupsGroup[]
}

// messages.getLongPollServer
export type MessagesGetLongPollServerParams = {
  lp_version: number
  need_pts: 0 | 1
  group_id?: number
}

export type MessagesGetLongPollServerResponse = MessagesLongpollCredentials

// messages.getLongPollHistory
export type MessagesGetLongPollHistoryParams = {
  pts: number
  lp_version: number
  msgs_limit: number
  events_limit: number
  // - при указании last_n сдвигается вперед from_pts и теряются старые события
  // - а если не указывать, то применяются лимиты выше, и при выходе за них приходит more: 1
  last_n: number
  credentials?: 0 | 1
  extended: 1
  fields: string
}

export type MessagesGetLongPollHistoryResponse = {
  history: Array<Array<string | number>>
  from_pts: number
  new_pts: number
  conversations: MessagesConversation[]
  messages: {
    count: number
    items: MessagesMessage[]
  }
  more?: boolean
  credentials?: MessagesLongpollCredentials
  profiles?: UsersUser[]
  groups?: GroupsGroup[]
  // contacts?: MessagesContact[]
  // incognito_members?: MessagesExtendedIncognitoMember[]
}

// messages.send
export type MessagesSendParams = {
  peer_id: number
  random_id: number
  message: string
  attachment?: string
  /**
   * JSON вида {"peer_id":N,"conversation_message_ids":[N],"is_reply":1}.
   *
   * Используется и для ответа, и для пересылки: обычный reply_to принимает
   * сквозной id сообщения, которого у нас нет - мы работаем с cmid
   */
  forward?: string
  /** Стикер отправляется отдельным полем, в attachment его id не принимается */
  sticker_id?: number
}

export type MessagesSendResponse = {
  cmid: number
  message_id: number
}

// messages.getRecentStickers
export type MessagesGetRecentStickersParams = Record<string, never>

export type MessagesGetRecentStickersResponse = {
  count: number
  items: Array<{
    sticker_id: number
    is_allowed?: boolean
  }>
}

// messages.delete
export type MessagesDeleteParams = {
  peer_id: number
  /** Cmid через запятую */
  cmids: string
  /** 1 - удалить у всех участников, доступно ограниченное время после отправки */
  delete_for_all?: 0 | 1
}

/**
 * Возвращает результат по каждому сообщению отдельно и не бросает ошибку целиком:
 * часть сообщений может удалиться, а часть нет
 */
export type MessagesDeleteResponse = Array<{
  peer_id: number
  conversation_message_id: number
  response?: number
  error?: {
    code: number
    description: string
  }
}>

// messages.edit
export type MessagesEditParams = {
  peer_id: number
  conversation_message_id: number
  message?: string
  attachment?: string
  /** Без этих флагов правка сносит пересланные сообщения и сниппеты ссылок */
  keep_forward_messages?: 0 | 1
  keep_snippets?: 0 | 1
}

export type MessagesEditResponse = number

// messages.markAsRead
export type MessagesMarkAsReadParams = {
  peer_id: number
  /**
   * Отмечает прочитанными сообщения вплоть до этого. Без него читается вся беседа.
   *
   * Раньше поле называлось start_cmid — такого параметра у метода нет,
   * ВК молча его игнорировал. В официальной схеме параметр называется up_to_cmid
   */
  up_to_cmid?: number
  mark_conversation_as_read?: 0 | 1
}

export type MessagesMarkAsReadResponse = 1

// messages.markAsPlayed
export type MessagesMarkAsPlayedParams = {
  peer_id: number
  cmid: number
  group_id?: number
}

export type MessagesMarkAsPlayedResponse = 1

// messages.getDiffContent
export type MessagesGetDiffContentParams = {
  // JSON строка с типом MessagesGetDiffContentInput
  conversation_messages: string
  extended: 1
  fields: string
  group_id?: number
}

export type MessagesGetDiffContentResponse = {
  items: MessagesGetDiffContentItem[]
  profiles?: UsersUser[]
  groups?: GroupsGroup[]
  // contacts?: MessagesContact[]
}

// messages.getDiff
export type MessagesGetDiffParams = {
  lp_version: number
  // pts последнего известного события
  from_version?: number
  // Ограничение максимального значения pts
  to_version?: number
  fields: string
  // profiles, contacts, groups, counters, folders, folders_with_peers, conversations_banner,
  // messages, server_version, credentials
  extended_filters: string
  // 'all' or any field name it returns when calling with 'all'
  counter_filters?: string
  // Поддерживаемые типы папок: business, channels, unread, personal, managed_groups
  supported_types?: string
  // Значение conversations_source из ответа предыдущего вызова messages.getDiff,
  // чтобы получить следующую пачку данных если предыдущего ответа не хватило
  conversations_source?: string
  // Максимальное количество бесед, загружаемое в рамках одного запроса
  conversations_limit?: number
  group_id?: number
}

export type MessagesGetDiffResponse = {
  conversations_info?: MessagesGetDiffConversationInfo[]
  folders?: {
    count: number
    items: MessagesFolder[]
  }
  counters?: MessagesCounters
  credentials?: {
    server_lp: string
    key: string
    ts: number
  }
  // conversations_banner?: MessagesConversationBar
  profiles?: UsersUser[]
  groups?: GroupsGroup[]
  // contacts?: MessagesContact[]
  server_version?: number
  conversations_source?: string
  invalidate_all?: boolean
}

// messages.getReactionsAssets
export type MessagesGetReactionsAssetsParams = {
  group_id?: number
}

export type MessagesGetReactionsAssetsResponse = {
  version: number
  /**
   * Картинки реакций. static — обычный svg, а big_animation и small_animation
   * отдаются в формате Lottie, который мы не играем
   */
  assets: Array<{
    reaction_id: number
    links: {
      static: string
      small_animation?: string
      big_animation?: string
    }
  }>
  /**
   * Порядок показа, рекомендованный самим ВК. Он не совпадает с порядком assets
   * и короче него: часть картинок присылается про запас
   */
  reaction_ids: number[]
  channel_paid_reaction?: unknown
}

// messages.sendReaction
export type MessagesSendReactionParams = {
  peer_id: number
  cmid: number
  reaction_id: number
  group_id?: number
}

/** Реакция от пользователя всего одна: новая заменяет прежнюю */
export type MessagesSendReactionResponse = 1

// messages.deleteReaction
export type MessagesDeleteReactionParams = {
  peer_id: number
  cmid: number
  group_id?: number
}

export type MessagesDeleteReactionResponse = 1

// messages.getReactedPeers
export type MessagesGetReactedPeersParams = {
  peer_id: number
  cmid: number
  reaction_id?: number
  /** С extended приходят профили поставивших, иначе только их идентификаторы */
  extended?: 1
  fields?: string
  group_id?: number
}

export type MessagesGetReactedPeersResponse = {
  count: number
  reactions: Array<{
    user_id: number
    reaction_id: number
  }>
  counters: MessagesReactionCounter[]
  profiles?: UsersUser[]
  groups?: GroupsGroup[]
}

// messages.markAsImportant
export type MessagesMarkAsImportantParams = {
  peer_id: number
  cmids: string
  important: 0 | 1
  group_id?: number
}

export type MessagesMarkAsImportantResponse = {
  marked: Array<{
    cmid: number
    message_id: number
    peer_id: number
  }>
}

/**
 * messages.markAsUnread
 *
 * Название и форма ответа не задокументированы официально: метод не встречается
 * в открытых схемах ВК, только по аналогии с messages.markAsRead
 */
export type MessagesMarkAsUnreadParams = {
  peer_id: number
}

export type MessagesMarkAsUnreadResponse = 1

/**
 * messages.deleteConversation
 *
 * Полностью очищает историю беседы. В отличие от messages.delete не требует cmids
 */
export type MessagesDeleteConversationParams = {
  peer_id: number
  group_id?: number
}

export type MessagesDeleteConversationResponse = unknown

/**
 * messages.archiveConversation / messages.unarchiveConversation
 *
 * Названия не задокументированы официально: сама возможность архивации беседы
 * подтверждена битом peer_flags (Convo.flags.archived) и событиями лонгполла
 * 10/12, но какой REST-метод их выставляет — нигде не описано
 */
export type MessagesArchiveConversationParams = {
  peer_id: number
}

export type MessagesArchiveConversationResponse = 1

export type MessagesUnarchiveConversationParams = {
  peer_id: number
}

export type MessagesUnarchiveConversationResponse = 1

/**
 * messages.pinConversation / messages.unpinConversation
 *
 * Названия не задокументированы официально: закрепление беседы подтверждено
 * majorSortId (majorId) и событием лонгполла 20, но какой REST-метод его
 * выставляет — нигде не описано
 */
export type MessagesPinConversationParams = {
  peer_id: number
}

export type MessagesPinConversationResponse = 1

export type MessagesUnpinConversationParams = {
  peer_id: number
}

export type MessagesUnpinConversationResponse = 1
