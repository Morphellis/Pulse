import * as Post from 'model/Post'
import { ONE_HOUR } from 'misc/dateTime'

/**
 * Локальное ранжирование ленты.
 *
 * Умная лента ВК (feed_type: top) через публичный API недоступна: сервер отвечает
 * ошибкой 100, а newsfeed.getRecommended возвращает пустой список. Поэтому «интересное»
 * считаем сами по вовлечённости с затуханием по возрасту записи
 */

/** За столько часов вес записи падает вдвое */
const HALF_LIFE_HOURS = 18

/**
 * Насколько сильно перемешивать записи с близким весом.
 *
 * Без этого лента была бы такой же статичной, как хронологическая: те же посты
 * в том же порядке до появления новых
 */
const JITTER = 0.25

export function score(post: Post.Post, now: number): number {
  const engagement =
    post.likesCount +
    post.commentsCount * 2 +
    post.repostsCount * 3

  const ageHours = Math.max(0, (now - post.createdAt) / ONE_HOUR)
  const decay = 0.5 ** (ageHours / HALF_LIFE_HOURS)

  // Логарифм сжимает разрыв между постами с 5 и 500 лайками до сопоставимого
  return Math.log1p(engagement) * decay
}

export function rank(posts: Post.Post[], now = Date.now()): Post.Post[] {
  return posts
    .map((post) => ({
      post,
      weight: score(post, now) * (1 + (Math.random() * 2 - 1) * JITTER)
    }))
    .sort((a, b) => b.weight - a.weight)
    .map(({ post }) => post)
}

/**
 * Ранжирование для «Открытий».
 *
 * Здесь записи только что опубликованы и отклика ещё не набрали, поэтому вместо
 * вовлечённости опираемся на размер сообщества, сильно разбавляя случайностью,
 * чтобы подборка не сводилась к одним и тем же крупнейшим пабликам
 */
export function rankByAudience(
  entries: Array<{ post: Post.Post, membersCount: number }>
): Post.Post[] {
  return entries
    .map(({ post, membersCount }) => ({
      post,
      weight: Math.log1p(membersCount) * (0.4 + Math.random())
    }))
    .sort((a, b) => b.weight - a.weight)
    .map(({ post }) => post)
}
