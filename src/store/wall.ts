import { defineStore } from 'pinia'
import * as Peer from 'model/Peer'
import * as Post from 'model/Post'

export type Wall = {
  posts: Post.Post[]
  postKeys: Set<string>
  status: 'hasMore' | 'loading' | 'complete' | 'error'
  /**
   * Сколько записей уже запрошено у сервера.
   *
   * Считаем отдельно от длины posts: удаленные и повторяющиеся записи мы отбрасываем,
   * но в offset сервера они входят
   */
  offset: number
  /** Сколько всего записей на стене по данным сервера */
  totalCount: number
}

type Walls = {
  walls: Map<Peer.OwnerId, Wall>
}

export function defaultWall(): Wall {
  return {
    posts: [],
    postKeys: new Set(),
    status: 'hasMore',
    offset: 0,
    totalCount: 0
  }
}

export const useWallStore = defineStore('wall', {
  state: (): Walls => ({
    walls: new Map()
  }),

  actions: {
    getWall(ownerId: Peer.OwnerId): Wall {
      const wall = this.walls.get(ownerId)

      if (wall) {
        return wall
      }

      this.walls.set(ownerId, defaultWall())

      /*
        Возвращаем именно то, что лежит в сторе, а не исходный объект: в Map попадает
        реактивный прокси, и компонент, получивший «сырой» объект, не увидел бы
        изменений, сделанных из экшена
      */
      return this.walls.get(ownerId)!
    }
  }
})

// defineStore оборачивает стейт в UnwrapRef, заставляя IDE показывать полный бред.
// Добавляем стейт в исключение, считая, что его значение не является рефом
declare module '@vue/reactivity' {
  interface RefUnwrapBailTypes {
    Walls: Walls
  }
}
