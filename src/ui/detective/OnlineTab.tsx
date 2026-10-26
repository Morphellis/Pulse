import { defineComponent, onMounted, shallowRef, watch } from 'vue'
import { useServices } from 'services'
import * as Peer from 'model/Peer'
import { useDetectiveStore } from 'store/detective'
import { usePeersStore } from 'store/peers'
import { insertPeers } from 'actions'
import { describeError } from 'actions/detective/common'
import {
  buildSessions,
  compareSessions,
  loadOnlineEvents,
  OnlineComparison,
  OnlineSession,
  platformName,
  restartOnlineTracker,
  startOnlineTracker,
  stopOnlineTracker,
  tick
} from 'actions/detective/onlineTracker'
import { resolveTargetUserId } from 'actions/detective/resolveTarget'
import { useFormatDate, useNow } from 'hooks'
import { PEER_FIELDS } from 'misc/constants'
import { ONE_DAY, ONE_HOUR } from 'misc/dateTime'
import { formatDuration, Section } from 'ui/detective/parts'
import { Avatar } from 'ui/ui/Avatar/Avatar'
import { Button } from 'ui/ui/Button/Button'
import { Input } from 'ui/ui/Input/Input'
import { Select } from 'ui/ui/Select/Select'

const INTERVAL_OPTIONS = [
  { label: 'каждые 15 секунд', value: '15000' },
  { label: 'каждые 30 секунд', value: '30000' },
  { label: 'каждую минуту', value: '60000' },
  { label: 'каждые 5 минут', value: '300000' }
]

const PERIOD_OPTIONS = [
  { label: 'за сутки', value: '1' },
  { label: 'за 3 дня', value: '3' },
  { label: 'за неделю', value: '7' },
  { label: 'за месяц', value: '30' }
]

export const OnlineTab = defineComponent(() => {
  const store = useDetectiveStore()
  const { peers } = usePeersStore()
  const { api } = useServices()
  const formatDate = useFormatDate()
  const now = useNow(30000)

  const input = shallowRef('')
  const adding = shallowRef(false)
  const error = shallowRef('')
  const sessions = shallowRef(new Map<number, OnlineSession[]>())

  const compareA = shallowRef('')
  const compareB = shallowRef('')
  const comparePeriod = shallowRef('7')
  const comparison = shallowRef<OnlineComparison | null>(null)
  const comparing = shallowRef(false)

  function userName(id: number) {
    const peer = peers.get(Peer.resolveRealId(id, 'User'))
    return peer ? Peer.name(peer) : `id${id}`
  }

  function userPeer(id: number) {
    return peers.get(Peer.resolveRealId(id, 'User'))
  }

  async function reloadSessions() {
    const to = Date.now()
    const from = to - ONE_DAY
    const map = new Map<number, OnlineSession[]>()

    for (const { id } of store.watched) {
      const events = await loadOnlineEvents(id, from - ONE_DAY)
      map.set(id, buildSessions(events, from, to))
    }

    sessions.value = map
  }

  async function add() {
    adding.value = true
    error.value = ''

    try {
      const id = await resolveTargetUserId(input.value)
      if (!id) {
        throw new Error('Не удалось распознать пользователя')
      }

      const users = await api.fetch('users.get', { user_ids: id, fields: PEER_FIELDS })
      insertPeers({ profiles: users })

      store.addWatched(id)
      input.value = ''

      if (store.trackerEnabled) {
        startOnlineTracker()
      }
      await tick()
    } catch (err) {
      error.value = describeError(err)
    } finally {
      adding.value = false
    }
  }

  function toggleTracker() {
    if (store.trackerActive) {
      store.trackerEnabled = false
      stopOnlineTracker()
    } else {
      store.trackerEnabled = true
      startOnlineTracker()
    }
  }

  async function compare() {
    const a = Number(compareA.value)
    const b = Number(compareB.value)

    if (!a || !b || a === b) {
      error.value = 'Выберите двух разных людей'
      return
    }

    comparing.value = true
    error.value = ''

    try {
      const period = Number(comparePeriod.value) * ONE_DAY
      const to = Date.now()
      const from = to - period
      const [eventsA, eventsB] = await Promise.all([
        loadOnlineEvents(a, from - ONE_DAY),
        loadOnlineEvents(b, from - ONE_DAY)
      ])

      comparison.value = compareSessions(
        buildSessions(eventsA, from, to),
        buildSessions(eventsB, from, to),
        period
      )
    } catch (err) {
      error.value = describeError(err)
    } finally {
      comparing.value = false
    }
  }

  onMounted(reloadSessions)
  watch(() => store.onlineStatuses, reloadSessions, { deep: true })
  watch(() => store.watched.length, reloadSessions)

  const watchedOptions = () => (
    store.watched.map(({ id }) => ({ label: userName(id), value: String(id) }))
  )

  return () => (
    <div>
      <div class="DtForm">
        <Input
          placeholder="Добавить человека: ссылка, id или короткое имя"
          value={input.value}
          onInput={(event: Event) => {
            input.value = (event.target as HTMLInputElement).value
          }}
          onKeydown={(event) => event.key === 'Enter' && add()}
        />
        <Button onClick={add} loading={adding.value}>Наблюдать</Button>
      </div>

      <div class="DtInline DtSection">
        <Button
          mode={store.trackerActive ? 'secondary' : 'primary'}
          onClick={toggleTracker}
          disabled={store.watched.length === 0}
        >
          {store.trackerActive ? 'Остановить трекер' : 'Запустить трекер'}
        </Button>
        <Select
          selected={String(store.pollInterval)}
          options={INTERVAL_OPTIONS}
          onSelect={(value) => {
            store.pollInterval = Number(value)
            restartOnlineTracker()
          }}
        />
        <span class="DtMuted">
          {store.trackerActive ? 'трекер работает, пока открыто приложение' : 'трекер остановлен'}
        </span>
        {store.trackerError && <span class="DtError">{store.trackerError}</span>}
      </div>

      {error.value && <div class="DtError DtSection">{error.value}</div>}

      <Section title="Наблюдаемые" hint={String(store.watched.length)}>
        {store.watched.length === 0 && (
          <span class="DtMuted">Добавьте людей, чтобы записывать их время в сети</span>
        )}
        {store.watched.map(({ id }) => {
          const status = store.onlineStatuses.get(id)
          const peer = userPeer(id)
          const userSessions = sessions.value.get(id) ?? []

          return (
            <div class="DtWatched" key={id}>
              {peer ? <Avatar peer={peer} size={32} /> : <span />}
              <span>
                <span class={['DtStatusDot', status?.online && 'DtStatusDot--online']} />
                {' '}
                <a class="Link" href={`https://vk.com/id${id}`} target="_blank">{userName(id)}</a>
                {status && (
                  <span class="DtMuted">
                    {' · '}
                    {status.online
                      ? `онлайн, ${platformName(status.platform)}`
                      : status.lastSeen
                        ? `был(а) ${formatDate(status.lastSeen)}, ${platformName(status.platform)}`
                        : 'не в сети'}
                  </span>
                )}
              </span>
              <span class="DtMuted">
                {formatDuration(totalDuration(userSessions))} за сутки
              </span>
              <Button size="small" mode="tertiary" onClick={() => store.removeWatched(id)}>
                Убрать
              </Button>
              <div class="DtWatched__timeline">
                {renderTimeline(userSessions, now.value)}
              </div>
            </div>
          )
        })}
      </Section>

      {store.watched.length >= 2 && (
        <Section title="Совпадения онлайна" hint="как часто двое бывают в сети одновременно">
          <div class="DtInline DtSection">
            <Select
              selected={compareA.value}
              options={watchedOptions()}
              onSelect={(value) => (compareA.value = value)}
            />
            <Select
              selected={compareB.value}
              options={watchedOptions()}
              onSelect={(value) => (compareB.value = value)}
            />
            <Select
              selected={comparePeriod.value}
              options={PERIOD_OPTIONS}
              onSelect={(value) => (comparePeriod.value = value)}
            />
            <Button onClick={compare} loading={comparing.value}>Сравнить</Button>
          </div>
          {comparison.value && renderComparison(comparison.value)}
        </Section>
      )}
    </div>
  )
})

function totalDuration(sessions: OnlineSession[]) {
  return sessions.reduce((sum, session) => sum + (session.end - session.start), 0)
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

function renderTimeline(sessions: OnlineSession[], now: number) {
  const from = now - ONE_DAY
  const percent = (value: number) => `${(value / ONE_DAY) * 100}%`
  const isMobile = (platform: number) => platform > 0 && platform <= 5

  return (
    <>
      <div class="DtTimeline">
        {sessions.map((session) => (
          <div
            class={['DtTimeline__session', isMobile(session.platform) && 'DtTimeline__session--mobile']}
            style={{
              left: percent(session.start - from),
              width: percent(session.end - session.start)
            }}
            title={
              `${formatTime(session.start)} – ${formatTime(session.end)}, ` +
              platformName(session.platform)
            }
          />
        ))}
      </div>
      <div class="DtTimelineAxis">
        <span>{formatTime(from)}</span>
        <span>{formatTime(from + 12 * ONE_HOUR)}</span>
        <span>сейчас</span>
      </div>
    </>
  )
}

function renderComparison(comparison: OnlineComparison) {
  const verdict = comparison.ratio === null
    ? 'Мало данных: у кого-то из двоих нет записанных сессий за период'
    : comparison.ratio >= 2
      ? 'Сильное совпадение: вместе в сети заметно чаще случайного'
      : comparison.ratio >= 1.3
        ? 'Умеренное совпадение'
        : 'Совпадений не больше случайного'

  return (
    <div>
      <div>{verdict}</div>
      <div class="DtMuted">
        Первый в сети {formatDuration(comparison.onlineA)},
        второй {formatDuration(comparison.onlineB)},
        одновременно {formatDuration(comparison.overlap)}
        при ожидаемых {formatDuration(comparison.expected)}
        {comparison.ratio !== null && ` (коэффициент ${comparison.ratio.toFixed(2)})`}.
        Одновременных выходов в сеть: {comparison.coStarts}
      </div>
    </div>
  )
}
