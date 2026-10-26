import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'

vi.hoisted(() => {
  globalThis.localStorage = {
    length: 0,
    key: () => null,
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined
  }
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true })
})

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }))

vi.mock('services', () => ({
  useServices: () => ({ api: { fetch: mocks.fetch } })
}))

const { deleteMessages, wasDeletedByUs } = await import('../deleteMessages')

const PEER_ID = Peer.resolveId(1)

function cmids(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, index) => Message.resolveCmid(from + index))
}

beforeEach(() => {
  setActivePinia(createPinia())
  mocks.fetch.mockReset()
})

describe('deleteMessages: отметки о своём удалении', () => {
  test('удалённое пользователем помечается как своё', async () => {
    mocks.fetch.mockResolvedValue([{ conversation_message_id: 1 }])

    await deleteMessages(PEER_ID, cmids(1, 1), false)

    expect(wasDeletedByUs(PEER_ID, Message.resolveCmid(1))).toBe(true)
  })

  test('неудачное удаление отметку снимает', async () => {
    mocks.fetch.mockResolvedValue([
      { conversation_message_id: 2, error: { description: 'нельзя' } }
    ])

    const { failed } = await deleteMessages(PEER_ID, cmids(2, 2), false)

    expect(failed).toHaveLength(1)
    expect(wasDeletedByUs(PEER_ID, Message.resolveCmid(2))).toBe(false)
  })

  test('множество отметок не растёт без предела', async () => {
    const batch = cmids(1000, 1999)
    mocks.fetch.mockResolvedValue(
      batch.map((cmid) => ({ conversation_message_id: cmid }))
    )

    await deleteMessages(PEER_ID, batch, false)

    /*
      Отметка живёт до прихода события об удалении, но событие может и не дойти.
      Раньше множество копилось всю сессию и не чистилось никогда
    */
    expect(wasDeletedByUs(PEER_ID, Message.resolveCmid(1999))).toBe(true)
    expect(wasDeletedByUs(PEER_ID, Message.resolveCmid(1000))).toBe(false)
  })
})
