import {
  MessagesMessageAttachment
} from 'services/contracts/api/objects/MessagesMessageAttachment'
import { NewsfeedRepost } from 'services/contracts/api/objects/NewsfeedItem'

/**
 * Запись на стене в том виде, в котором ее отдает wall.get.
 *
 * Отличается от элемента ленты: айди записи лежит в id, а владелец стены в owner_id
 */
export type WallWallpost = {
  id: number
  owner_id: number
  from_id?: number
  date: number
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
  post_type?: string
}

/** Комментарий к записи */
export type WallComment = {
  id: number
  from_id: number
  date: number
  text?: string
  attachments?: MessagesMessageAttachment[]
  likes?: { count: number, user_likes?: number }
  reply_to_user?: number
  reply_to_comment?: number
  deleted?: boolean
  thread?: {
    count: number
    items?: WallComment[]
  }
}
