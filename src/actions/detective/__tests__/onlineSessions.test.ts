import { describe, expect, test, vi } from 'vitest'
import { ONE_HOUR, ONE_MINUTE } from 'misc/dateTime'

/*
  Модуль трекера тянет за собой сервисы и сторы, а проверяем мы чистый разбор событий,
  поэтому подменяем всё, что дергается на импорте
*/
vi.mock('services', () => ({ useServices: () => ({ api: {} }) }))
vi.mock('store/detective', () => ({ useDetectiveStore: () => ({ watched: [] }) }))
vi.mock('actions', () => ({ insertPeers: () => undefined }))
vi.mock('misc/idb', () => ({
  idbGetAllByIndex: () => Promise.resolve([]),
  idbPutMany: () => Promise.resolve(),
  ONLINE_EVENTS_STORE: 'onlineEvents'
}))

const { buildSessions, compareSessions } = await import('actions/detective/onlineTracker')

const NOW = Date.UTC(2026, 0, 2, 12, 0, 0)
const FROM = NOW - 12 * ONE_HOUR

function event(offsetFromNow: number, online: boolean, platform = 7, lastSeen?: number) {
  return { userId: 1, ts: NOW - offsetFromNow, online, platform, lastSeen }
}

describe(buildSessions.name, () => {
  test('пара вход-выход превращается в один отрезок', () => {
    const sessions = buildSessions([
      event(3 * ONE_HOUR, true),
      event(2 * ONE_HOUR, false)
    ], FROM, NOW)

    expect(sessions).toHaveLength(1)
    expect(sessions[0]!.end - sessions[0]!.start).toBe(ONE_HOUR)
  })

  test('незакрытая сессия считается длящейся до текущего момента', () => {
    const sessions = buildSessions([event(ONE_HOUR, true)], FROM, NOW)

    expect(sessions).toHaveLength(1)
    expect(sessions[0]!.end).toBe(NOW)
  })

  test('смена устройства разрезает сессию на две', () => {
    const sessions = buildSessions([
      event(4 * ONE_HOUR, true, 7),
      event(3 * ONE_HOUR, true, 4),
      event(2 * ONE_HOUR, false, 4)
    ], FROM, NOW)

    expect(sessions).toHaveLength(2)
    expect(sessions[0]!.platform).toBe(7)
    expect(sessions[1]!.platform).toBe(4)
  })

  test('известное время последнего визита уточняет конец сессии', () => {
    const lastSeen = NOW - 2 * ONE_HOUR - 30 * ONE_MINUTE
    const sessions = buildSessions([
      event(3 * ONE_HOUR, true),
      event(2 * ONE_HOUR, false, 7, lastSeen)
    ], FROM, NOW)

    // Выход замечен опросом позже, чем он произошёл на самом деле
    expect(sessions[0]!.end).toBe(lastSeen)
  })

  test('события вне окна обрезаются по его границе', () => {
    const sessions = buildSessions([
      event(20 * ONE_HOUR, true),
      event(ONE_HOUR, false)
    ], FROM, NOW)

    expect(sessions[0]!.start).toBe(FROM)
  })
})

describe(compareSessions.name, () => {
  const period = 12 * ONE_HOUR

  test('полное совпадение даёт коэффициент заметно выше единицы', () => {
    const sessions = [{ start: FROM, end: FROM + ONE_HOUR, platform: 7 }]
    const result = compareSessions(sessions, sessions, period)

    expect(result.overlap).toBe(ONE_HOUR)
    expect(result.ratio).toBeGreaterThan(1)
    expect(result.coStarts).toBe(1)
  })

  test('непересекающиеся сессии дают нулевое пересечение', () => {
    const result = compareSessions(
      [{ start: FROM, end: FROM + ONE_HOUR, platform: 7 }],
      [{ start: FROM + 2 * ONE_HOUR, end: FROM + 3 * ONE_HOUR, platform: 7 }],
      period
    )

    expect(result.overlap).toBe(0)
    expect(result.ratio).toBe(0)
    expect(result.coStarts).toBe(0)
  })

  test('без данных у одного из двоих коэффициент не считается', () => {
    const result = compareSessions(
      [{ start: FROM, end: FROM + ONE_HOUR, platform: 7 }],
      [],
      period
    )

    expect(result.ratio).toBeNull()
  })
})
