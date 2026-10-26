import { defineStore } from 'pinia'
import * as Post from 'model/Post'
import { DISCOVER_TOPICS } from 'misc/constants'

export type FeedMode = 'interesting' | 'recent' | 'discover'

export const FEED_MODES: FeedMode[] = ['interesting', 'recent', 'discover']

export type Feed = {
  posts: Post.Post[]
  /**
   * Ключи уже добавленных постов.
   *
   * Лента пагинируется курсором по времени, а не по offset, поэтому на границе страниц
   * один и тот же пост может прийти дважды. В поиске дубликаты встречаются ещё чаще
   */
  postKeys: Set<string>
  status: 'hasMore' | 'loading' | 'complete' | 'error'
  /** Курсор следующей страницы, пустая строка означает начало ленты */
  nextFrom: string
  /**
   * Увеличивается при каждом сбросе ленты.
   *
   * Позволяет отличить ответ на актуальный запрос от ответа на запрос, отправленный
   * до обновления: сравнивать курсоры недостаточно, так как обновление возвращает
   * ленту к тому же пустому курсору
   */
  generation: number
  /**
   * Очередь тем для поиска в «Открытиях».
   *
   * Без очереди каждая порция искала бы по случайной теме и могла повторить уже
   * показанные записи: курсора у нас нет, а поиск стабильно возвращает лучшее сверху
   */
  topicQueue: string[]
}

type Newsfeed = {
  mode: FeedMode
  feeds: Record<FeedMode, Feed>
}

export function defaultFeed(): Feed {
  return {
    posts: [],
    postKeys: new Set(),
    status: 'hasMore',
    nextFrom: '',
    generation: 0,
    topicQueue: shuffle(DISCOVER_TOPICS)
  }
}

function shuffle<T>(items: ReadonlyArray<T>): T[] {
  const result = [...items]

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = result[i]
    const b = result[j]

    if (a !== undefined && b !== undefined) {
      result[i] = b
      result[j] = a
    }
  }

  return result
}

export const useNewsfeedStore = defineStore('newsfeed', {
  state: (): Newsfeed => ({
    // Хронология статична до появления новых записей, поэтому по умолчанию
    // показываем ранжированную ленту
    mode: 'interesting',
    feeds: {
      interesting: defaultFeed(),
      recent: defaultFeed(),
      discover: defaultFeed()
    }
  }),

  getters: {
    feed(state): Feed {
      return state.feeds[state.mode]
    }
  },

  actions: {
    reset(mode: FeedMode) {
      /*
        Именно мутация, а не подмена объекта: загрузка захватывает ссылку на ленту
        до запроса и потом сверяет generation. Подменённый объект уносил старое
        значение с собой, сверка никогда не срабатывала, и ответ на устаревший
        запрос дописывался в уже выброшенную ленту
      */
      const feed = this.feeds[mode]
      Object.assign(feed, defaultFeed(), { generation: feed.generation + 1 })
    }
  }
})

// defineStore оборачивает стейт в UnwrapRef, заставляя IDE показывать полный бред.
// Добавляем стейт в исключение, считая, что его значение не является рефом
declare module '@vue/reactivity' {
  interface RefUnwrapBailTypes {
    Newsfeed: Newsfeed
  }
}
