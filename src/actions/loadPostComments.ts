import { useServices } from 'services'
import * as Post from 'model/Post'
import { useCommentsStore } from 'store/comments'
import { insertPeers } from 'actions'
import { fromApiComment } from 'converters/PostConverter'
import { COMMENTS_PER_PAGE, COMMENTS_THREAD_PREVIEW, PEER_FIELDS } from 'misc/constants'

export async function loadPostComments(post: Post.Post) {
  const { api } = useServices()
  const commentsStore = useCommentsStore()
  const thread = commentsStore.getThread(Post.key(post))

  if (thread.status === 'loading' || thread.status === 'complete') {
    return
  }

  try {
    thread.status = 'loading'

    const response = await api.fetch('wall.getComments', {
      owner_id: post.ownerId,
      post_id: post.id,
      offset: thread.offset,
      count: COMMENTS_PER_PAGE,
      sort: 'asc',
      need_likes: 1,
      thread_items_count: COMMENTS_THREAD_PREVIEW,
      extended: 1,
      fields: PEER_FIELDS
    })

    insertPeers({
      profiles: response.profiles,
      groups: response.groups
    })

    const loadedComments = response.items
      .map(fromApiComment)
      .filter((comment) => !!comment)

    thread.comments.push(...loadedComments)
    thread.offset += response.items.length
    thread.totalCount = response.count
    thread.canPost = response.can_post ?? false

    // Ориентируемся на длину ответа, а не на count: удаленные комментарии
    // попадают в count, но отфильтровываются нами
    thread.status = response.items.length < COMMENTS_PER_PAGE ? 'complete' : 'hasMore'
  } catch (err) {
    console.warn('[loadPostComments] loading error', err)
    thread.status = 'error'
  }
}
