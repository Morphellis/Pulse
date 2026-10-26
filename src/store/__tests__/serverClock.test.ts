import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useServerClockStore } from 'store/serverClock'

vi.hoisted(() => {
  globalThis.localStorage = {
    length: 0,
    key: () => null,
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined
  }
})

const MINUTE = 60_000

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('serverClock', () => {
  test('без наблюдений возраст считается по локальным часам', () => {
    const clock = useServerClockStore()

    expect(clock.skew).toBe(0)
    expect(clock.age(Date.now() - 5000)).toBe(5000)
  })

  test('часы, убежавшие вперёд, не старят свежие события', () => {
    const clock = useServerClockStore()
    const skew = 10 * MINUTE

    // Серверное время отстаёт от локального ровно на величину сдвига
    const liveEvent = Date.now() - skew
    clock.observe(liveEvent)

    expect(clock.skew).toBe(skew)
    expect(clock.age(liveEvent)).toBe(0)
  })

  test('часы, отставшие назад, не делают события «из будущего»', () => {
    const clock = useServerClockStore()
    const skew = -10 * MINUTE

    const liveEvent = Date.now() - skew
    clock.observe(liveEvent)

    expect(clock.skew).toBe(skew)
    expect(clock.age(liveEvent)).toBe(0)
  })

  test('старое событие остаётся старым при любом сдвиге часов', () => {
    const clock = useServerClockStore()
    const skew = 10 * MINUTE

    clock.observe(Date.now() - skew)

    // Событие, отправленное на пять минут раньше живого
    const staleEvent = Date.now() - skew - 5 * MINUTE
    expect(clock.age(staleEvent)).toBe(5 * MINUTE)
  })

  test('оценкой служит минимум: задержка доставки её не портит', () => {
    const clock = useServerClockStore()
    const now = Date.now()

    clock.observe(now - 1000)
    clock.observe(now - 4000)
    clock.observe(now - 1500)

    expect(clock.skew).toBe(1000)
  })

  test('пачка старых событий оценку не сбивает', () => {
    const clock = useServerClockStore()

    clock.observe(Date.now())
    for (let index = 0; index < 10; index++) {
      clock.observe(Date.now() - 30 * MINUTE)
    }

    expect(clock.skew).toBe(0)
  })

  test('оценка переживает перевод часов: старые замеры вытесняются', () => {
    const clock = useServerClockStore()

    clock.observe(Date.now())
    expect(clock.skew).toBe(0)

    // Часы перевели вперёд на десять минут, дальше идут только новые замеры
    const skew = 10 * MINUTE
    for (let index = 0; index < 40; index++) {
      clock.observe(Date.now() - skew)
    }

    expect(clock.skew).toBe(skew)
  })

  test('мусорная отметка времени игнорируется', () => {
    const clock = useServerClockStore()

    clock.observe(Number.NaN)
    clock.observe(Number.POSITIVE_INFINITY)

    expect(clock.samples).toHaveLength(0)
    expect(clock.skew).toBe(0)
  })
})
