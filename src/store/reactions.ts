import { defineStore } from 'pinia'

/**
 * Картинки реакций. ВК присылает их одним списком на всё приложение,
 * поэтому грузим один раз и держим в памяти
 */
type Reactions = {
  /** Ссылка на статичную картинку по идентификатору реакции */
  assets: Map<number, string>
  /** Порядок, в котором реакции пришли от ВК: сам ВК показывает их так же */
  order: number[]
  status: 'idle' | 'loading' | 'loaded' | 'error'
}

/**
 * Сколько реакций показываем сразу, не раскрывая полный список.
 * Ровно те, что стоят у ВК первыми: лайк, сердце, огонь и так далее
 */
export const QUICK_REACTIONS_COUNT = 6

export const useReactionsStore = defineStore('reactions', {
  state: (): Reactions => ({
    assets: new Map(),
    order: [],
    status: 'idle'
  }),

  getters: {
    quickIds(state): number[] {
      return state.order.slice(0, QUICK_REACTIONS_COUNT)
    }
  },

  actions: {
    assetUrl(reactionId: number): string | undefined {
      return this.assets.get(reactionId)
    }
  }
})
