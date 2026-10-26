import { useServices } from 'services'
import * as Peer from 'model/Peer'
import * as Post from 'model/Post'
import { useCommentsStore } from 'store/comments'
import { useViewerStore } from 'store/viewer'

/**
 * Отправляет комментарий и дописывает его в конец загруженной ветки.
 *
 * Ответ метода содержит только id, поэтому сам комментарий собираем локально
 * из того, что отправили
 */
export async function createPostComment(post: Post.Post, message: string) {
  const { api } = useServices()
  const commentsStore = useCommentsStore()
  const { viewer } = useViewerStore()
  const thread = commentsStore.getThread(Post.key(post))

  if (thread.sendStatus === 'sending' || !message.trim() || !viewer) {
    return false
  }

  try {
    thread.sendStatus = 'sending'

    // Пишущие методы шлем мессенджерным токеном: у обычного не все они разрешены
    const { comment_id: commentId } = await api.fetch('wall.createComment', {
      owner_id: post.ownerId,
      post_id: post.id,
      message: message.trim()
    }, { messengerToken: true })

    thread.comments.push({
      id: commentId,
      authorId: Peer.resolveOwnerId(viewer.id),
      createdAt: Date.now(),
      text: message.trim(),
      attaches: {},
      likesCount: 0,
      isLiked: false,
      thread: [],
      threadCount: 0
    })

    thread.totalCount++
    post.commentsCount++
    thread.sendStatus = 'idle'
    return true
  } catch (err) {
    console.warn('[createPostComment] error', err)
    thread.sendStatus = 'error'
    return false
  }
}
