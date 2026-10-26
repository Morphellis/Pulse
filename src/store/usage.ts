import { defineStore } from 'pinia'
import { RendererStorage } from 'store/Storage'

type Usage = {
  /**
   * Случайный идентификатор установки.
   *
   * Именно случайный, а не id пользователя ВК: для подсчёта достаточно различать
   * копии приложения, а собирать чужие id незачем
   */
  installId: string
  /** Сколько всего установок отметилось, по данным сервера */
  users: number
  /** Сколько всего было запусков */
  logins: number
  status: 'idle' | 'loading' | 'error'
}

const usageStorage = new RendererStorage<Usage>('usage', {
  installId: '',
  users: 0,
  logins: 0,
  status: 'idle'
})

export const useUsageStore = defineStore('usage', {
  state: () => usageStorage.data,

  actions: {
    ensureInstallId(): string {
      if (!this.installId) {
        this.installId = crypto.randomUUID()
      }

      return this.installId
    }
  }
})

export function init() {
  useUsageStore().$subscribe((mutation, state) => {
    usageStorage.update(state)
  })
}

// defineStore оборачивает стейт в UnwrapRef, заставляя IDE показывать полный бред.
// Добавляем стейт в исключение, считая, что его значение не является рефом
declare module '@vue/reactivity' {
  interface RefUnwrapBailTypes {
    Usage: Usage
  }
}
