import { defineStore } from 'pinia'
import * as Convo from 'model/Convo'
import * as Message from 'model/Message'

type MessageContextMenu = {
  /** Открытое меню всегда одно: второе нажатие переносит его на новое сообщение */
  message: Message.Normal | null
  convo: Convo.Convo | undefined
  /** Координаты курсора, у которых раскрывается меню */
  x: number
  y: number
}

export const useMessageContextMenuStore = defineStore('messageContextMenu', {
  state: (): MessageContextMenu => ({
    message: null,
    convo: undefined,
    x: 0,
    y: 0
  }),

  actions: {
    open(message: Message.Normal, convo: Convo.Convo | undefined, x: number, y: number) {
      this.message = message
      this.convo = convo
      this.x = x
      this.y = y
    },

    close() {
      this.message = null
      this.convo = undefined
    }
  }
})
