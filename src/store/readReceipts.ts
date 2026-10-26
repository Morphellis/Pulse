import { defineStore } from 'pinia'
import * as Peer from 'model/Peer'
import { RendererStorage } from 'store/Storage'
import { READ_RECEIPTS_PER_PEER } from 'misc/constants'

/** Момент, когда граница прочтения в беседе продвинулась до указанного сообщения */
export type ReadMark = {
  upToCmid: number
  at: number
}

type ReadReceipts = {
  marks: Map<Peer.Id, ReadMark[]>
}

/**
 * Когда именно собеседник прочитал сообщение, ВК не отдаёт ни одним методом:
 * в объекте беседы есть только граница out_read_cmid без времени. Зато лонгполл
 * присылает событие в момент прочтения - его время мы и запоминаем
 */
const receiptsStorage = new RendererStorage<ReadReceipts>('readReceipts', {
  marks: new Map()
})

export const useReadReceiptsStore = defineStore('readReceipts', {
  state: () => receiptsStorage.data,

  actions: {
    record(peerId: Peer.Id, upToCmid: number, at: number) {
      const peerMarks = this.marks.get(peerId) ?? []
      const last = peerMarks.at(-1)

      // Граница только растёт, повторы и откаты записывать незачем
      if (last && last.upToCmid >= upToCmid) {
        return
      }

      peerMarks.push({ upToCmid, at })

      if (peerMarks.length > READ_RECEIPTS_PER_PEER) {
        peerMarks.splice(0, peerMarks.length - READ_RECEIPTS_PER_PEER)
      }

      this.marks.set(peerId, peerMarks)
    },

    /** Момент, когда сообщение попало в прочитанные, если он был замечен */
    findReadAt(peerId: Peer.Id, cmid: number): number | undefined {
      return this.marks.get(peerId)?.find((mark) => mark.upToCmid >= cmid)?.at
    }
  }
})

export function init() {
  useReadReceiptsStore().$subscribe((mutation, state) => {
    receiptsStorage.update(state)
  })
}

// defineStore оборачивает стейт в UnwrapRef, заставляя IDE показывать полный бред.
// Добавляем стейт в исключение, считая, что его значение не является рефом
declare module '@vue/reactivity' {
  interface RefUnwrapBailTypes {
    ReadReceipts: ReadReceipts
  }
}
