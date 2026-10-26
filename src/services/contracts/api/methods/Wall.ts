import { GroupsGroup } from 'services/contracts/api/objects/GroupsGroup'
import { UsersUser } from 'services/contracts/api/objects/UsersUser'
import { WallComment, WallWallpost } from 'services/contracts/api/objects/WallWallpost'

// wall.get
export type WallGetParams = {
  owner_id: number
  offset?: number
  count?: number
  filter?: 'suggests' | 'postponed' | 'owner' | 'others' | 'all'
  extended?: 1
  fields?: string
}

export type WallGetResponse = {
  count: number
  items: WallWallpost[]
  profiles?: UsersUser[]
  groups?: GroupsGroup[]
}

// wall.getComments
export type WallGetCommentsParams = {
  owner_id: number
  post_id: number
  /** Если указан, возвращаются ответы на этот комментарий (ветка) */
  comment_id?: number
  offset?: number
  count?: number
  sort?: 'asc' | 'desc'
  need_likes?: 0 | 1
  thread_items_count?: number
  extended?: 1
  fields?: string
}

export type WallGetCommentsResponse = {
  count: number
  items: WallComment[]
  profiles?: UsersUser[]
  groups?: GroupsGroup[]
  can_post?: boolean
}

// wall.createComment
export type WallCreateCommentParams = {
  owner_id: number
  post_id: number
  message: string
  reply_to_comment?: number
}

export type WallCreateCommentResponse = {
  comment_id: number
}

// wall.repost
export type WallRepostParams = {
  /** Строка вида wall-123_456 */
  object: string
  message?: string
}

export type WallRepostResponse = {
  success: number
  post_id: number
  reposts_count: number
  likes_count: number
}
