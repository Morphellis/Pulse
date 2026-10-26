import { useServices } from 'services'
import { GroupsGroup } from 'services/contracts/api/objects/GroupsGroup'
import { UsersUser } from 'services/contracts/api/objects/UsersUser'
import { insertPeers } from 'actions'
import {
  chunk,
  DOSSIER_USER_FIELDS,
  isUserObject,
  SHORT_USER_FIELDS
} from 'actions/detective/common'
import {
  loadUserGroups,
  loadUserSubscriptions,
  UserGroups,
  UserSubscriptions
} from 'actions/detective/loadOwners'
import {
  estimateRegistrationDate,
  RegistrationEstimate
} from 'actions/detective/registrationDate'
import { useViewer } from 'hooks'
import { PEER_FIELDS } from 'misc/constants'

export type FriendsStats = {
  total: number
  loaded: number
  closed: number
  cities: Array<{ title: string, count: number }>
  averageAge: number | null
  agesKnown: number
  friends: UsersUser[]
}

export type Dossier = {
  user: UsersUser
  /** Оценка по номеру страницы: точную дату ВК через API не отдаёт */
  registeredAt: RegistrationEstimate | null
  mutualFriends: UsersUser[]
  /** null — список друзей закрыт */
  friends: FriendsStats | null
  /** null — подписки закрыты */
  subscriptions: UserSubscriptions | null
  /** null — сообщества закрыты */
  groups: UserGroups | null
  commonGroups: GroupsGroup[]
}

export async function loadDossier(targetId: number): Promise<Dossier> {
  const { api } = useServices()
  const viewer = useViewer()

  const [users, mutual, myGroups] = await api.fetchParallel([
    api.buildMethod('users.get', { user_ids: targetId, fields: DOSSIER_USER_FIELDS }),
    api.buildMethod('friends.getMutual', { target_uid: targetId }),
    api.buildMethod('groups.get', { user_id: viewer.id, count: 1000 })
  ], { tolerateExecuteErrors: true, retries: 1 })

  const user = Array.isArray(users) ? users.find(isUserObject) : undefined
  if (!user) {
    throw new Error('Пользователь не найден')
  }

  insertPeers({ profiles: [user] })

  const [mutualFriends, friends, groups, subscriptions] = await Promise.all([
    loadMutualFriends(Array.isArray(mutual) ? mutual.filter((id) => typeof id === 'number') : []),
    loadFriends(targetId),
    loadUserGroups(targetId),
    loadUserSubscriptions(targetId)
  ])

  const myGroupIds = new Set(
    myGroups && Array.isArray(myGroups.items)
      ? myGroups.items.filter((id) => typeof id === 'number')
      : []
  )

  return {
    user,
    registeredAt: estimateRegistrationDate(targetId),
    mutualFriends,
    friends,
    subscriptions,
    groups,
    commonGroups: (groups?.items ?? []).filter((group) => myGroupIds.has(group.id))
  }
}

async function loadMutualFriends(ids: number[]): Promise<UsersUser[]> {
  const { api } = useServices()

  if (ids.length === 0) {
    return []
  }

  const users = await api.fetch('users.get', {
    user_ids: ids.slice(0, 1000).join(','),
    fields: PEER_FIELDS
  }, { retries: 1 })

  insertPeers({ profiles: users })

  return users
}

async function loadFriends(targetId: number): Promise<FriendsStats | null> {
  const { api } = useServices()

  try {
    const response = await api.fetch('friends.get', {
      user_id: targetId,
      count: 5000,
      fields: SHORT_USER_FIELDS
    }, { retries: 1 })

    const friends = response.items.filter(isUserObject)

    for (const batch of chunk(friends, 500)) {
      insertPeers({ profiles: batch })
    }

    const cityCounts = new Map<string, number>()
    const currentYear = new Date().getFullYear()
    let closed = 0
    let agesSum = 0
    let agesKnown = 0

    for (const friend of friends) {
      if (friend.is_closed) {
        closed++
      }

      if (friend.city?.title) {
        cityCounts.set(friend.city.title, (cityCounts.get(friend.city.title) ?? 0) + 1)
      }

      const year = parseBirthYear(friend.bdate)
      if (year) {
        const age = currentYear - year
        if (age >= 5 && age <= 100) {
          agesSum += age
          agesKnown++
        }
      }
    }

    return {
      total: response.count,
      loaded: friends.length,
      closed,
      cities: [...cityCounts.entries()]
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15),
      averageAge: agesKnown > 0 ? Math.round(agesSum / agesKnown) : null,
      agesKnown,
      friends
    }
  } catch (error) {
    console.warn('[loadDossier] friends are unavailable', error)
    return null
  }
}

function parseBirthYear(bdate: string | undefined): number | null {
  const year = bdate?.split('.')[2]
  return year ? Number(year) : null
}
