import { computed, defineComponent, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useServices } from 'services'
import * as Peer from 'model/Peer'
import * as Post from 'model/Post'
import { usePeersStore } from 'store/peers'
import { defaultWall, useWallStore } from 'store/wall'
import { loadMoreWall } from 'actions'
import { FeedPost } from 'ui/feed/FeedPost/FeedPost'
import { PostSkeleton } from 'ui/feed/PostSkeleton/PostSkeleton'
import { Avatar } from 'ui/ui/Avatar/Avatar'
import { ButtonIcon } from 'ui/ui/ButtonIcon/ButtonIcon'
import { IntersectionWrapper } from 'ui/ui/IntersectionWrapper/IntersectionWrapper'
import { Link } from 'ui/ui/Link/Link'
import { LoadError } from 'ui/ui/LoadError/LoadError'
import { Spinner } from 'ui/ui/Spinner/Spinner'
import { Icon24ChevronCompactLeft, Icon24LinkExternalOutline } from 'assets/icons'
import './WallView.css'

export const WallView = defineComponent(() => {
  const { lang } = useServices()
  const route = useRoute('Wall')
  const router = useRouter()
  const { peers } = usePeersStore()
  const wallStore = useWallStore()

  const ownerId = computed(() => Peer.resolveOwnerId(Number(route.params.ownerId)))

  // getWall создает запись в сторе, поэтому вызываем его во watch, а не в computed:
  // запись в реактивный стейт во время вычисления computed приводит к тому,
  // что computed сразу же считается устаревшим
  watch(ownerId, (id) => wallStore.getWall(id), { immediate: true })

  const wall = computed(() => wallStore.walls.get(ownerId.value) ?? defaultWall())

  return () => {
    const owner = Peer.safeGet(peers, ownerId.value)
    const currentWall = wall.value

    return (
      <div class="WallView">
        <div class="WallView__header">
          <ButtonIcon
            class="WallView__back"
            onClick={() => router.back()}
            title={lang.use('wall_back')}
            icon={<Icon24ChevronCompactLeft color="var(--vkui--color_icon_secondary)" />}
            withHoverBackground
          />

          <Avatar class="WallView__avatar" peer={owner} size={32} />

          <div class="WallView__headerText">
            <span class="WallView__name">{Peer.name(owner)}</span>
            {currentWall.totalCount > 0 && (
              <span class="WallView__count">
                {lang.usePlural('wall_posts_count', currentWall.totalCount)}
              </span>
            )}
          </div>

          <Link
            class="WallView__external"
            href={Peer.url(owner)}
            title={lang.use('wall_open_in_vk')}
          >
            <Icon24LinkExternalOutline
              width="20"
              color="var(--vkui--color_icon_secondary)"
            />
          </Link>
        </div>

        <div class="WallView__list" key={ownerId.value}>
          {currentWall.posts.map((post) => (
            <FeedPost key={Post.key(post)} post={post} />
          ))}

          {currentWall.posts.length === 0 && currentWall.status === 'complete' && (
            <div class="WallView__placeholder">{lang.use('wall_empty')}</div>
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
                ? <PostSkeleton count={3} />
                : <Spinner size="regular" class="WallView__spinner" />}
            </IntersectionWrapper>
          )}
        </div>
      </div>
    )
  }
})
