import { useServices } from 'services'
import { UsersUser } from 'services/contracts/api/objects/UsersUser'
import * as Peer from 'model/Peer'
import { usePeersStore } from 'store/peers'
import { insertPeers } from 'actions'
import { DOSSIER_USER_FIELDS, isUserObject } from 'actions/detective/common'

/**
 * Догружает карточку пользователя, если её ещё нет в сторе.
 *
 * Нужно при открытии чужой страницы по ссылке из досье или поиска: такого человека
 * может не быть ни в диалогах, ни в друзьях, а показать его всё равно надо
 */
export async function loadProfileUser(userId: Peer.UserId): Promise<UsersUser | null> {
  const { api } = useServices()

  try {
    const users = await api.fetch('users.get', {
      user_ids: Peer.toRealId(userId),
      fields: DOSSIER_USER_FIELDS
    }, { retries: 1 })

    const user = users.find(isUserObject)

    if (user) {
      insertPeers({ profiles: [user] })
    }

    return user ?? null
  } catch (error) {
    console.warn('[loadProfileUser] loading error', error)
    return null
  }
}

/** Есть ли карточка пользователя в сторе: по ней рисуется шапка профиля */
export function hasPeer(userId: Peer.UserId) {
  const { peers } = usePeersStore()
  return peers.has(userId)
}
