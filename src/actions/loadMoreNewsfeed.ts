import { useServices } from 'services'
import * as FeedRanking from 'model/FeedRanking'
import * as Peer from 'model/Peer'
import * as Post from 'model/Post'
import { Feed, FeedMode, useNewsfeedStore } from 'store/newsfeed'
import { usePeersStore } from 'store/peers'
import { insertPeers } from 'actions'
import { fromApiNewsfeedItem, fromApiWallPost } from 'converters/PostConverter'
import {
  DISCOVER_MIN_BATCH_SIZE,
  DISCOVER_MIN_MEMBERS,
  DISCOVER_MIN_TEXT_LENGTH,
  DISCOVER_NAME_BLOCKLIST,
  DISCOVER_SEARCH_COUNT,
  DISCOVER_TOPICS_PER_BATCH,
  INTERESTING_DISCOVER_SHARE,
  INTERESTING_PAGES_PER_BATCH,
  NEWSFEED_PER_PAGE,
  PEER_FIELDS
} from 'misc/constants'

/**
 * Сколько раз подряд пробуем добрать порцию, если пришли одни дубликаты.
 *
 * Без предела это бесконечная рекурсия: курсор ленты умеет застревать на одном
 * значении, а «Открытия» и вовсе пагинируются не курсором, а очередью тем
 */
const MAX_DUPLICATE_BATCH_RETRIES = 3

export async function loadMoreNewsfeed(mode?: FeedMode, duplicateBatchRetry = 0) {
  const newsfeed = useNewsfeedStore()
  const targetMode = mode ?? newsfeed.mode
  const feed = newsfeed.feeds[targetMode]

  if (feed.status === 'loading' || feed.status === 'complete') {
    return
  }

  const requestedGeneration = feed.generation

  try {
    feed.status = 'loading'

    const batch = await loadBatch(targetMode, feed)

    // Пока грузилась страница, ленту могли обновить. Тогда ответ уже неактуален
    if (feed.generation !== requestedGeneration) {
      return
    }

    let added = 0

    for (const post of batch.posts) {
      const key = Post.key(post)

      if (feed.postKeys.has(key)) {
        continue
      }

      feed.postKeys.add(key)
      feed.posts.push(post)
      added++
    }

    feed.nextFrom = batch.nextFrom

    /*
      Если порция целиком состояла из уже показанного, но продолжение есть,
      считаем ленту незаконченной: следующая порция принесёт другое
    */
    feed.status = batch.hasMore ? 'hasMore' : 'complete'

    if (batch.hasMore && added === 0) {
      if (duplicateBatchRetry >= MAX_DUPLICATE_BATCH_RETRIES) {
        // Лента отдаёт одно и то же — считаем её законченной, а не долбим апи дальше
        feed.status = 'complete'
        return
      }

      await loadMoreNewsfeed(targetMode, duplicateBatchRetry + 1)
    }
  } catch (err) {
    console.warn('[loadMoreNewsfeed] loading error', err)

    if (feed.generation === requestedGeneration) {
      feed.status = 'error'
    }
  }
}

type Batch = {
  posts: Post.Post[]
  nextFrom: string
  hasMore: boolean
}

function loadBatch(mode: FeedMode, feed: Feed): Promise<Batch> {
  switch (mode) {
    case 'discover':
      return loadDiscoverBatch(feed)
    case 'interesting':
      return loadInterestingBatch(feed)
    case 'recent':
      return loadRecentBatch(feed)
  }
}

async function loadSubscriptions(startFrom: string, pages: number) {
  const { api } = useServices()
  const posts: Post.Post[] = []
  let cursor = startFrom

  for (let page = 0; page < pages; page++) {
    const response = await api.fetch('newsfeed.get', {
      filters: 'post',
      count: NEWSFEED_PER_PAGE,
      start_from: cursor || undefined,
      fields: PEER_FIELDS
    })

    insertPeers({
      profiles: response.profiles,
      groups: response.groups
    })

    for (const item of response.items) {
      const post = fromApiNewsfeedItem(item)
      if (post) {
        posts.push(post)
      }
    }

    cursor = response.next_from ?? ''

    if (!cursor) {
      break
    }
  }

  return { posts, cursor }
}

async function loadRecentBatch(feed: Feed): Promise<Batch> {
  const { posts, cursor } = await loadSubscriptions(feed.nextFrom, 1)

  return { posts, nextFrom: cursor, hasMore: !!cursor }
}

/**
 * «Интересное» - подписки, переупорядоченные по вовлечённости, плюс несколько
 * записей из чужих сообществ.
 *
 * Умную ленту ВК через этот API получить нельзя: feed_type=top отклоняется
 * с ошибкой 100, а newsfeed.getRecommended возвращает пустой список
 */
async function loadInterestingBatch(feed: Feed): Promise<Batch> {
  const { posts, cursor } = await loadSubscriptions(feed.nextFrom, INTERESTING_PAGES_PER_BATCH)

  const discovered = await loadDiscoverPosts(feed, INTERESTING_DISCOVER_SHARE)
  const ranked = FeedRanking.rank(posts)

  return {
    posts: mix(ranked, discovered),
    nextFrom: cursor,
    // Подписки могут закончиться, а открытия продолжаются, пока есть темы
    hasMore: !!cursor || feed.topicQueue.length > 0
  }
}

async function loadDiscoverBatch(feed: Feed): Promise<Batch> {
  const posts: Post.Post[] = []

  /*
    Одна тема после фильтрации может дать всего пару записей, поэтому добираем
    следующие темы, пока порция не наберётся или темы не кончатся
  */
  for (let attempt = 0; attempt < DISCOVER_TOPICS_PER_BATCH; attempt++) {
    if (feed.topicQueue.length === 0) {
      break
    }

    posts.push(...await loadDiscoverPosts(feed, DISCOVER_SEARCH_COUNT))

    if (posts.length >= DISCOVER_MIN_BATCH_SIZE) {
      break
    }
  }

  return {
    posts,
    nextFrom: '',
    hasMore: feed.topicQueue.length > 0
  }
}

/**
 * Ищет записи по очередной теме и отсеивает шум: поиск ВК одинаково охотно отдаёт
 * и крупные сообщества, и объявления районных пабликов
 */
async function loadDiscoverPosts(feed: Feed, limit: number): Promise<Post.Post[]> {
  const { api } = useServices()
  const { peers } = usePeersStore()
  const topic = feed.topicQueue.shift()

  if (!topic) {
    return []
  }

  const response = await api.fetch('newsfeed.search', {
    q: topic,
    count: DISCOVER_SEARCH_COUNT,
    extended: 1,
    fields: PEER_FIELDS
  })

  insertPeers({
    profiles: response.profiles,
    groups: response.groups
  })

  const suitable: Array<{ post: Post.Post, membersCount: number }> = []

  for (const apiPost of response.items) {
    const post = fromApiWallPost(apiPost)

    if (!post || post.isAd) {
      continue
    }

    // Записи людей в поиске это в основном личные объявления, берём только сообщества
    if (!Peer.isGroupPeerId(post.ownerId)) {
      continue
    }

    const owner = peers.get(post.ownerId)

    if (owner?.kind !== 'Group' || owner.membersCount < DISCOVER_MIN_MEMBERS) {
      continue
    }

    const name = owner.name.toLowerCase()
    if (DISCOVER_NAME_BLOCKLIST.some((marker) => name.includes(marker))) {
      continue
    }

    const hasMedia = !!post.attaches.photos || !!post.attaches.videos
    if (!hasMedia && post.text.length < DISCOVER_MIN_TEXT_LENGTH) {
      continue
    }

    suitable.push({ post, membersCount: owner.membersCount })
  }

  return FeedRanking.rankByAudience(suitable).slice(0, limit)
}

/** Равномерно вплетает подмешиваемые записи в основной список */
function mix(main: Post.Post[], extra: Post.Post[]): Post.Post[] {
  if (extra.length === 0) {
    return main
  }

  const result: Post.Post[] = []
  const step = Math.max(1, Math.ceil(main.length / (extra.length + 1)))
  let extraIndex = 0

  main.forEach((post, index) => {
    result.push(post)

    if ((index + 1) % step === 0 && extraIndex < extra.length) {
      const injected = extra[extraIndex++]
      if (injected) {
        result.push(injected)
      }
    }
  })

  return [...result, ...extra.slice(extraIndex)]
}

export function refreshNewsfeed(mode?: FeedMode) {
  const newsfeed = useNewsfeedStore()
  const targetMode = mode ?? newsfeed.mode

  newsfeed.reset(targetMode)

  return loadMoreNewsfeed(targetMode)
}
