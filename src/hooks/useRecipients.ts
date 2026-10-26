import { computed, onMounted, Ref, shallowRef } from 'vue'
import * as Convo from 'model/Convo'
import * as Peer from 'model/Peer'
import { useConvosStore } from 'store/convos'
import { useFriendsStore } from 'store/friends'
import { usePeersStore } from 'store/peers'
import { loadFriends } from 'actions'

export type Recipient = {
  peerId: Peer.Id
  peer: Peer.Peer
  /** Из недавних диалогов, а не из списка друзей */
  isRecent: boolean
}

/**
 * Список получателей для отправки и пересылки: сначала недавние диалоги
 * в порядке списка сообщений, затем друзья, которых в диалогах ещё нет
 */
export function useRecipients(query: Ref<string>) {
  const { convos, lists } = useConvosStore()
  const { peers } = usePeersStore()
  const friends = useFriendsStore()
  const selected = shallowRef(new Set<Peer.Id>())

  onMounted(loadFriends)

  const recipients = computed<Recipient[]>(() => {
    const result: Recipient[] = []
    const seen = new Set<Peer.Id>()

    const recentConvos = [...lists.main.peerIds]
      .map((peerId) => Convo.safeGet(convos, peerId))
      .sort(Convo.sorter)

    for (const convo of recentConvos) {
      seen.add(convo.id)
      result.push({
        peerId: convo.id,
        peer: Peer.safeGet(peers, convo.id),
        isRecent: true
      })
    }

    for (const friendId of friends.ids) {
      if (seen.has(friendId)) {
        continue
      }

      seen.add(friendId)
      result.push({
        peerId: friendId,
        peer: Peer.safeGet(peers, friendId),
        isRecent: false
      })
    }

    return result
  })

  const filtered = computed(() => {
    const search = query.value.trim().toLowerCase()

    if (!search) {
      return recipients.value
    }

    return recipients.value.filter(({ peer }) => (
      Peer.name(peer).toLowerCase().includes(search)
    ))
  })

  return {
    filtered,
    selected,
    friendsStatus: computed(() => friends.status),
    isSelected: (peerId: Peer.Id) => selected.value.has(peerId),
    toggle: (peerId: Peer.Id) => {
      if (selected.value.has(peerId)) {
        selected.value.delete(peerId)
      } else {
        selected.value.add(peerId)
      }

      // Set в shallowRef: обновляем вручную, чтобы не пересоздавать его на каждый клик
      selected.value = new Set(selected.value)
    }
  }
}
