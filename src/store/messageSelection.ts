import { defineStore } from 'pinia'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'

type MessageSelection = {
  /**
   * Беседа, в которой сейчас выделяют. Выделение живёт только в одной беседе:
   * переслать сообщения из разных чатов одним действием всё равно нельзя
   */
  peerId: Peer.Id | undefined
  cmids: Set<Message.Cmid>
}

export const useMessageSelectionStore = defineStore('messageSelection', {
  state: (): MessageSelection => ({
    peerId: undefined,
    cmids: new Set()
  }),

  getters: {
    isActive(state): boolean {
      return state.peerId !== undefined
    },
    count(state): number {
      return state.cmids.size
    }
  },

  actions: {
    isSelected(peerId: Peer.Id, cmid: Message.Cmid): boolean {
      return this.peerId === peerId && this.cmids.has(cmid)
    },

    toggle(peerId: Peer.Id, cmid: Message.Cmid) {
      // Переход к другой беседе сбрасывает прежний выбор
      if (this.peerId !== peerId) {
        this.peerId = peerId
        this.cmids = new Set()
      }

      if (this.cmids.has(cmid)) {
        this.cmids.delete(cmid)
      } else {
        this.cmids.add(cmid)
      }

      // Последнее снятое выделение выключает режим
      if (this.cmids.size === 0) {
        this.peerId = undefined
      }
    },

    reset() {
      this.peerId = undefined
      this.cmids = new Set()
    }
  }
})

// defineStore оборачивает стейт в UnwrapRef, заставляя IDE показывать полный бред.
// Добавляем стейт в исключение, считая, что его значение не является рефом
declare module '@vue/reactivity' {
  interface RefUnwrapBailTypes {
    MessageSelection: MessageSelection
  }
}
