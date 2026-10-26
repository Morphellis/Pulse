import { computed, defineComponent, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useServices } from 'services'
import * as Peer from 'model/Peer'
import * as Post from 'model/Post'
import { useDetectiveStore } from 'store/detective'
import { useFriendsStore } from 'store/friends'
import { usePeersStore } from 'store/peers'
import { defaultWall, useWallStore } from 'store/wall'
import { loadFriends, loadMoreWall } from 'actions'
import { SHORT_USER_FIELDS } from 'actions/detective/common'
import { loadProfileUser } from 'actions/detective/loadProfile'
import { startOnlineTracker } from 'actions/detective/onlineTracker'
import { useViewer } from 'hooks'
import { FeedPost } from 'ui/feed/FeedPost/FeedPost'
import { PostSkeleton } from 'ui/feed/PostSkeleton/PostSkeleton'
import { Avatar } from 'ui/ui/Avatar/Avatar'
import { Button } from 'ui/ui/Button/Button'
import { IntersectionWrapper } from 'ui/ui/IntersectionWrapper/IntersectionWrapper'
import { Link } from 'ui/ui/Link/Link'
import { LoadError } from 'ui/ui/LoadError/LoadError'
import { Skeleton } from 'ui/ui/Skeleton/Skeleton'
import { Spinner } from 'ui/ui/Spinner/Spinner'
import './ProfileView.css'

/** Сколько друзей показать в превью под шапкой */
const FRIENDS_PREVIEW_COUNT = 8

export const ProfileView = defineComponent(() => {
  const { lang, api } = useServices()
  const route = useRoute('Profile')
  const router = useRouter()
  const viewer = useViewer()
  const { peers } = usePeersStore()
  const ownFriends = useFriendsStore()
  const wallStore = useWallStore()
  const detective = useDetectiveStore()

  /** Без параметра в адресе открыта своя страница */
  const userId = computed(() => {
    const raw = route.params.userId
    return raw ? Peer.resolveRealId(Number(raw), 'User') : viewer.id
  })
  const isOwn = computed(() => userId.value === viewer.id)
  const ownerId = computed(() => Peer.resolveOwnerId(userId.value))

  const user = computed(() => peers.get(userId.value))
  const isUserLoading = shallowRef(false)
  const copied = shallowRef(false)

  /** Друзья чужой страницы: свои лежат в общем сторе, чужие грузим на месте */
  const otherFriends = shallowRef<Peer.User[]>([])
  const otherFriendsStatus = shallowRef<'idle' | 'loading' | 'loaded' | 'closed'>('idle')
  const otherFriendsCount = shallowRef<number | null>(null)

  watch(userId, async (id) => {
    wallStore.getWall(Peer.resolveOwnerId(id))
    copied.value = false

    if (isOwn.value) {
      loadFriends()
      return
    }

    if (!peers.has(id)) {
      isUserLoading.value = true
      await loadProfileUser(id)
      isUserLoading.value = false
    }

    otherFriends.value = []
    otherFriendsCount.value = null
    otherFriendsStatus.value = 'loading'

    try {
      const response = await api.fetch('friends.get', {
        user_id: Peer.toRealId(id),
        count: FRIENDS_PREVIEW_COUNT,
        fields: SHORT_USER_FIELDS
      })

      otherFriendsCount.value = response.count
      const users = response.items.filter((item) => typeof item === 'object')
      otherFriends.value = users.map((apiUser) => ({
        kind: 'User' as const,
        id: Peer.resolveRealId(apiUser.id, 'User'),
        firstName: apiUser.first_name,
        firstNameAcc: apiUser.first_name_acc ?? apiUser.first_name,
        lastName: apiUser.last_name,
        lastNameAcc: apiUser.last_name_acc ?? apiUser.last_name,
        photo50: apiUser.photo_50,
        photo100: apiUser.photo_100,
        gender: apiUser.sex === 1 ? 'female' : apiUser.sex === 2 ? 'male' : 'unknown',
        onlineInfo: { visible: false }
      }))
      otherFriendsStatus.value = 'loaded'
    } catch {
      // Закрытый профиль или ограничение приватности — друзей просто не показываем
      otherFriendsStatus.value = 'closed'
    }
  }, { immediate: true })

  const wall = computed(() => wallStore.walls.get(ownerId.value) ?? defaultWall())

  const friendsPreview = computed<Peer.Peer[]>(() => (
    isOwn.value
      ? ownFriends.ids.slice(0, FRIENDS_PREVIEW_COUNT).map((id) => Peer.safeGet(peers, id))
      : otherFriends.value
  ))

  const friendsStatus = computed(() => (
    isOwn.value ? ownFriends.status : otherFriendsStatus.value
  ))

  /** Сколько друзей показать в счётчике: у себя из общего стора, у чужого из ответа */
  const friendsCount = computed(() => {
    if (isOwn.value) {
      return ownFriends.status === 'loaded' ? ownFriends.ids.length : null
    }

    return otherFriendsCount.value
  })

  const isWatched = computed(() => (
    detective.watched.some((item) => item.id === Peer.toRealId(userId.value))
  ))

  function copyId() {
    navigator.clipboard.writeText(String(Peer.toRealId(userId.value))).then(() => {
      copied.value = true
      window.setTimeout(() => (copied.value = false), 2000)
    }).catch((error: unknown) => {
      console.warn('[ProfileView] не удалось скопировать id', error)
    })
  }

  function toggleWatch() {
    const realId = Peer.toRealId(userId.value)

    if (isWatched.value) {
      detective.removeWatched(realId)
      return
    }

    detective.addWatched(realId)

    if (detective.trackerEnabled) {
      startOnlineTracker()
    }
  }

  return () => {
    const currentWall = wall.value
    const peer = user.value

    if (peer?.kind !== 'User') {
      return (
        <div class="ProfileView">
          <div class="ProfileView__scroll">
            <div class="ProfileView__card">
              <div class="ProfileView__cover" />
              <div class="ProfileView__identity">
                <Skeleton circle width={96} height={96} />
                <Skeleton width={180} height={20} />
              </div>
            </div>
            {isUserLoading.value || (
              <div class="ProfileView__placeholder">
                {lang.use('profile_not_found')}
              </div>
            )}
          </div>
        </div>
      )
    }

    const { isOnline } = peer.onlineInfo
    const realId = Peer.toRealId(peer.id)

    return (
      <div class="ProfileView">
        <div class="ProfileView__scroll">
          <div class="ProfileView__card">
            <div class="ProfileView__cover" />

            <div class="ProfileView__identity">
              <Avatar class="ProfileView__avatar" peer={peer} size={96} />

              <div class="ProfileView__names">
                <h1 class="ProfileView__name">{Peer.name(peer)}</h1>
                <span class={['ProfileView__status', isOnline && 'ProfileView__status--online']}>
                  {isOnline ? lang.use('profile_online') : lang.use('profile_offline')}
                </span>
              </div>

              <Link class="ProfileView__external" href={Peer.url(peer)}>
                <Button mode="secondary" size="small">
                  {lang.use('profile_open_in_vk')}
                </Button>
              </Link>
            </div>

            <div class="ProfileView__idRow">
              <span class="ProfileView__idLabel">{lang.use('profile_id')}</span>
              <span class="ProfileView__idValue">{realId}</span>
              <Button mode="tertiary" size="small" onClick={copyId}>
                {copied.value ? lang.use('profile_id_copied') : lang.use('profile_id_copy')}
              </Button>
            </div>

            <div class="ProfileView__actions">
              {!isOwn.value && (
                <Button
                  mode="secondary"
                  size="small"
                  onClick={() => router.push({
                    name: 'Convo',
                    params: { peerId: peer.id }
                  })}
                >
                  {lang.use('profile_write')}
                </Button>
              )}

              <Button
                mode="secondary"
                size="small"
                onClick={() => router.push({
                  name: 'Detective',
                  query: { target: String(realId) }
                })}
              >
                {lang.use('profile_open_dossier')}
              </Button>

              <Button
                mode={isWatched.value ? 'destructive' : 'secondary'}
                size="small"
                onClick={toggleWatch}
              >
                {isWatched.value ? lang.use('profile_unwatch') : lang.use('profile_watch')}
              </Button>
            </div>

            <div class="ProfileView__stats">
              <div class="ProfileView__stat">
                <span class="ProfileView__statValue">
                  {friendsCount.value ?? '—'}
                </span>
                <span class="ProfileView__statLabel">{lang.use('profile_friends')}</span>
              </div>
              <div class="ProfileView__stat">
                <span class="ProfileView__statValue">
                  {currentWall.status === 'hasMore' && currentWall.posts.length === 0
                    ? '—'
                    : currentWall.totalCount}
                </span>
                <span class="ProfileView__statLabel">{lang.use('profile_posts')}</span>
              </div>
            </div>
          </div>

          <div class="ProfileView__card">
            <span class="ProfileView__sectionTitle">{lang.use('profile_friends')}</span>

            {friendsStatus.value === 'loading' && (
              <div class="ProfileView__friends">
                {Array.from({ length: FRIENDS_PREVIEW_COUNT }, (_, index) => (
                  <div class="ProfileFriend" key={index}>
                    <Skeleton circle width={56} height={56} />
                    <Skeleton width={52} height={10} />
                  </div>
                ))}
              </div>
            )}

            {friendsStatus.value === 'closed' && (
              <div class="ProfileView__placeholder">{lang.use('profile_friends_hidden')}</div>
            )}

            {friendsStatus.value === 'loaded' && friendsPreview.value.length === 0 && (
              <div class="ProfileView__placeholder">{lang.use('profile_no_friends')}</div>
            )}

            {friendsPreview.value.length > 0 && (
              <div class="ProfileView__friends">
                {friendsPreview.value.map((friend) => (
                  <button
                    type="button"
                    class="ProfileFriend"
                    key={friend.id}
                    onClick={() => router.push({
                      name: 'Profile',
                      params: { userId: friend.id as Peer.UserId }
                    })}
                  >
                    <Avatar peer={friend} size={56} />
                    <span class="ProfileFriend__name">{Peer.firstName(friend)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div class="ProfileView__posts">
            <span class="ProfileView__sectionTitle">
              {isOwn.value ? lang.use('profile_my_posts') : lang.use('profile_posts')}
            </span>

            {currentWall.posts.map((post) => (
              <FeedPost key={Post.key(post)} post={post} />
            ))}

            {currentWall.posts.length === 0 && currentWall.status === 'complete' && (
              <div class="ProfileView__placeholder">
                {isOwn.value ? lang.use('profile_no_posts') : lang.use('wall_empty')}
              </div>
            )}

            {currentWall.status === 'error' && (
              <LoadError onRetry={() => loadMoreWall(ownerId.value)} />
            )}

            {(currentWall.status === 'loading' || currentWall.status === 'hasMore') && (
              <IntersectionWrapper
                onIntersect={() => loadMoreWall(ownerId.value)}
                key={currentWall.posts.length}
              >
                {currentWall.posts.length === 0
                  ? <PostSkeleton count={2} />
                  : <Spinner size="regular" class="ProfileView__spinner" />}
              </IntersectionWrapper>
            )}
          </div>
        </div>
      </div>
    )
  }
})
