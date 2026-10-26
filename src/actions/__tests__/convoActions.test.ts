import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import * as Convo from 'model/Convo'
import * as Lists from 'model/Lists'
import * as Peer from 'model/Peer'
import { useConvosStore } from 'store/convos'

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

const { clearConvoHistory } = await import('../clearConvoHistory')
const { toggleConvoMute } = await import('../toggleConvoMute')

/*
  Каждому тесту своя беседа: exclusiveByKey держит ключи выполняющихся действий
  в мапе на уровне модуля, и упавший до await тест иначе блокировал бы следующий
*/
let nextPeerId = 1

function seedConvo() {
  const { convos } = useConvosStore()
  const peerId = Peer.resolveId(nextPeerId++)
  const convo = Convo.safeGet(convos, peerId)
  convos.set(peerId, convo)
  return convo
}

/** Промис, которым тест управляет вручную: даёт заглянуть в состояние до ответа */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  setActivePinia(createPinia())
  mocks.fetch.mockReset()
  // Convo.safeGet в dev-режиме предупреждает об отсутствующей беседе
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('toggleConvoMute', () => {
  test('состояние применяется сразу, не дожидаясь ответа', async () => {
    const convo = seedConvo()
    const request = deferred<unknown>()
    mocks.fetch.mockReturnValue(request.promise)

    const pending = toggleConvoMute(convo)
    expect(convo.notifications.enabled).toBe(false)

    request.resolve(1)
    await pending

    expect(convo.notifications.enabled).toBe(false)
    expect(mocks.fetch).toHaveBeenCalledWith('account.setSilenceMode', {
      peer_id: convo.id,
      sound: 0,
      time: -1
    })
  })

  test('ошибка откатывает состояние обратно, а не молчит', async () => {
    const convo = seedConvo()
    const request = deferred<unknown>()
    mocks.fetch.mockReturnValue(request.promise)

    const pending = toggleConvoMute(convo)
    expect(convo.notifications.enabled).toBe(false)

    request.reject(new Error('vk said no'))
    await pending

    // Вернувшийся на место значок и есть сообщение о неудаче
    expect(convo.notifications.enabled).toBe(true)
  })

  test('включение уведомлений обратно уходит с теми же параметрами', async () => {
    const convo = seedConvo()
    convo.notifications.enabled = false
    mocks.fetch.mockResolvedValue(1)

    await toggleConvoMute(convo)

    expect(convo.notifications.enabled).toBe(true)
    expect(mocks.fetch).toHaveBeenCalledWith('account.setSilenceMode', {
      peer_id: convo.id,
      sound: 1,
      time: 0
    })
  })
})

describe('clearConvoHistory', () => {
  test('очистка снимает счётчик непрочитанного и убирает беседу из списка непрочитанных', async () => {
    const { lists } = useConvosStore()
    const convo = seedConvo()

    convo.unreadCount = 5
    convo.isMarkedUnread = true
    convo.minorSortId = 100
    convo.pendingMessages = []

    // Так беседа попадает в списки при загрузке страницы: push заодно задаёт границы,
    // без которых refresh не примет в список ничего
    Lists.push(lists.main, convo)
    Lists.push(lists.unread, convo)

    expect(lists.unread.peerIds.has(convo.id)).toBe(true)

    mocks.fetch.mockResolvedValue({})
    await clearConvoHistory(convo)

    /*
      Событие лонгполла об очистке счётчики не сбрасывает — без явного сброса
      беседа висела бы с бейджем поверх пустой истории
    */
    expect(convo.unreadCount).toBe(0)
    expect(convo.isMarkedUnread).toBe(false)
    expect(convo.history).toHaveLength(0)
    expect(lists.unread.peerIds.has(convo.id)).toBe(false)
  })

  test('неотправленные сообщения тоже уходят', async () => {
    const convo = seedConvo()
    convo.pendingMessages = [{ kind: 'Pending' }] as typeof convo.pendingMessages

    mocks.fetch.mockResolvedValue({})
    await clearConvoHistory(convo)

    expect(convo.pendingMessages).toHaveLength(0)
  })
})
