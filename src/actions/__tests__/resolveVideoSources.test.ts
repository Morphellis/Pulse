import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import * as Attach from 'model/Attach'
import * as Peer from 'model/Peer'
import { resolveVideoSources } from 'actions'

// Баррель actions тянет за собой стор viewer, а тот создаёт RendererStorage
// прямо на импорте модуля — тесты гоняются в ноде без localStorage и без window
vi.hoisted(() => {
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true })

  const store = new Map<string, string>()
  globalThis.localStorage = {
    length: 0,
    key: () => null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear()
  }
})

const fetchManyMock = vi.fn()

vi.mock('services', () => ({
  useServices: () => ({
    api: {
      buildMethod: (method: string, params: unknown) => [method, params],
      fetchMany: fetchManyMock
    }
  })
}))

function buildVideo(id: number): Attach.Video {
  return {
    kind: 'Video',
    id,
    ownerId: Peer.resolveOwnerId(1),
    title: '',
    isLive: false,
    canPlay: true,
    isVideoMessage: false
  }
}

function mockApiResponse(mp4Url: string) {
  fetchManyMock.mockResolvedValueOnce([
    { items: [{ files: { mp4_720: mp4Url } }] }
  ])
}

describe(resolveVideoSources.name, () => {
  beforeEach(() => {
    vi.useFakeTimers()
    fetchManyMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('повторный вызов в пределах TTL переиспользует тот же запрос', async () => {
    const video = buildVideo(1)
    mockApiResponse('https://example.com/a.mp4')

    const [first, second] = await Promise.all([
      resolveVideoSources(video),
      resolveVideoSources(video)
    ])

    expect(fetchManyMock).toHaveBeenCalledTimes(1)
    expect(first).toEqual(second)
  })

  test('после истечения TTL резолвит заново, а не отдаёт протухший результат', async () => {
    const video = buildVideo(2)
    mockApiResponse('https://example.com/old.mp4')
    await resolveVideoSources(video)

    // Модельный кеш сбрасываем вручную: в реальном коде за это отвечает
    // отдельный объект Video того же ролика, здесь эмулируем истечение TTL
    video.sources = undefined

    vi.advanceTimersByTime(6 * 60 * 1000)

    mockApiResponse('https://example.com/fresh.mp4')
    const resolved = await resolveVideoSources(video)

    expect(fetchManyMock).toHaveBeenCalledTimes(2)
    expect(resolved).toEqual([{ height: 720, url: 'https://example.com/fresh.mp4' }])
  })

  test('ignoreCache всегда идёт в сеть, даже до истечения TTL', async () => {
    const video = buildVideo(3)
    mockApiResponse('https://example.com/old.mp4')
    await resolveVideoSources(video)
    video.sources = undefined

    mockApiResponse('https://example.com/fresh.mp4')
    const resolved = await resolveVideoSources(video, { ignoreCache: true })

    expect(fetchManyMock).toHaveBeenCalledTimes(2)
    expect(resolved).toEqual([{ height: 720, url: 'https://example.com/fresh.mp4' }])
  })

  test('другой объект Video с тем же id переиспользует ещё не остывший кеш', async () => {
    const videoA = buildVideo(4)
    const videoB = buildVideo(4)
    mockApiResponse('https://example.com/shared.mp4')

    const resolvedA = await resolveVideoSources(videoA)
    const resolvedB = await resolveVideoSources(videoB)

    expect(fetchManyMock).toHaveBeenCalledTimes(1)
    expect(resolvedB).toEqual(resolvedA)
  })
})
