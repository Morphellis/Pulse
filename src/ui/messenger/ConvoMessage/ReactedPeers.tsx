import { defineComponent, onMounted, shallowRef } from 'vue'
import { useServices } from 'services'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'
import { usePeersStore } from 'store/peers'
import { insertPeers } from 'actions'
import { PEER_FIELDS } from 'misc/constants'
import { Avatar } from 'ui/ui/Avatar/Avatar'
import { Spinner } from 'ui/ui/Spinner/Spinner'
import './ReactedPeers.css'

type Props = {
  message: Message.Normal
  /** Показываем поставивших только эту реакцию */
  reactionId: number
}

/**
 * Кто поставил реакцию.
 *
 * Список приходящий вместе с сообщением обрезан, поэтому состав запрашиваем
 * отдельно и только когда его собрались показать
 */
/**
 * Поппер размонтирует список, как только курсор ушёл, поэтому ответ кешируем:
 * иначе каждое наведение на одну и ту же реакцию — новый запрос.
 *
 * В ключ входит счётчик: изменился он — состав тоже изменился, и список надо
 * спросить заново.
 *
 * Запись живёт ограниченное время: за долгую сессию наведений на разные
 * реакции разных сообщений набралось бы много никогда не удаляемых записей
 */
const CACHE_TTL_MS = 5 * 60 * 1000

type CacheEntry = {
  request: Promise<Peer.UserId[]>
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

export const ReactedPeers = defineComponent<Props>((props) => {
  const { lang, api } = useServices()
  const { peers } = usePeersStore()

  const userIds = shallowRef<Peer.UserId[]>([])
  const status = shallowRef<'loading' | 'loaded' | 'error'>('loading')

  const load = (): Promise<Peer.UserId[]> => {
    const { message, reactionId } = props
    const count = message.reactions?.find(({ id }) => id === reactionId)?.count ?? 0
    const key = `${Message.key(message)}_${reactionId}_${count}`
    const cached = cache.get(key)

    if (cached && Date.now() < cached.expiresAt) {
      return cached.request
    }

    const request = api.fetch('messages.getReactedPeers', {
      peer_id: message.peerId,
      cmid: message.cmid,
      reaction_id: reactionId,
      extended: 1,
      fields: PEER_FIELDS
    }).then((response) => {
      insertPeers({
        profiles: response.profiles ?? [],
        groups: response.groups ?? []
      })

      return response.reactions
        .filter((reaction) => reaction.reaction_id === reactionId)
        .map((reaction) => Peer.resolveRealId(reaction.user_id, 'User'))
    })

    const entry: CacheEntry = { request, expiresAt: Date.now() + CACHE_TTL_MS }
    cache.set(key, entry)
    request.catch(() => cache.delete(key))

    // Если запись не запросят повторно, она не должна остаться в памяти навсегда.
    // Сверяем сам объект записи: за это время по тому же ключу могла появиться новая
    window.setTimeout(() => {
      if (cache.get(key) === entry) {
        cache.delete(key)
      }
    }, CACHE_TTL_MS)

    return request
  }

  onMounted(async () => {
    try {
      userIds.value = await load()
      status.value = 'loaded'
    } catch (error) {
      console.warn('[ReactedPeers] loading error', error)
      status.value = 'error'
    }
  })

  return () => {
    if (status.value === 'loading') {
      return (
        <div class="ReactedPeers ReactedPeers--state">
          <Spinner size="small" />
        </div>
      )
    }

    if (status.value === 'error') {
      return (
        <div class="ReactedPeers ReactedPeers--state">
          {lang.use('me_reactions_peers_error')}
        </div>
      )
    }

    if (userIds.value.length === 0) {
      return (
        <div class="ReactedPeers ReactedPeers--state">
          {lang.use('me_reactions_peers_empty')}
        </div>
      )
    }

    return (
      <div class="ReactedPeers">
        {userIds.value.map((userId) => {
          const peer = Peer.safeGet(peers, userId)

          return (
            <div class="ReactedPeers__item" key={userId}>
              <Avatar peer={peer} size={24} />
              <span class="ReactedPeers__name">{Peer.name(peer)}</span>
            </div>
          )
        })}
      </div>
    )
  }
}, {
  props: ['message', 'reactionId']
})
