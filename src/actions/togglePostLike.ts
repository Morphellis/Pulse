import { useServices } from 'services'
import * as Post from 'model/Post'
import { exclusiveByKey } from 'misc/utils'

export const togglePostLike = exclusiveByKey(
  async (post: Post.Post) => {
    const { api } = useServices()

    const wasLiked = post.isLiked
    const previousCount = post.likesCount

    // Переключаем сразу, не дожидаясь ответа: иначе лайк ощущается тормозным
    post.isLiked = !wasLiked
    post.likesCount = previousCount + (wasLiked ? -1 : 1)

    try {
      // likes.* доступны только мессенджерному токену: на обычном ВК отвечает
      // ошибкой 3 «Unknown method passed»
      const { likes } = await api.fetch(wasLiked ? 'likes.delete' : 'likes.add', {
        type: 'post',
        owner_id: post.ownerId,
        item_id: post.id
      }, { messengerToken: true })

      post.likesCount = likes
    } catch (err) {
      console.warn('[togglePostLike] error', err)

      post.isLiked = wasLiked
      post.likesCount = previousCount
    }
  },
  (post) => Post.key(post)
)
