import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.hoisted(() => {
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

const TARGET = 777
const OWNER = -100

/** Стена из трёх записей, комментарии есть только у первых двух */
const POSTS = [
  { id: 1, comments: { count: 3 } },
  { id: 2, comments: { count: 1 } },
  { id: 3, comments: { count: 0 } }
]

const COMMENTS: Record<number, Array<Record<string, unknown>>> = {
  1: [
    { id: 11, from_id: 555, date: 1000, text: 'чужой' },
    {
      id: 12,
      from_id: TARGET,
      date: 2000,
      text: 'нужный комментарий',
      thread: { count: 1, items: [{ id: 13, from_id: TARGET, date: 2100, text: 'ответ в ветке' }] }
    }
  ],
  2: [
    { id: 21, from_id: 555, date: 3000, text: 'снова чужой', deleted: false },
    { id: 22, from_id: TARGET, date: 3100, text: 'удалённый', deleted: true }
  ]
}

const mocks = vi.hoisted(() => ({ saved: [] as unknown[] }))

vi.mock('misc/idb', () => ({
  COMMENTS_STORE: 'comments',
  idbPutMany: (_store: string, values: unknown[]) => {
    mocks.saved.push(...values)
    return Promise.resolve()
  },
  idbGetAllByIndex: () => Promise.resolve([]),
  idbDeleteByIndex: () => Promise.resolve()
}))

vi.mock('actions/detective/loadOwners', () => ({
  loadUserGroups: () => Promise.resolve({ count: 1, ids: [-OWNER], items: [] })
}))

vi.mock('services', () => ({
  useServices: () => ({
    api: {
      buildMethod: (method: string, params: unknown) => [method, params],
      fetch: (method: string, params: { owner_id?: number, offset?: number, count?: number }) => {
        if (method === 'wall.get') {
          const offset = params.offset ?? 0
          return Promise.resolve({ count: POSTS.length, items: POSTS.slice(offset, offset + 100) })
        }
        throw new Error('неожиданный метод ' + method)
      },
      fetchMany: (calls: Array<[string, { post_id: number, comment_id?: number }]>) => (
        Promise.resolve(calls.map(([, params]) => {
          // Ветки догружаются отдельным вызовом, в тесте они уже пришли превью
          if (params.comment_id) {
            return { count: 0, items: [] }
          }
          const items = COMMENTS[params.post_id] ?? []
          return { count: items.length, items }
        }))
      )
    }
  })
}))

const {
  startCommentsScan,
  cancelCommentsScan
} = await import('actions/detective/commentsScan')
const { useDetectiveStore } = await import('store/detective')

async function waitForFinish() {
  const scan = useDetectiveStore().commentsScan

  for (let attempt = 0; attempt < 200; attempt++) {
    if (scan.status === 'done' || scan.status === 'error') {
      return scan
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  }

  throw new Error('скан не завершился, статус ' + scan.status)
}

describe('поиск комментариев', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mocks.saved.length = 0
  })

  test('находит комментарии цели, включая ответы в ветках', async () => {
    startCommentsScan({
      targetId: TARGET,
      sourceKinds: ['own'],
      friendPostsLimit: 0,
      groupPostsLimit: 0
    })

    const scan = await waitForFinish()

    expect(scan.status).toBe('done')
    expect(scan.scannedPosts).toBe(POSTS.length)

    const texts = mocks.saved.map((comment) => (comment as { text: string }).text)
    expect(texts).toContain('нужный комментарий')
    expect(texts).toContain('ответ в ветке')
  })

  test('чужие и удалённые комментарии не попадают в результат', async () => {
    startCommentsScan({
      targetId: TARGET,
      sourceKinds: ['own'],
      friendPostsLimit: 0,
      groupPostsLimit: 0
    })

    await waitForFinish()

    const texts = mocks.saved.map((comment) => (comment as { text: string }).text)
    expect(texts).not.toContain('чужой')
    expect(texts).not.toContain('снова чужой')
    expect(texts).not.toContain('удалённый')
  })

  test('у каждой находки есть адрес записи и автор ветки', async () => {
    startCommentsScan({
      targetId: TARGET,
      sourceKinds: ['own'],
      friendPostsLimit: 0,
      groupPostsLimit: 0
    })

    await waitForFinish()

    const reply = mocks.saved.find((comment) => (
      (comment as { text: string }).text === 'ответ в ветке'
    )) as { postId: number, threadRootId: number | null, key: string } | undefined

    expect(reply?.postId).toBe(1)
    expect(reply?.threadRootId).toBe(12)
    expect(reply?.key).toContain(String(TARGET))
  })

  test('сброс возвращает скан в исходное состояние', async () => {
    startCommentsScan({
      targetId: TARGET,
      sourceKinds: ['own'],
      friendPostsLimit: 0,
      groupPostsLimit: 0
    })

    await waitForFinish()
    await cancelCommentsScan()

    const { commentsScan } = useDetectiveStore()
    expect(commentsScan.status).toBe('idle')
    expect(commentsScan.config).toBeNull()
    expect(commentsScan.foundCount).toBe(0)
  })
})
