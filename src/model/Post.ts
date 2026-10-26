import * as Attach from 'model/Attach'
import * as Peer from 'model/Peer'

/**
 * Post (пост) - запись на стене, пришедшая из ленты новостей.
 *
 * ownerId - владелец стены, на которой лежит пост
 * authorId - автор поста; отличается от владельца, когда в группе пишет пользователь
 *            или когда запись предложена
 *
 * id уникален только в пределах одной стены, поэтому для идентификации поста
 * используется пара ownerId + id (см. key)
 */
export type Post = {
  id: number
  ownerId: Peer.OwnerId
  authorId: Peer.OwnerId
  createdAt: number
  text: string
  attaches: Attach.Attaches
  repost?: Repost
  likesCount: number
  isLiked: boolean
  repostsCount: number
  isReposted: boolean
  commentsCount: number
  canComment: boolean
  viewsCount?: number
  isPinned: boolean
  isAd: boolean
}

/**
 * Репостнутая запись. В отличие от поста, не имеет собственных счетчиков,
 * но может содержать вложенный репост
 */
export type Repost = {
  ownerId: Peer.OwnerId
  createdAt: number
  text: string
  attaches: Attach.Attaches
  repost?: Repost
}

export function key(post: Post): string {
  return `${post.ownerId}_${post.id}`
}

export function url(post: Post): string {
  return `https://vk.com/wall${post.ownerId}_${post.id}`
}

/** Идентификатор записи в формате, который принимают методы API (например wall.repost) */
export function apiId(post: Post): string {
  return `wall${post.ownerId}_${post.id}`
}

/** Комментарий к записи */
export type Comment = {
  id: number
  authorId: Peer.OwnerId
  createdAt: number
  text: string
  attaches: Attach.Attaches
  likesCount: number
  isLiked: boolean
  replyToCommentId?: number
  /** Ответы в ветке этого комментария */
  thread: Comment[]
  /** Сколько всего ответов в ветке, включая не загруженные */
  threadCount: number
}
