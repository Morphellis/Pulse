import { useServices } from 'services'
import * as Post from 'model/Post'

/**
 * Делает репост записи на свою стену.
 *
 * В отличие от лайка не делаем оптимистичное обновление: репост публикует запись
 * от имени пользователя, и показывать его сделанным до подтверждения сервера неправильно
 */
export async function repostPost(post: Post.Post, message?: string) {
  const { api } = useServices()

  // Пишущие методы шлем мессенджерным токеном: у обычного не все они разрешены
  const { reposts_count: repostsCount } = await api.fetch('wall.repost', {
    object: Post.apiId(post),
    message: message || undefined
  }, { messengerToken: true })

  post.repostsCount = repostsCount
  post.isReposted = true
}
