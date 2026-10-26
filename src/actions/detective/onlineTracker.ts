import { useServices } from 'services'
import { useDetectiveStore } from 'store/detective'
import { insertPeers } from 'actions'
import { chunk, describeError } from 'actions/detective/common'
import { PEER_FIELDS } from 'misc/constants'
import { idbGetAllByIndex, idbPutMany, ONLINE_EVENTS_STORE } from 'misc/idb'

/**
 * Онлайн-трекер: раз в pollInterval запрашивает статус всех наблюдаемых одним users.get
 * и сохраняет в IndexedDB только смены состояния (вышел в сеть, вышел из сети, сменил устройство)
 */

export type OnlineEvent = {
  id?: number
  userId: number
  ts: number
  online: boolean
  platform: number
  lastSeen?: number
}

export type OnlineSession = {
  start: number
  end: number
  platform: number
}

export type OnlineComparison = {
  onlineA: number
  onlineB: number
  overlap: number
  /** Ожидаемое пересечение, если бы люди выходили в сеть независимо друг от друга */
  expected: number
  /** overlap / expected; заметно больше 1 — люди бывают онлайн вместе чаще случайного */
  ratio: number | null
  /** Сколько раз оба вышли в сеть в пределах трёх минут */
  coStarts: number
}

const PLATFORM_NAMES: Record<number, string> = {
  1: 'мобильная версия',
  2: 'iPhone',
  3: 'iPad',
  4: 'Android',
  5: 'Windows Phone',
  6: 'Windows',
  7: 'веб'
}

const CO_START_WINDOW = 3 * 60 * 1000

let timerId: number | null = null
let ticking = false

export function platformName(platform: number) {
  return PLATFORM_NAMES[platform] ?? 'неизвестно'
}

export function startOnlineTracker() {
  const store = useDetectiveStore()

  if (timerId !== null) {
    return
  }

  store.trackerActive = true
  timerId = window.setInterval(() => void tick(), store.pollInterval)
  void tick()
}

export function stopOnlineTracker() {
  const store = useDetectiveStore()

  if (timerId !== null) {
    window.clearInterval(timerId)
    timerId = null
  }

  store.trackerActive = false
}

export function restartOnlineTracker() {
  if (timerId !== null) {
    stopOnlineTracker()
    startOnlineTracker()
  }
}

export async function tick() {
  const store = useDetectiveStore()
  const { api } = useServices()

  if (ticking || store.watched.length === 0) {
    return
  }

  ticking = true

  try {
    const events: OnlineEvent[] = []

    for (const batch of chunk(store.watched.map((user) => user.id), 500)) {
      const users = await api.fetch('users.get', {
        user_ids: batch.join(','),
        fields: `${PEER_FIELDS},online,last_seen`
      }, { retries: 1 })

      insertPeers({ profiles: users })
      const now = Date.now()

      for (const user of users) {
        const online = user.online === 1
        const fallbackPlatform = user.online_info?.is_mobile ? 1 : online ? 7 : 0
        const platform = user.last_seen?.platform ?? fallbackPlatform
        const lastSeenSeconds = user.last_seen?.time ?? user.online_info?.last_seen
        const lastSeen = lastSeenSeconds ? lastSeenSeconds * 1000 : undefined
        const previous = store.onlineStatuses.get(user.id)

        if (previous?.online !== online || previous.platform !== platform) {
          events.push({ userId: user.id, ts: now, online, platform, lastSeen })
        }

        store.onlineStatuses.set(user.id, { online, platform, lastSeen, sampledAt: now })
      }
    }

    await idbPutMany(ONLINE_EVENTS_STORE, events)
    store.trackerError = null
  } catch (error) {
    console.warn('[onlineTracker] tick failed', error)
    store.trackerError = describeError(error)
  } finally {
    ticking = false
  }
}

export function loadOnlineEvents(userId: number, from: number): Promise<OnlineEvent[]> {
  return idbGetAllByIndex<OnlineEvent>(
    ONLINE_EVENTS_STORE,
    'userIdTs',
    IDBKeyRange.bound([userId, from], [userId, Number.MAX_SAFE_INTEGER])
  )
}

/**
 * Собирает из событий отрезки, когда человек был в сети.
 * Незакрытая сессия считается длящейся до now
 */
export function buildSessions(events: OnlineEvent[], from: number, now: number): OnlineSession[] {
  const sessions: OnlineSession[] = []
  let current: OnlineSession | null = null

  for (const event of [...events].sort((a, b) => a.ts - b.ts)) {
    if (event.online) {
      if (current !== null && current.platform !== event.platform) {
        current.end = event.ts
        sessions.push(current)
        current = null
      }

      current ??= { start: event.ts, end: now, platform: event.platform }
    } else if (current) {
      // Если известно точное время последнего визита, берём его, оно точнее момента опроса
      const end = event.lastSeen && event.lastSeen > current.start && event.lastSeen < event.ts
        ? event.lastSeen
        : event.ts
      current.end = end
      sessions.push(current)
      current = null
    }
  }

  if (current) {
    sessions.push(current)
  }

  return sessions
    .map((session) => ({
      ...session,
      start: Math.max(session.start, from),
      end: Math.min(session.end, now)
    }))
    .filter((session) => session.end > session.start)
}

export function compareSessions(
  sessionsA: OnlineSession[],
  sessionsB: OnlineSession[],
  period: number
): OnlineComparison {
  const total = (sessions: OnlineSession[]) => (
    sessions.reduce((sum, session) => sum + (session.end - session.start), 0)
  )

  let overlap = 0
  for (const a of sessionsA) {
    for (const b of sessionsB) {
      overlap += Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start))
    }
  }

  const onlineA = total(sessionsA)
  const onlineB = total(sessionsB)
  const expected = period > 0 ? (onlineA * onlineB) / period : 0

  const coStarts = sessionsA.filter((a) => (
    sessionsB.some((b) => Math.abs(a.start - b.start) <= CO_START_WINDOW)
  )).length

  return {
    onlineA,
    onlineB,
    overlap,
    expected,
    ratio: expected > 0 ? overlap / expected : null,
    coStarts
  }
}
