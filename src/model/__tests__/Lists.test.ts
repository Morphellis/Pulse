import { describe, expect, test } from 'vitest'
import * as Convo from 'model/Convo'
import * as Lists from 'model/Lists'
import * as Peer from 'model/Peer'

// misc/utils дергает electron прямо на импорте модуля, самим тестам он не нужен
function makeConvo(id: number, majorSortId: number, minorSortId: number): Convo.Convo {
  return {
    kind: 'UserConvo',
    id: Peer.resolveId(id) as Peer.UserId,
    history: [],
    pendingMessages: [],
    historySliceAnchorCmid: 0,
    unreadCount: 0,
    majorSortId,
    minorSortId,
    inReadBy: 0,
    outReadBy: 0,
    notifications: { enabled: true, disabledUntil: 0 },
    folderIds: [],
    isArchived: false,
    isMarkedUnread: false
  }
}

/** Страница бесед из апи: приходит уже отсортированной и задаёт границы списка */
function loadPage(list: Lists.List, convos: Convo.Convo[]) {
  for (const convo of convos) {
    Lists.push(list, convo)
  }
}

describe('Lists: границы списка', () => {
  test('страница опускает границу до последней беседы', () => {
    const lists = Lists.defaults()
    loadPage(lists.main, [
      makeConvo(1, 0, 1000),
      makeConvo(2, 0, 900),
      makeConvo(3, 0, 800)
    ])

    expect(lists.main.boundary).toEqual({ majorId: 0, minorId: 800 })
    expect([...lists.main.peerIds]).toEqual([1, 2, 3])
  })

  test('беседа из-под границы в список не попадает и границу не сдвигает', () => {
    const lists = Lists.defaults()
    lists.main.status = 'hasMore'
    loadPage(lists.main, [makeConvo(1, 0, 1000), makeConvo(2, 0, 900), makeConvo(3, 0, 800)])

    /*
      Беседы нет в загруженной странице, она глубоко внизу списка. Событие лонгполла
      по ней (например прочтение с телефона) не должно ни протаскивать её в середину
      списка, ни ломать границу, по которой запрашивается следующая страница
    */
    Lists.refresh(lists, makeConvo(42, 0, 10))

    expect(lists.main.boundary).toEqual({ majorId: 0, minorId: 800 })
    expect([...lists.main.peerIds]).not.toContain(42)
  })
})

describe('Lists: закреплённые беседы', () => {
  test('закреплённая беседа принимается в список даже с маленьким minorSortId', () => {
    const lists = Lists.defaults()
    lists.main.status = 'hasMore'
    loadPage(lists.main, [makeConvo(1, 0, 1000), makeConvo(2, 0, 900)])

    // Закреп поднимает беседу через majorSortId, её minorSortId при этом любой
    Lists.refresh(lists, makeConvo(7, 2_000_000, 5))

    expect([...lists.main.peerIds]).toContain(7)
  })

  test('сортировка ставит закреплённые выше остальных', () => {
    const pinned = makeConvo(7, 2_000_000, 5)
    const fresh = makeConvo(1, 0, 1000)
    const old = makeConvo(2, 0, 900)

    expect([fresh, old, pinned].sort(Convo.sorter).map(({ id }) => id)).toEqual([7, 1, 2])
  })

  test('isPinned опирается на majorSortId', () => {
    expect(Convo.isPinned(makeConvo(1, 2_000_000, 5))).toBe(true)
    expect(Convo.isPinned(makeConvo(2, 0, 900))).toBe(false)
  })
})

describe('Lists: архив', () => {
  test('архивная беседа уходит из основного списка в архивный', () => {
    const lists = Lists.defaults()
    const convo = makeConvo(1, 0, 1000)

    Lists.push(lists.main, convo)
    Lists.push(lists.archive, convo)
    expect(lists.main.peerIds.has(convo.id)).toBe(true)

    convo.isArchived = true
    Lists.refresh(lists, convo)

    expect(lists.main.peerIds.has(convo.id)).toBe(false)
    expect(lists.archive.peerIds.has(convo.id)).toBe(true)
  })
})
