import { defineStore } from 'pinia'

export type StickerPack = {
  id: number
  title: string
  /** Иконка для боковой ленты панели */
  icon: string
  stickerIds: number[]
}

/** Слова, по которым ВК предлагает стикеры: основа поиска в панели */
type KeywordEntry = {
  words: string[]
  stickerIds: number[]
}

type Stickers = {
  packs: StickerPack[]
  favorites: number[]
  recent: number[]
  keywords: KeywordEntry[]
  status: 'idle' | 'loading' | 'loaded' | 'error'
}

/** Больше в ленте недавних не держит и сам ВК */
const RECENT_LIMIT = 40

export const useStickersStore = defineStore('stickers', {
  state: (): Stickers => ({
    packs: [],
    favorites: [],
    recent: [],
    keywords: [],
    status: 'idle'
  }),

  actions: {
    /**
     * Ищет стикеры по слову или эмодзи.
     *
     * Берем только user_stickers: promoted_stickers — это наборы, которых у нас нет,
     * отправить их все равно не выйдет
     */
    search(query: string): number[] {
      const normalized = query.trim().toLowerCase()

      if (!normalized) {
        return []
      }

      const found: number[] = []
      const seen = new Set<number>()

      for (const entry of this.keywords) {
        if (!entry.words.some((word) => word.includes(normalized))) {
          continue
        }

        for (const stickerId of entry.stickerIds) {
          if (!seen.has(stickerId)) {
            seen.add(stickerId)
            found.push(stickerId)
          }
        }
      }

      return found
    },

    /** К какому набору относится стикер: в избранном и недавних набор не указан */
    packIdOf(stickerId: number): number {
      const pack = this.packs.find(({ stickerIds }) => stickerIds.includes(stickerId))

      return pack?.id ?? 0
    },

    /** Поднимает отправленный стикер наверх ленты недавних, не дожидаясь сервера */
    rememberRecent(stickerId: number) {
      this.recent = [stickerId, ...this.recent.filter((id) => id !== stickerId)]
        .slice(0, RECENT_LIMIT)
    }
  }
})
