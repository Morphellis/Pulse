import { useServices } from 'services'
import * as Peer from 'model/Peer'
import { useFriendsStore } from 'store/friends'
import { insertPeers } from 'actions'
import { FRIENDS_PER_PAGE, PEER_FIELDS } from 'misc/constants'

/**
 * Загружает друзей один раз за сессию: список нужен только для выбора получателей,
 * и его неактуальность на пару минут ни на что не влияет
 */
export async function loadFriends() {
  const { api } = useServices()
  const friends = useFriendsStore()

  if (friends.status === 'loading' || friends.status === 'loaded') {
    return
  }

  try {
    friends.status = 'loading'

    const response = await api.fetch('friends.get', {
      // hints сортирует так же, как сам ВК: сначала те, с кем больше общаешься
      order: 'hints',
      count: FRIENDS_PER_PAGE,
      fields: PEER_FIELDS
    })

    // С fields метод отдает объекты, числа приходят только без fields
    const users = response.items.filter((item) => typeof item === 'object')

    insertPeers({ profiles: users })

    friends.ids = users.map((user) => Peer.resolveRealId(user.id, 'User'))
    friends.status = 'loaded'
  } catch (err) {
    console.warn('[loadFriends] loading error', err)
    friends.status = 'error'
  }
}
