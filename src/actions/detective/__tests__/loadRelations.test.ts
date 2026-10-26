import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, test, vi } from 'vitest'

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

const TARGET = 10

const target = {
  id: TARGET,
  first_name: 'Пётр',
  last_name: 'Иванов',
  bdate: '1.1.1980',
  relation_partner: { id: 99, first_name: 'Мария', last_name: 'Иванова' },
  relatives: [{ id: 20, type: 'child' }, { name: 'Баба Валя', type: 'grandparent' }]
}

const friends = [
  { id: 1, first_name: 'Сын', last_name: 'Иванов', bdate: '1.1.2005' },
  { id: 2, first_name: 'Брат', last_name: 'Иванов', bdate: '1.1.1982' },
  { id: 3, first_name: 'Друг', last_name: 'Петров', bdate: '1.1.1980' },
  { id: 4, first_name: 'Удалённый', last_name: 'Иванов', deactivated: 'banned' },
  { id: 5, first_name: 'Знакомый', last_name: 'Сидоров' }
]

// friends.getMutual: у брата больше всего общих, у знакомого мало
const mutualByFriend: Record<number, number> = { 1: 8, 2: 12, 3: 5, 5: 1 }

vi.mock('actions', () => ({ insertPeers: () => undefined }))

vi.mock('services', () => ({
  useServices: () => ({
    api: {
      buildMethod: (method: string, params: unknown) => [method, params],
      fetch: (method: string, params: { user_ids?: string | number }) => {
        if (method === 'users.get') {
          const ids = String(params.user_ids).split(',').map(Number)
          if (ids.includes(TARGET)) {
            return Promise.resolve([target])
          }
          // Загрузка карточек указанных родственников
          return Promise.resolve([{ id: 20, first_name: 'Дочь', last_name: 'Иванова' }])
        }
        if (method === 'friends.get') {
          return Promise.resolve({ count: friends.length, items: friends })
        }
        throw new Error('неожиданный метод ' + method)
      },
      fetchMany: (calls: Array<[string, { target_uids: string }]>) => (
        Promise.resolve(calls.map(([, params]) => (
          params.target_uids.split(',').map(Number).map((id) => ({
            id,
            common_count: mutualByFriend[id] ?? 0
          }))
        )))
      )
    }
  })
}))

const { loadRelations } = await import('actions/detective/loadRelations')

describe('поиск связей', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  test('партнёр из профиля попадает в родню', async () => {
    const relations = await loadRelations(TARGET)
    const partner = relations.relatives.find((r) => r.kind === 'partner')

    expect(partner?.name).toBe('Мария Иванова')
  })

  test('указанный родственник со ссылкой раскрывается в карточку', async () => {
    const relations = await loadRelations(TARGET)
    const child = relations.relatives.find((r) => r.user?.id === 20)

    expect(child?.kind).toBe('child')
    expect(child?.source).toBe('declared')
  })

  test('однофамильцы среди друзей находятся с догадкой о родстве', async () => {
    const relations = await loadRelations(TARGET)
    const bySurname = relations.relatives.filter((r) => r.source === 'surname')
    const names = bySurname.map((r) => r.name)

    // Сын и брат Ивановы найдены, Петров и Сидоров — нет
    expect(names).toContain('Сын Иванов')
    expect(names).toContain('Брат Иванов')
    expect(names).not.toContain('Друг Петров')

    // Ровесник — брат/сестра, младший на поколение — ребёнок
    expect(bySurname.find((r) => r.name === 'Брат Иванов')?.kind).toBe('sibling')
    expect(bySurname.find((r) => r.name === 'Сын Иванов')?.kind).toBe('child')
  })

  test('удалённые друзья не участвуют в анализе', async () => {
    const relations = await loadRelations(TARGET)

    expect(relations.analyzedFriends).toBe(4)
    expect(relations.relatives.some((r) => r.user?.id === 4)).toBe(false)
    expect(relations.closeFriends.some((c) => c.user.id === 4)).toBe(false)
  })

  test('близкие друзья отсортированы по числу общих друзей', async () => {
    const relations = await loadRelations(TARGET)
    const order = relations.closeFriends.map((c) => c.user.id)

    // Брат (12) выше сына (8) выше друга (5) выше знакомого (1)
    expect(order).toEqual([2, 1, 3, 5])
    expect(relations.closeFriends[0]?.mutualCount).toBe(12)
  })
})
