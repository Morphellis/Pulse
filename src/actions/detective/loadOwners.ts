import { useServices } from 'services'
import { GroupsGroup } from 'services/contracts/api/objects/GroupsGroup'
import { UsersUser } from 'services/contracts/api/objects/UsersUser'
import { chunk, isGroupObject, isUserObject } from 'actions/detective/common'
import { PEER_FIELDS } from 'misc/constants'

/**
 * Загрузка сообществ и подписок чужого профиля.
 *
 * Прямой путь через extended=1 работает только для своей страницы: для чужой ВК
 * отдаёт верный count и при этом пустой items. Поэтому берём идентификаторы
 * обычным вызовом и отдельно превращаем их в объекты
 */

/** groups.getById и users.get принимают максимум 500 и 1000 идентификаторов за раз */
const GROUPS_PER_REQUEST = 500
const USERS_PER_REQUEST = 1000

export type UserGroups = {
  count: number
  items: GroupsGroup[]
  /** Идентификаторы, включая те, чьи карточки не удалось загрузить */
  ids: number[]
}

export async function resolveGroups(ids: number[]): Promise<GroupsGroup[]> {
  const { api } = useServices()

  if (ids.length === 0) {
    return []
  }

  const batches = chunk(ids, GROUPS_PER_REQUEST)
  const responses: unknown[] = await api.fetchMany(
    batches.map((batch) => api.buildMethod('groups.getById', {
      group_ids: batch.join(','),
      fields: 'members_count,photo_50,photo_100,screen_name'
    })),
    { tolerateExecuteErrors: true, retries: 1 }
  )

  return responses.flatMap((response) => {
    // Начиная с 5.139 метод отвечает объектом с полем groups
    if (Array.isArray(response)) {
      return response.filter(isGroupObject)
    }

    const groups = (response as { groups?: unknown })?.groups
    return Array.isArray(groups) ? groups.filter(isGroupObject) : []
  })
}

export async function resolveUsers(ids: number[]): Promise<UsersUser[]> {
  const { api } = useServices()

  if (ids.length === 0) {
    return []
  }

  const batches = chunk(ids, USERS_PER_REQUEST)
  const responses: unknown[] = await api.fetchMany(
    batches.map((batch) => api.buildMethod('users.get', {
      user_ids: batch.join(','),
      fields: PEER_FIELDS
    })),
    { tolerateExecuteErrors: true, retries: 1 }
  )

  return responses.flatMap((response) => (
    Array.isArray(response) ? response.filter(isUserObject) : []
  ))
}

/** Сообщества пользователя. null — список закрыт настройками приватности */
export async function loadUserGroups(userId: number, limit = 1000): Promise<UserGroups | null> {
  const { api } = useServices()

  try {
    const response = await api.fetch('groups.get', { user_id: userId, count: limit }, { retries: 1 })
    const ids = response.items.filter((item) => typeof item === 'number')

    return {
      count: response.count,
      ids,
      items: await resolveGroups(ids)
    }
  } catch (error) {
    console.warn('[loadUserGroups] groups are unavailable', error)
    return null
  }
}

export type UserSubscriptions = {
  count: number
  users: UsersUser[]
  groups: GroupsGroup[]
}

/** Подписки пользователя: люди и сообщества. null — список закрыт */
export async function loadUserSubscriptions(
  userId: number,
  limit = 200
): Promise<UserSubscriptions | null> {
  const { api } = useServices()

  try {
    /*
      Без extended метод отвечает двумя отдельными блоками с идентификаторами:
      { users: { count, items }, groups: { count, items } }
    */
    const response = await api.fetch('users.getSubscriptions', {
      user_id: userId,
      count: limit
    }, { retries: 1 })

    const userIds = response.users?.items ?? []
    const groupIds = response.groups?.items ?? []

    const [users, groups] = await Promise.all([
      resolveUsers(userIds.slice(0, limit)),
      resolveGroups(groupIds.slice(0, limit))
    ])

    return {
      count: (response.users?.count ?? 0) + (response.groups?.count ?? 0),
      users,
      groups
    }
  } catch (error) {
    console.warn('[loadUserSubscriptions] subscriptions are unavailable', error)
    return null
  }
}
