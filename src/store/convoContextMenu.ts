import { defineStore } from 'pinia'
import * as Convo from 'model/Convo'

type ConvoContextMenu = {
  /** Открытое меню всегда одно: второе нажатие переносит его на новую беседу */
  convo: Convo.Convo | null
  /** Координаты курсора, у которых раскрывается меню */
  x: number
  y: number
}

export const useConvoContextMenuStore = defineStore('convoContextMenu', {
  state: (): ConvoContextMenu => ({
    convo: null,
    x: 0,
    y: 0
  }),

  actions: {
    open(convo: Convo.Convo, x: number, y: number) {
      this.convo = convo
      this.x = x
      this.y = y
    },

    close() {
      this.convo = null
    }
  }
})
