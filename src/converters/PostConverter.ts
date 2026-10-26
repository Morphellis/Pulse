import { NewsfeedItem, NewsfeedRepost } from 'services/contracts/api/objects/NewsfeedItem'
import { WallComment, WallWallpost } from 'services/contracts/api/objects/WallWallpost'
import * as Peer from 'model/Peer'
import * as Post from 'model/Post'
import { fromApiAttaches } from 'converters/AttachConverter'

/**
 * Возвращает undefined для всего, что не является обычной записью на стене:
 * лента отдает еще фотографии, видео, истории и рекомендации групп
 */
export function fromApiNewsfeedItem(item: NewsfeedItem): Post.Post | undefined {
  if (item.type !== 'post' || !item.post_id || item.is_deleted) {
    return
  }

  return {
    id: item.post_id,
    ownerId: Peer.resolveOwnerId(item.source_id),
    authorId: Peer.resolveOwnerId(item.from_id ?? item.source_id),
    createdAt: item.date * 1000,
    text: item.text ?? '',
    // Голосовые в ленте не отмечаем непрослушанными: в ней нет понятия прочитанности
    attaches: fromApiAttaches(item.attachments ?? [], true),
    repost: item.copy_history?.[0]
      ? fromApiRepost(item.copy_history[0])
      : undefined,
    likesCount: item.likes?.count ?? 0,
    isLiked: !!item.likes?.user_likes,
    repostsCount: item.reposts?.count ?? 0,
    isReposted: !!item.reposts?.user_reposted,
    commentsCount: item.comments?.count ?? 0,
    canComment: !!item.comments?.can_post,
    viewsCount: item.views?.count,
    isPinned: !!item.is_pinned,
    isAd: !!item.marked_as_ads
  }
}

export function fromApiWallPost(apiPost: WallWallpost): Post.Post | undefined {
  if (apiPost.is_deleted) {
    return
  }

  return {
    id: apiPost.id,
    ownerId: Peer.resolveOwnerId(apiPost.owner_id),
    authorId: Peer.resolveOwnerId(apiPost.from_id ?? apiPost.owner_id),
    createdAt: apiPost.date * 1000,
    text: apiPost.text ?? '',
    attaches: fromApiAttaches(apiPost.attachments ?? [], true),
    repost: apiPost.copy_history?.[0]
      ? fromApiRepost(apiPost.copy_history[0])
      : undefined,
    likesCount: apiPost.likes?.count ?? 0,
    isLiked: !!apiPost.likes?.user_likes,
    repostsCount: apiPost.reposts?.count ?? 0,
    isReposted: !!apiPost.reposts?.user_reposted,
    commentsCount: apiPost.comments?.count ?? 0,
    canComment: !!apiPost.comments?.can_post,
    viewsCount: apiPost.views?.count,
    isPinned: !!apiPost.is_pinned,
    isAd: !!apiPost.marked_as_ads
  }
}

export function fromApiComment(apiComment: WallComment): Post.Comment | undefined {
  if (apiComment.deleted || !apiComment.from_id) {
    return
  }

  return {
    id: apiComment.id,
    authorId: Peer.resolveOwnerId(apiComment.from_id),
    createdAt: apiComment.date * 1000,
    text: apiComment.text ?? '',
    attaches: fromApiAttaches(apiComment.attachments ?? [], true),
    likesCount: apiComment.likes?.count ?? 0,
    isLiked: !!apiComment.likes?.user_likes,
    replyToCommentId: apiComment.reply_to_comment,
    thread: (apiComment.thread?.items ?? [])
      .map(fromApiComment)
      .filter((comment) => !!comment),
    threadCount: apiComment.thread?.count ?? 0
  }
}

function fromApiRepost(apiRepost: NewsfeedRepost): Post.Repost | undefined {
  const rawOwnerId = apiRepost.from_id ?? apiRepost.owner_id

  if (!rawOwnerId) {
    return
  }

  return {
    ownerId: Peer.resolveOwnerId(rawOwnerId),
    createdAt: (apiRepost.date ?? 0) * 1000,
    text: apiRepost.text ?? '',
    attaches: fromApiAttaches(apiRepost.attachments ?? [], true),
    repost: apiRepost.copy_history?.[0]
      ? fromApiRepost(apiRepost.copy_history[0])
      : undefined
  }
}
