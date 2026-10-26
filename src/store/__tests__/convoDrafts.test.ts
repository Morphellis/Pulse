import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import * as ConvoDraft from 'model/ConvoDraft'
import * as Peer from 'model/Peer'

/** Записи в localStorage и подписчики window, за которыми следят тесты */
const env = vi.hoisted(() => {
  const writes: Array<{ key: string, value: string }> = []
  const listeners = new Map<string, Array<() => void>>()

  globalThis.localStorage = {
    length: 0,
    key: () => null,
    getItem: () => null,
    setItem: (key: string, value: string) => void writes.push({ key, value }),
    removeItem: () => undefined,
    clear: () => undefined
  }

  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true })
  Object.defineProperty(globalThis, 'addEventListener', {
    value: (event: string, handler: () => void) => {
      const handlers = listeners.get(event) ?? []
      handlers.push(handler)
      listeners.set(event, handlers)
    },
    configurable: true,
    writable: true
  })

  return { writes, listeners }
})

const { init, useConvoDraftsStore } = await import('store/convoDrafts')

const PEER_ID = Peer.resolveId(1)

function draftWrites() {
  return env.writes.filter(({ key }) => key.startsWith('convoDrafts'))
}

function fireBeforeUnload() {
  for (const handler of env.listeners.get('beforeunload') ?? []) {
    handler()
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  env.writes.length = 0
  env.listeners.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('convoDrafts: сохранение на диск', () => {
  test('серия правок текста складывается в одну запись, а не в запись на символ', async () => {
    const store = useConvoDraftsStore()
    init()

    const draft = ConvoDraft.safeGet(store.drafts, PEER_ID)

    for (const text of ['п', 'пр', 'при', 'прив', 'приве', 'привет']) {
      draft.text = text
      await nextTick()
    }

    // Пока таймер не сработал, диска мы не касались вовсе
    expect(draftWrites()).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(600)

    expect(draftWrites()).toHaveLength(1)
    expect(draftWrites()[0]?.value).toContain('привет')
  })

  test('следующая правка после записи планирует новую запись', async () => {
    const store = useConvoDraftsStore()
    init()

    const draft = ConvoDraft.safeGet(store.drafts, PEER_ID)

    draft.text = 'первое'
    await nextTick()
    await vi.advanceTimersByTimeAsync(600)
    expect(draftWrites()).toHaveLength(1)

    draft.text = 'второе'
    await nextTick()
    await vi.advanceTimersByTimeAsync(600)

    expect(draftWrites()).toHaveLength(2)
    expect(draftWrites()[1]?.value).toContain('второе')
  })

  test('закрытие окна дописывает отложенную запись', async () => {
    const store = useConvoDraftsStore()
    init()

    const draft = ConvoDraft.safeGet(store.drafts, PEER_ID)

    draft.text = 'не потеряй меня'
    await nextTick()
    expect(draftWrites()).toHaveLength(0)

    fireBeforeUnload()

    expect(draftWrites()).toHaveLength(1)
    expect(draftWrites()[0]?.value).toContain('не потеряй меня')
  })
})
