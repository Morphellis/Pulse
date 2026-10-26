import { defineStore } from 'pinia'
import * as Post from 'model/Post'

export type CommentsThread = {
  comments: Post.Comment[]
  status: 'hasMore' | 'loading' | 'complete' | 'error'
  /**
   * Сколько комментариев уже запрошено у сервера.
   *
   * Считаем отдельно от длины comments: удаленные комментарии мы отбрасываем,
   * но в offset сервера они входят
   */
  offset: number
  /** Сколько всего комментариев у записи по данным сервера */
  totalCount: number
  canPost: boolean
  sendStatus: 'idle' | 'sending' | 'error'
}

type Comments = {
  /** Ключ - Post.key записи */
  threads: Map<string, CommentsThread>
}

export function defaultThread(): CommentsThread {
  return {
    comments: [],
    status: 'hasMore',
    offset: 0,
    totalCount: 0,
    canPost: false,
    sendStatus: 'idle'
  }
}

export const useCommentsStore = defineStore('comments', {
  state: (): Comments => ({
    threads: new Map()
  }),

  actions: {
    getThread(postKey: string): CommentsThread {
      const thread = this.threads.get(postKey)

      if (thread) {
        return thread
      }

      this.threads.set(postKey, defaultThread())

      /*
        Возвращаем именно то, что лежит в сторе, а не исходный объект: в Map попадает
        реактивный прокси, и компонент, получивший «сырой» объект, не увидел бы
        изменений, сделанных из экшена
      */
      return this.threads.get(postKey)!
    }
  }
})

// defineStore оборачивает стейт в UnwrapRef, заставляя IDE показывать полный бред.
// Добавляем стейт в исключение, считая, что его значение не является рефом
declare module '@vue/reactivity' {
  interface RefUnwrapBailTypes {
    Comments: Comments
  }
}
