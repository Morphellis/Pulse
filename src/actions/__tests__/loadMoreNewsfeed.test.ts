import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useNewsfeedStore } from 'store/newsfeed'

vi.hoisted(() => {
  globalThis.localStorage = {
    length: 0,
    key: () => null,
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined
  }
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true })
})

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }))

vi.mock('services', () => ({
  useServices: () => ({ api: { fetch: mocks.fetch } })
}))

const { loadMoreNewsfeed, refreshNewsfeed } = await import('../loadMoreNewsfeed')

/** Ответ newsfeed.get с одной записью на стене сообщества */
function newsfeedResponse(postId: number, nextFrom: string) {
  return {
    items: [{
      type: 'post',
      source_id: -1,
      post_id: postId,
      date: Math.floor(Date.now() / 1000),
      text: 'запись',
      likes: { count: 0, user_likes: 0 },
      comments: { count: 0 },
      reposts: { count: 0 }
    }],
    profiles: [],
    groups: [],
    next_from: nextFrom
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  mocks.fetch.mockReset()
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('loadMoreNewsfeed: застрявшая лента', () => {
  test('одни и те же записи не уводят загрузку в бесконечную рекурсию', async () => {
    /*
      Курсор ленты умеет застревать на одном значении: ВК отдаёт ту же страницу
      и продолжает обещать продолжение. Раньше это была рекурсия без дна
    */
    mocks.fetch.mockImplementation(() => Promise.resolve(newsfeedResponse(1, 'stuck')))

    // Первая порция приносит запись, все следующие — её же
    await loadMoreNewsfeed('recent')
    mocks.fetch.mockClear()
    await loadMoreNewsfeed('recent')

    const feed = useNewsfeedStore().feeds.recent
    expect(feed.posts).toHaveLength(1)
    expect(feed.status).toBe('complete')
    // Ограниченное число попыток добрать, а не бесконечная рекурсия
    expect(mocks.fetch.mock.calls.length).toBeLessThanOrEqual(4)
  })

  test('новые записи продолжают добавляться как обычно', async () => {
    let postId = 0
    mocks.fetch.mockImplementation(() => {
      postId++
      return Promise.resolve(newsfeedResponse(postId, `cursor-${postId}`))
    })

    await loadMoreNewsfeed('recent')
    await loadMoreNewsfeed('recent')

    const feed = useNewsfeedStore().feeds.recent
    expect(feed.posts).toHaveLength(2)
    expect(feed.status).toBe('hasMore')
  })
})

describe('loadMoreNewsfeed: обновление во время загрузки', () => {
  test('ответ на устаревший запрос не дописывается в обновлённую ленту', async () => {
    const newsfeed = useNewsfeedStore()

    let releaseFirst!: () => void
    const firstResponse = new Promise<void>((resolve) => (releaseFirst = resolve))

    mocks.fetch.mockImplementationOnce(() => (
      firstResponse.then(() => newsfeedResponse(100, 'old-cursor'))
    ))

    const stale = loadMoreNewsfeed('recent')

    // Пользователь обновил ленту, пока первый запрос ещё висел
    mocks.fetch.mockImplementation(() => Promise.resolve(newsfeedResponse(200, '')))
    await refreshNewsfeed('recent')

    releaseFirst()
    await stale

    const feed = newsfeed.feeds.recent
    const postIds = feed.posts.map((post) => post.id)

    expect(postIds).toEqual([200])
    expect(postIds).not.toContain(100)
  })

  test('сброс поднимает поколение ленты, не подменяя её объект', () => {
    const newsfeed = useNewsfeedStore()
    const before = newsfeed.feeds.recent
    const generationBefore = before.generation

    newsfeed.reset('recent')

    // Ссылка, захваченная загрузкой до сброса, обязана увидеть смену поколения
    expect(newsfeed.feeds.recent).toBe(before)
    expect(before.generation).toBe(generationBefore + 1)
    expect(before.posts).toHaveLength(0)
  })
})
