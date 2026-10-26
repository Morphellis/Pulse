import { useServices } from 'services'
import { UsersUser } from 'services/contracts/api/objects/UsersUser'
import { insertPeers } from 'actions'
import { chunk, isRecord, isUserObject } from 'actions/detective/common'
import { useViewer } from 'hooks'
import { PEER_FIELDS } from 'misc/constants'

export type HidesMeProgress = {
  checked: number
  total: number
}

export type HidesMeResult = {
  /** Друзья, в чьем открытом списке друзей вас нет */
  hiding: UsersUser[]
  /** Список друзей закрыт или слишком большой, проверить нельзя */
  unknown: UsersUser[]
  total: number
}

/**
 * Проверяет, кто из ваших друзей скрыл вас из своего списка друзей.
 * Для каждого друга запрашиваем его список и ищем там себя
 */
export async function findWhoHidesMe(
  onProgress: (progress: HidesMeProgress) => void
): Promise<HidesMeResult> {
  const { api } = useServices()
  const viewer = useViewer()

  const response = await api.fetch('friends.get', {
    order: 'hints',
    count: 5000,
    fields: PEER_FIELDS
  }, { retries: 1 })

  const friends = response.items.filter(isUserObject)
  insertPeers({ profiles: friends })

  const hiding: UsersUser[] = []
  const unknown: UsersUser[] = []
  let checked = 0

  onProgress({ checked, total: friends.length })

  for (const batch of chunk(friends, 25)) {
    const results: unknown[] = await api.fetchMany(
      batch.map((friend) => api.buildMethod('friends.get', { user_id: friend.id, count: 5000 })),
      { tolerateExecuteErrors: true, retries: 1 }
    )

    batch.forEach((friend, index) => {
      const result = results[index]

      if (!isRecord(result) || !Array.isArray(result.items)) {
        unknown.push(friend)
        return
      }

      const ids = result.items.filter((id) => typeof id === 'number')

      if (ids.includes(viewer.id)) {
        return
      }

      if (typeof result.count === 'number' && result.count > ids.length) {
        unknown.push(friend)
      } else {
        hiding.push(friend)
      }
    })

    checked += batch.length
    onProgress({ checked, total: friends.length })
  }

  return { hiding, unknown, total: friends.length }
}
