import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import * as IEngine from 'services/contracts/IEngine'
import * as Convo from 'model/Convo'
import * as Peer from 'model/Peer'
import { useConvosStore } from 'store/convos'

/*
  Сторы создают RendererStorage прямо на импорте модуля, а обработчик берёт таймеры
  из window — в ноде нет ни того, ни другого. hoisted нужен, чтобы заглушки
  появились до импортов
*/
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

/*
  Событию тайпинга догружать нечего, но обработчик всё равно спрашивает сервисы.
  Настоящий api тут не нужен: все методы получаются пустыми и до сети не доходят
*/
const mocks = vi.hoisted(() => ({ fetchParallel: vi.fn() }))

vi.mock('services', () => ({
  useServices: () => ({
    api: {
      fetch: () => Promise.resolve({}),
      fetchMany: (methods: unknown[]) => Promise.resolve(methods.map(() => null)),
      fetchParallel: (methods: unknown[]) => {
        mocks.fetchParallel(methods)
        return Promise.resolve(methods.map(() => null))
      },
      buildMethod: (method: string, params: unknown) => [method, params]
    }
  })
}))

const { handleEngineUpdates } = await import('../handleEngineUpdates')

const PEER_ID = Peer.resolveId(1)
const TYPING_PEER_ID = 2

/** Событие «печатает текст» с указанным серверным временем в секундах */
function typingUpdate(timestampSeconds: number): IEngine.Update {
  return [63, PEER_ID, [TYPING_PEER_ID], 1, timestampSeconds]
}

function seedConvo() {
  const { convos } = useConvosStore()
  const convo = Convo.safeGet(convos, PEER_ID)
  convos.set(PEER_ID, convo)
  return convo
}

function typingCount() {
  return useConvosStore().typings.get(PEER_ID)?.length ?? 0
}

/** Методы, которые обработчик собрался догрузить для этой пачки */
function requestedMethods(): string[] {
  const batches = mocks.fetchParallel.mock.calls.map((call) => call[0] as unknown[])

  return batches
    .flat()
    .filter((method): method is [string, unknown] => Array.isArray(method))
    .map(([name]) => name)
}

beforeEach(() => {
  setActivePinia(createPinia())
  mocks.fetchParallel.mockReset()
  vi.useFakeTimers()
  // Convo.safeGet в dev-режиме предупреждает об отсутствующей беседе
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('handleEngineUpdates: индикатор набора текста', () => {
  test('свежее событие показывает индикатор и снимает его через пять секунд', async () => {
    seedConvo()

    await handleEngineUpdates([typingUpdate(Math.floor(Date.now() / 1000))])
    expect(typingCount()).toBe(1)

    await vi.advanceTimersByTimeAsync(4000)
    expect(typingCount()).toBe(1)

    await vi.advanceTimersByTimeAsync(2000)
    expect(typingCount()).toBe(0)
  })

  test('часы, убежавшие вперёд, не оставляют индикатор висеть минутами', async () => {
    seedConvo()

    /*
      Локальные часы на десять минут впереди серверных. Раньше время жизни считалось
      как «пять секунд + расхождение», и «печатает» висело все десять минут —
      ровно так и выглядел баг с бесконечно печатающим собеседником
    */
    const serverTimestamp = Math.floor(Date.now() / 1000) - 600

    await handleEngineUpdates([typingUpdate(serverTimestamp)])
    expect(typingCount()).toBe(1)

    await vi.advanceTimersByTimeAsync(6000)
    expect(typingCount()).toBe(0)
  })

  test('часы, отставшие назад, не отменяют индикатор вовсе', async () => {
    seedConvo()

    /*
      Зеркальный случай: локальные часы на десять минут позади серверных.
      Событие выглядит пришедшим «из будущего», и проверка на протухание
      отбрасывала его — «печатает» не появлялось вообще никогда
    */
    const serverTimestamp = Math.floor(Date.now() / 1000) + 600

    await handleEngineUpdates([typingUpdate(serverTimestamp)])
    expect(typingCount()).toBe(1)

    await vi.advanceTimersByTimeAsync(6000)
    expect(typingCount()).toBe(0)
  })

  test('старое событие из догоняющей пачки индикатор не показывает', async () => {
    seedConvo()
    const liveTimestamp = Math.floor(Date.now() / 1000)

    // Живое событие задаёт точку отсчёта, дальше ждём, пока индикатор погаснет
    await handleEngineUpdates([typingUpdate(liveTimestamp)])
    await vi.advanceTimersByTimeAsync(6000)
    expect(typingCount()).toBe(0)

    // Событие десятиминутной давности — именно то, чем движок заваливает после обрыва
    await handleEngineUpdates([typingUpdate(liveTimestamp - 600)])
    expect(typingCount()).toBe(0)
  })

  test('снятый индикатор не оставляет за собой пустую запись в мапе', async () => {
    seedConvo()

    await handleEngineUpdates([typingUpdate(Math.floor(Date.now() / 1000))])
    await vi.advanceTimersByTimeAsync(6000)

    expect(useConvosStore().typings.has(PEER_ID)).toBe(false)
  })
  test('при сдвинутых часах имя печатающего всё равно догружается', async () => {
    seedConvo()

    /*
      Возраст события считается в двух местах: при сборе недостающих данных
      и при разборе. Разъедься они — индикатор бы появился, но имя осталось
      незагруженным, и на экране было бы «User 2 печатает»
    */
    const serverTimestamp = Math.floor(Date.now() / 1000) - 600

    await handleEngineUpdates([typingUpdate(serverTimestamp)])

    expect(typingCount()).toBe(1)
    expect(requestedMethods()).toContain('users.get')
  })
})
