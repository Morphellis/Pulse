import { describe, expect, test, vi } from 'vitest'
import { NewsfeedItem } from 'services/contracts/api/objects/NewsfeedItem'
import * as Post from 'model/Post'
import { fromApiNewsfeedItem } from 'converters/PostConverter'

// Сторы создают RendererStorage прямо на импорте модуля, а тесты гоняются в ноде.
// hoisted нужен, чтобы заглушка появилась до импортов
vi.hoisted(() => {
  globalThis.localStorage = {
    length: 0,
    key: () => null,
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined
  }
})

const buildItem = (overrides: Partial<NewsfeedItem> = {}): NewsfeedItem => ({
  type: 'post',
  source_id: -1234,
  date: 1700000000,
  post_id: 42,
  text: 'Текст записи',
  ...overrides
})

describe(fromApiNewsfeedItem.name, () => {
  test('конвертит обычный пост группы', () => {
    const post = fromApiNewsfeedItem(buildItem({
      likes: { count: 7, user_likes: 1 },
      comments: { count: 3 },
      reposts: { count: 2 },
      views: { count: 100 }
    }))

    expect(post).toMatchObject({
      id: 42,
      ownerId: -1234,
      authorId: -1234,
      createdAt: 1700000000000,
      text: 'Текст записи',
      likesCount: 7,
      isLiked: true,
      commentsCount: 3,
      repostsCount: 2,
      viewsCount: 100,
      isPinned: false,
      isAd: false
    })
  })

  test('различает автора поста и владельца стены', () => {
    const post = fromApiNewsfeedItem(buildItem({ source_id: -1234, from_id: 567 }))

    expect(post?.ownerId).toBe(-1234)
    expect(post?.authorId).toBe(567)
  })

  test('проставляет счетчики в ноль, когда их не прислали', () => {
    const post = fromApiNewsfeedItem(buildItem())

    expect(post).toMatchObject({
      likesCount: 0,
      isLiked: false,
      commentsCount: 0,
      repostsCount: 0,
      viewsCount: undefined
    })
  })

  test('пропускает все, что не является записью на стене', () => {
    expect(fromApiNewsfeedItem(buildItem({ type: 'photo' }))).toBeUndefined()
    expect(fromApiNewsfeedItem(buildItem({ type: 'stories' }))).toBeUndefined()
  })

  test('пропускает удаленный пост и пост без post_id', () => {
    expect(fromApiNewsfeedItem(buildItem({ is_deleted: 1 }))).toBeUndefined()
    expect(fromApiNewsfeedItem(buildItem({ post_id: undefined }))).toBeUndefined()
  })

  test('разворачивает цепочку репостов', () => {
    const post = fromApiNewsfeedItem(buildItem({
      text: '',
      copy_history: [{
        owner_id: -999,
        from_id: -999,
        date: 1699999000,
        text: 'Репост',
        copy_history: [{
          owner_id: 111,
          from_id: 111,
          date: 1699998000,
          text: 'Вложенный репост'
        }]
      }]
    }))

    expect(post?.repost).toMatchObject({
      ownerId: -999,
      createdAt: 1699999000000,
      text: 'Репост'
    })
    expect(post?.repost?.repost).toMatchObject({
      ownerId: 111,
      text: 'Вложенный репост'
    })
    expect(post?.repost?.repost?.repost).toBeUndefined()
  })

  test('игнорирует репост без автора', () => {
    const post = fromApiNewsfeedItem(buildItem({
      copy_history: [{ text: 'Репост без owner_id и from_id' }]
    }))

    expect(post?.repost).toBeUndefined()
  })

  test('различает посты с одинаковым id на разных стенах', () => {
    const first = fromApiNewsfeedItem(buildItem({ source_id: -1234, post_id: 42 }))
    const second = fromApiNewsfeedItem(buildItem({ source_id: -5678, post_id: 42 }))

    expect(first && Post.key(first)).toBe('-1234_42')
    expect(second && Post.key(second)).toBe('-5678_42')
  })

  test('отмечает закрепленный пост и рекламу', () => {
    const post = fromApiNewsfeedItem(buildItem({ is_pinned: 1, marked_as_ads: 1 }))

    expect(post).toMatchObject({ isPinned: true, isAd: true })
  })
})
