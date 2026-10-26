import { computed, defineComponent, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useServices } from 'services'
import { GroupsGroup } from 'services/contracts/api/objects/GroupsGroup'
import { UsersUser } from 'services/contracts/api/objects/UsersUser'
import * as Peer from 'model/Peer'
import { useDetectiveStore } from 'store/detective'
import { usePeersStore } from 'store/peers'
import { DOSSIER_USER_FIELDS, isUserObject } from 'actions/detective/common'
import { platformName, startOnlineTracker } from 'actions/detective/onlineTracker'
import { estimateRegistrationDate } from 'actions/detective/registrationDate'
import { useFormatDate, useGlobalModal } from 'hooks'
import { Modal } from 'ui/modals/parts'
import { Avatar } from 'ui/ui/Avatar/Avatar'
import { Button } from 'ui/ui/Button/Button'
import { Link } from 'ui/ui/Link/Link'
import { Spinner } from 'ui/ui/Spinner/Spinner'
import './PeerInfoModal.css'

export type PeerInfoModalParams = {
  peerId: Peer.Id
}

/**
 * Карточка собеседника: открывается кликом по аватарке в списке диалогов
 * и по шапке переписки. Показывает то, что нужно сразу — статус, идентификатор
 * страницы, контакты — а за записями и друзьями отправляет на страницу человека
 */
export const PeerInfoModal = defineComponent<PeerInfoModalParams>((params) => {
  const { lang, api } = useServices()
  const router = useRouter()
  const { peers } = usePeersStore()
  const { peerInfoModal } = useGlobalModal()
  const detective = useDetectiveStore()
  const formatDate = useFormatDate()

  const peer = computed(() => peers.get(params.peerId))
  /** Полная карточка с полями, которых нет в сторе: они запрашиваются отдельно */
  const details = shallowRef<UsersUser | null>(null)
  const group = shallowRef<GroupsGroup | null>(null)
  const isLoading = shallowRef(false)
  const copied = shallowRef(false)

  const realId = computed(() => Peer.toRealId(params.peerId))

  onMounted(async () => {
    if (Peer.isChatPeerId(params.peerId)) {
      return
    }

    isLoading.value = true

    try {
      if (Peer.isUserPeerId(params.peerId)) {
        const users = await api.fetch('users.get', {
          user_ids: realId.value,
          fields: DOSSIER_USER_FIELDS
        })
        details.value = users.find(isUserObject) ?? null
      } else {
        const response = await api.fetch('groups.getById', {
          group_ids: realId.value,
          fields: 'members_count,description,screen_name,photo_100'
        })
        group.value = response.groups[0] ?? null
      }
    } catch (error) {
      console.warn('[PeerInfoModal] не удалось загрузить карточку', error)
    } finally {
      isLoading.value = false
    }
  })

  const isWatched = computed(() => detective.watched.some((item) => item.id === realId.value))

  function copyId() {
    navigator.clipboard.writeText(String(realId.value)).then(() => {
      copied.value = true
      window.setTimeout(() => (copied.value = false), 2000)
    }).catch((error: unknown) => {
      console.warn('[PeerInfoModal] не удалось скопировать id', error)
    })
  }

  function toggleWatch() {
    if (isWatched.value) {
      detective.removeWatched(realId.value)
      return
    }

    detective.addWatched(realId.value)

    if (detective.trackerEnabled) {
      startOnlineTracker()
    }
  }

  function openPage() {
    peerInfoModal.close()

    if (Peer.isUserPeerId(params.peerId)) {
      router.push({ name: 'Profile', params: { userId: params.peerId } })
    } else if (Peer.isGroupPeerId(params.peerId)) {
      router.push({ name: 'Wall', params: { ownerId: params.peerId } })
    }
  }

  function openDossier() {
    peerInfoModal.close()
    router.push({ name: 'Detective', query: { target: String(realId.value) } })
  }

  return () => {
    const currentPeer = peer.value
    const user = details.value

    if (!currentPeer) {
      return (
        <Modal
          title={lang.use('peer_info_title')}
          opened={peerInfoModal.opened}
          onClose={peerInfoModal.close}
          onVisibilityChange={peerInfoModal.onVisibilityChange}
          class="PeerInfoModal"
        >
          <Spinner size="regular" />
        </Modal>
      )
    }

    const isUser = currentPeer.kind === 'User'
    const status = isUser
      ? currentPeer.onlineInfo.isOnline
        ? lang.use('me_user_online')
        : currentPeer.onlineInfo.lastSeen
          ? formatDate(currentPeer.onlineInfo.lastSeen)
          : lang.use('me_user_was_online_a_long_time_ago')
      : undefined

    const registration = isUser ? estimateRegistrationDate(realId.value) : null

    return (
      <Modal
        title={lang.use('peer_info_title')}
        opened={peerInfoModal.opened}
        onClose={peerInfoModal.close}
        onVisibilityChange={peerInfoModal.onVisibilityChange}
        class="PeerInfoModal"
        buttons={[
          !Peer.isChatPeerId(params.peerId) && (
            <Button onClick={openPage}>{lang.use('peer_info_open_page')}</Button>
          ),
          <Button mode="secondary" onClick={peerInfoModal.close}>
            {lang.use('modal_close_label')}
          </Button>
        ].filter(Boolean)}
      >
        <div class="PeerInfoModal__head">
          <Avatar peer={currentPeer} size={80} />

          <div class="PeerInfoModal__identity">
            <span class="PeerInfoModal__name">{Peer.name(currentPeer)}</span>
            {status && (
              <span
                class={[
                  'PeerInfoModal__status',
                  isUser && currentPeer.onlineInfo.isOnline && 'PeerInfoModal__status--online'
                ]}
              >
                {status}
              </span>
            )}
            <Link class="PeerInfoModal__link" href={Peer.url(currentPeer)}>
              {lang.use('peer_info_open_in_vk')}
            </Link>
          </div>
        </div>

        <div class="PeerInfoModal__rows">
          <InfoRow label={lang.use('peer_info_id')}>
            <span class="PeerInfoModal__id">{realId.value}</span>
            <Button mode="tertiary" size="small" onClick={copyId}>
              {copied.value ? lang.use('profile_id_copied') : lang.use('profile_id_copy')}
            </Button>
          </InfoRow>

          {isLoading.value && <Spinner size="small" />}

          {user?.domain && (
            <InfoRow label={lang.use('peer_info_domain')}>@{user.domain}</InfoRow>
          )}
          {user?.bdate && (
            <InfoRow label={lang.use('peer_info_bdate')}>{user.bdate}</InfoRow>
          )}
          {(user?.city?.title ?? user?.home_town) && (
            <InfoRow label={lang.use('peer_info_city')}>
              {[user.city?.title, user.country?.title].filter(Boolean).join(', ') || user.home_town}
            </InfoRow>
          )}
          {user?.mobile_phone && (
            <InfoRow label={lang.use('peer_info_phone')}>{user.mobile_phone}</InfoRow>
          )}
          {user?.status && (
            <InfoRow label={lang.use('peer_info_status')}>{user.status}</InfoRow>
          )}
          {user?.last_seen?.time && (
            <InfoRow label={lang.use('peer_info_last_seen')}>
              {formatDate(user.last_seen.time * 1000)}
              {', '}
              {platformName(user.last_seen.platform ?? 0)}
            </InfoRow>
          )}
          {registration && (
            <InfoRow label={lang.use('peer_info_registered')}>
              {lang.use('peer_info_registered_value', {
                date: new Date(registration.at).toLocaleString('ru', {
                  month: 'long',
                  year: 'numeric'
                })
              })}
            </InfoRow>
          )}
          {user?.counters && (
            <InfoRow label={lang.use('peer_info_counters')}>
              {[
                user.counters.friends !== undefined && `друзей: ${user.counters.friends}`,
                user.counters.followers !== undefined && `подписчиков: ${user.counters.followers}`,
                user.counters.photos !== undefined && `фото: ${user.counters.photos}`
              ].filter(Boolean).join(' · ')}
            </InfoRow>
          )}
          {user?.blacklisted === 1 && (
            <div class="PeerInfoModal__warning">{lang.use('peer_info_blacklisted')}</div>
          )}
          {group.value?.members_count !== undefined && (
            <InfoRow label={lang.use('peer_info_members')}>
              {group.value.members_count.toLocaleString('ru')}
            </InfoRow>
          )}
        </div>

        {isUser && (
          <div class="PeerInfoModal__actions">
            <Button mode="secondary" size="small" onClick={openDossier}>
              {lang.use('peer_info_dossier')}
            </Button>
            <Button
              mode={isWatched.value ? 'destructive' : 'secondary'}
              size="small"
              onClick={toggleWatch}
            >
              {isWatched.value ? lang.use('profile_unwatch') : lang.use('profile_watch')}
            </Button>
          </div>
        )}
      </Modal>
    )
  }
}, {
  props: ['peerId']
})

type InfoRowProps = {
  label: string
}

const InfoRow = defineComponent<InfoRowProps>((props, { slots }) => {
  return () => (
    <div class="PeerInfoModal__row">
      <span class="PeerInfoModal__rowLabel">{props.label}</span>
      <span class="PeerInfoModal__rowValue">{slots.default?.()}</span>
    </div>
  )
}, {
  props: ['label']
})
