import { defineStore } from 'pinia'
import * as Peer from 'model/Peer'
import { RendererStorage } from 'store/Storage'
import { MESSAGE_JOURNAL_LIMIT } from 'misc/constants'

export type JournalEntry = {
  kind: 'deleted' | 'edited'
  peerId: Peer.Id
  cmid: number
  authorId: Peer.OwnerId
  /** Текст на момент события: для удаления - последний, для правки - прежний */
  text: string
  /** Новый текст после правки */
  newText?: string
  at: number
}

type MessageJournal = {
  entries: JournalEntry[]
}

/**
 * Журнал удалённых и отредактированных сообщений.
 *
 * В самой переписке правки видно только пока приложение запущено: история
 * подгружается с сервера заново, а там удалённых сообщений уже нет. Журнал
 * переживает перезапуск и хранится на диске
 */
const journalStorage = new RendererStorage<MessageJournal>('messageJournal', {
  entries: []
})

export const useMessageJournalStore = defineStore('messageJournal', {
  state: () => journalStorage.data,

  actions: {
    add(entry: JournalEntry) {
      this.entries.unshift(entry)

      // Ограничиваем журнал: без этого он рос бы бесконечно вместе с localStorage
      if (this.entries.length > MESSAGE_JOURNAL_LIMIT) {
        this.entries.splice(MESSAGE_JOURNAL_LIMIT)
      }
    },

    clear() {
      this.entries = []
    }
  }
})

export function init() {
  useMessageJournalStore().$subscribe((mutation, state) => {
    journalStorage.update(state)
  })
}

// defineStore оборачивает стейт в UnwrapRef, заставляя IDE показывать полный бред.
// Добавляем стейт в исключение, считая, что его значение не является рефом
declare module '@vue/reactivity' {
  interface RefUnwrapBailTypes {
    MessageJournal: MessageJournal
  }
}
