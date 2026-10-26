import {
  MessagesMessageAttachment
} from 'services/contracts/api/objects/MessagesMessageAttachment'

/**
 * Элемент ленты новостей.
 *
 * Отличается от wall-вложения в сообщениях: тут нет inner_type, автор стены приходит
 * в source_id, а не в owner_id, и добавлены счетчики лайков/репостов/комментариев
 */
export type NewsfeedItem = {
  type: NewsfeedItemType
  /** Айди владельца стены: положительный для пользователя, отрицательный для группы */
  source_id: number
  date: number
  /** Приходит только для type: 'post' */
  post_id?: number
  /** Айди автора поста, может отличаться от владельца стены */
  from_id?: number
  text?: string
  attachments?: MessagesMessageAttachment[]
  copy_history?: NewsfeedRepost[]
  comments?: { count: number, can_post?: number }
  likes?: { count: number, user_likes?: number }
  reposts?: { count: number, user_reposted?: number }
  views?: { count: number }
  is_pinned?: number
  marked_as_ads?: number
  is_deleted?: number
}

/**
 * Репостнутый пост внутри copy_history.
 *
 * В отличие от самого элемента ленты, тут нет ни type, ни source_id
 */
export type NewsfeedRepost = {
  id?: number
  owner_id?: number
  from_id?: number
  date?: number
  text?: string
  attachments?: MessagesMessageAttachment[]
  copy_history?: NewsfeedRepost[]
}

export type NewsfeedItemType =
  | 'post'
  | 'photo'
  | 'photo_tag'
  | 'wall_photo'
  | 'friend'
  | 'note'
  | 'audio'
  | 'video'
  | 'topic'
  | 'digest'
  | 'stories'
  | 'clip'
  | 'app_widget'
  | 'textpost'
  | 'textlive'
  | 'tags_suggestions'
  | 'live_recommends'
  | 'recommended_groups'
