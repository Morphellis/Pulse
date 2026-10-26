import { defineStore } from 'pinia'
import * as Peer from 'model/Peer'

type Friends = {
  /** Сами пиры лежат в peers, тут только порядок */
  ids: Peer.UserId[]
  status: 'initial' | 'loading' | 'loaded' | 'error'
}

export const useFriendsStore = defineStore('friends', {
  state: (): Friends => ({
    ids: [],
    status: 'initial'
  })
})

// defineStore оборачивает стейт в UnwrapRef, заставляя IDE показывать полный бред.
// Добавляем стейт в исключение, считая, что его значение не является рефом
declare module '@vue/reactivity' {
  interface RefUnwrapBailTypes {
    Friends: Friends
  }
}
