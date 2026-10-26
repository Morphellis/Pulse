import { useServices } from 'services'
import { UsersUser } from 'services/contracts/api/objects/UsersUser'
import { insertPeers } from 'actions'
import { chunk, DOSSIER_USER_FIELDS, isRecord, isUserObject } from 'actions/detective/common'
import { PEER_FIELDS } from 'misc/constants'

/**
 * Поиск близких людей вокруг цели: партнёр, родня и близкие друзья.
 *
 * Прямого признака «близости» в API нет, поэтому собираем его из трёх источников:
 * явно указанных родственников и партнёра, однофамильцев среди друзей и силы
 * пересечения по общим друзьям (у близких людей общих друзей заметно больше)
 */

export type RelativeKind =
  | 'partner'
  | 'parent'
  | 'child'
  | 'sibling'
  | 'grandparent'
  | 'grandchild'
  | 'relative'

export type Relative = {
  user: UsersUser | null
  /** Имя строкой, если родственник указан текстом без ссылки на страницу */
  name: string
  kind: RelativeKind
  /** Откуда узнали: из профиля или подобрали по фамилии */
  source: 'declared' | 'surname'
  note?: string
}

export type CloseFriend = {
  user: UsersUser
  /** Сколько общих друзей у этого человека с целью */
  mutualCount: number
}

export type Relations = {
  target: UsersUser
  relatives: Relative[]
  closeFriends: CloseFriend[]
  /** Всего живых друзей, по которым считали близость */
  analyzedFriends: number
}

const RELATIVE_KIND_BY_TYPE: Record<string, RelativeKind> = {
  parent: 'parent',
  child: 'child',
  sibling: 'sibling',
  grandparent: 'grandparent',
  grandchild: 'grandchild'
}

const CLOSE_FRIENDS_LIMIT = 30

export async function loadRelations(targetId: number): Promise<Relations> {
  const { api } = useServices()

  const users = await api.fetch('users.get', {
    user_ids: targetId,
    fields: DOSSIER_USER_FIELDS
  }, { retries: 1 })

  const target = users.find(isUserObject)
  if (!target) {
    throw new Error('Пользователь не найден')
  }

  insertPeers({ profiles: [target] })

  const response = await api.fetch('friends.get', {
    user_id: targetId,
    count: 5000,
    fields: `${PEER_FIELDS},bdate,city,last_name,maiden_name`
  }, { retries: 1 })

  // Удалённые и забаненные ломают friends.getMutual, поэтому убираем их сразу
  const friends = response.items.filter(
    (item): item is UsersUser => isUserObject(item) && !item.deactivated
  )

  for (const batch of chunk(friends, 500)) {
    insertPeers({ profiles: batch })
  }

  const [relatives, closeFriends] = await Promise.all([
    collectRelatives(target, friends),
    rankCloseFriends(targetId, friends)
  ])

  return {
    target,
    relatives,
    closeFriends,
    analyzedFriends: friends.length
  }
}

async function collectRelatives(target: UsersUser, friends: UsersUser[]): Promise<Relative[]> {
  const { api } = useServices()
  const relatives: Relative[] = []
  const usedIds = new Set<number>()

  // Партнёр из профиля (муж/жена/встречается)
  if (target.relation_partner) {
    relatives.push({
      user: null,
      name: `${target.relation_partner.first_name} ${target.relation_partner.last_name}`,
      kind: 'partner',
      source: 'declared'
    })
    usedIds.add(target.relation_partner.id)
  }

  // Явно указанные родственники: часть со ссылкой на страницу, часть просто текстом
  const declared = target.relatives ?? []
  const declaredIds = declared
    .map((relative) => relative.id)
    .filter((id): id is number => typeof id === 'number')

  const declaredUsers = new Map<number, UsersUser>()
  if (declaredIds.length > 0) {
    try {
      const fetched = await api.fetch('users.get', {
        user_ids: declaredIds.join(','),
        fields: PEER_FIELDS
      }, { retries: 1 })
      for (const user of fetched) {
        declaredUsers.set(user.id, user)
      }
      insertPeers({ profiles: fetched })
    } catch (error) {
      console.warn('[loadRelations] не удалось загрузить родственников', error)
    }
  }

  for (const relative of declared) {
    const kind = RELATIVE_KIND_BY_TYPE[relative.type ?? ''] ?? 'relative'
    const user = typeof relative.id === 'number' ? declaredUsers.get(relative.id) ?? null : null

    relatives.push({
      user,
      name: user ? `${user.first_name} ${user.last_name}` : relative.name ?? 'родственник',
      kind,
      source: 'declared'
    })

    if (typeof relative.id === 'number') {
      usedIds.add(relative.id)
    }
  }

  // Однофамильцы среди друзей: та же фамилия почти всегда означает родню
  const surnames = [target.last_name, target.maiden_name]
    .filter((surname): surname is string => !!surname && surname.length > 2)
    .map((surname) => surname.toLowerCase())
  const targetYear = birthYear(target.bdate)

  for (const friend of friends) {
    if (usedIds.has(friend.id) || !surnames.includes(friend.last_name.toLowerCase())) {
      continue
    }

    relatives.push({
      user: friend,
      name: `${friend.first_name} ${friend.last_name}`,
      kind: guessKind(targetYear, birthYear(friend.bdate)),
      source: 'surname',
      note: 'та же фамилия'
    })
    usedIds.add(friend.id)
  }

  return relatives
}

async function rankCloseFriends(targetId: number, friends: UsersUser[]): Promise<CloseFriend[]> {
  const { api } = useServices()

  if (friends.length === 0) {
    return []
  }

  const byId = new Map(friends.map((friend) => [friend.id, friend]))
  const batches = chunk(friends.map((friend) => friend.id), 100)

  const responses: unknown[] = await api.fetchMany(
    batches.map((batch) => api.buildMethod('friends.getMutual', {
      source_uid: targetId,
      target_uids: batch.join(',')
    })),
    { tolerateExecuteErrors: true, retries: 1 }
  )

  const ranked: CloseFriend[] = []

  for (const response of responses) {
    if (!Array.isArray(response)) {
      continue
    }

    for (const item of response) {
      if (!isRecord(item) || typeof item.id !== 'number') {
        continue
      }

      const user = byId.get(item.id)
      const mutualCount = typeof item.common_count === 'number' ? item.common_count : 0

      if (user && mutualCount > 0) {
        ranked.push({ user, mutualCount })
      }
    }
  }

  return ranked
    .sort((a, b) => b.mutualCount - a.mutualCount)
    .slice(0, CLOSE_FRIENDS_LIMIT)
}

function birthYear(bdate: string | undefined): number | null {
  const year = bdate?.split('.')[2]
  return year ? Number(year) : null
}

/**
 * Прикидывает тип родства по разнице в возрасте: ровесники — брат или сестра,
 * разница в поколение — родитель или ребёнок
 */
function guessKind(targetYear: number | null, relativeYear: number | null): RelativeKind {
  if (targetYear === null || relativeYear === null) {
    return 'relative'
  }

  const gap = targetYear - relativeYear

  if (Math.abs(gap) <= 15) {
    return 'sibling'
  }

  if (gap >= 15 && gap <= 45) {
    // Родственник заметно старше цели
    return 'parent'
  }

  if (gap <= -15 && gap >= -45) {
    return 'child'
  }

  return 'relative'
}
