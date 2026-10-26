import { defineStore } from 'pinia'
import * as ConvoDraft from 'model/ConvoDraft'
import * as Peer from 'model/Peer'
import { RendererStorage } from 'store/Storage'

type ConvoDrafts = {
  drafts: Map<Peer.Id, ConvoDraft.ConvoDraft>
}

const convoDraftsStorage = new RendererStorage<ConvoDrafts>('convoDrafts', {
  drafts: new Map()
})

export const useConvoDraftsStore = defineStore('convoDrafts', {
  state: () => convoDraftsStorage.data
})

/**
 * Пауза между записями черновиков на диск.
 *
 * Каждый символ в поле ввода меняет драфт, а сохранение обходит все черновики,
 * сериализует их и синхронно пишет в localStorage. Делать это на каждое нажатие
 * клавиши — заметная работа в главном потоке ровно во время набора текста
 */
const DRAFTS_SAVE_DELAY = 500

export function init() {
  const store = useConvoDraftsStore()
  let saveTimeoutId = 0

  const save = () => {
    window.clearTimeout(saveTimeoutId)
    saveTimeoutId = 0

    const draftsToSave = new Map<Peer.Id, ConvoDraft.ConvoDraft>()

    for (const [peerId, convoDraft] of store.drafts) {
      if (ConvoDraft.isSendable(convoDraft)) {
        draftsToSave.set(peerId, {
          ...convoDraft,
          // Мы не можем сохранять вложения в процессе загрузки в localStorage
          uploadingAttaches: []
        })
      }
    }

    convoDraftsStorage.update({ drafts: draftsToSave })
  }

  /*
    Копим изменения от первого до записи, а не от последнего: при непрерывном
    наборе текста откладывание «до тишины» не сохранило бы вообще ничего
  */
  store.$subscribe(() => {
    if (!saveTimeoutId) {
      saveTimeoutId = window.setTimeout(save, DRAFTS_SAVE_DELAY)
    }
  })

  // Закрытие окна не должно уносить с собой последние набранные символы
  window.addEventListener('beforeunload', () => {
    if (saveTimeoutId) {
      save()
    }
  })
}

// defineStore оборачивает стейт в UnwrapRef, заставляя IDE показывать полный бред.
// Добавляем стейт в исключение, считая, что его значение не является рефом
declare module '@vue/reactivity' {
  interface RefUnwrapBailTypes {
    ConvoDrafts: ConvoDrafts
  }
}
