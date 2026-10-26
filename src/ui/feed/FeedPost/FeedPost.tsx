import { defineComponent, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useServices } from 'services'
import * as Attach from 'model/Attach'
import * as Peer from 'model/Peer'
import * as Post from 'model/Post'
import { usePeersStore } from 'store/peers'
import { togglePostLike } from 'actions'
import { useFormatDate, useGlobalModal } from 'hooks'
import { Attaches } from 'ui/messenger/attaches/Attaches'
import { Avatar } from 'ui/ui/Avatar/Avatar'
import { ButtonText } from 'ui/ui/ButtonText/ButtonText'
import { Link } from 'ui/ui/Link/Link'
import {
  Icon16CommentOutline,
  Icon16LikeOutline,
  Icon16Repost,
  Icon20MessageArrowRightOutline,
  Icon24ViewOutline
} from 'assets/icons'
import './FeedPost.css'

type Props = {
  post: Post.Post
}

/**
 * Начиная с этой длины текст сворачивается.
 *
 * Меряем по символам, а не по реальной высоте: этого достаточно, чтобы не резать
 * короткие посты, и не требует замера layout на каждый пост в ленте
 */
const COLLAPSE_TEXT_LENGTH = 600

export const FeedPost = defineComponent<Props>((props) => {
  const { lang } = useServices()
  const { peers } = usePeersStore()
  const router = useRouter()
  const formatDate = useFormatDate()
  const { commentsModal, repostModal, shareModal } = useGlobalModal()
  const isExpanded = shallowRef(false)

  return () => {
    const { post } = props
    const author = Peer.safeGet(peers, post.authorId)
    const isCollapsible = post.text.length > COLLAPSE_TEXT_LENGTH

    const openWall = () => router.push({
      name: 'Wall',
      params: { ownerId: post.ownerId }
    })

    return (
      <article class="FeedPost">
        <div class="FeedPost__header">
          <span class="FeedPost__avatar FeedPost__clickable" onClick={openWall}>
            <Avatar peer={author} size={48} />
          </span>

          <div class="FeedPost__headerText">
            <span class="FeedPost__author FeedPost__clickable" onClick={openWall}>
              {Peer.name(author)}
            </span>

            <div class="FeedPost__meta">
              <Link href={Post.url(post)} title={lang.use('feed_post_open_in_vk')}>
                {formatDate(post.createdAt)}
              </Link>
              {post.isPinned && (
                <span class="FeedPost__badge">{lang.use('feed_post_pinned')}</span>
              )}
              {post.isAd && (
                <span class="FeedPost__badge">{lang.use('feed_post_ad')}</span>
              )}
            </div>
          </div>
        </div>

        {post.text && (
          <div
            class={[
              'FeedPost__text',
              isCollapsible && !isExpanded.value && 'FeedPost__text--collapsed'
            ]}
          >
            {post.text}
          </div>
        )}

        {isCollapsible && (
          <ButtonText
            class="FeedPost__showMore"
            onClick={() => (isExpanded.value = !isExpanded.value)}
          >
            {isExpanded.value
              ? lang.use('feed_post_show_less')
              : lang.use('feed_post_show_more')}
          </ButtonText>
        )}

        {Attach.count(post.attaches) > 0 && (
          <Attaches class="FeedPost__attaches" attaches={post.attaches} />
        )}

        {post.repost && <FeedRepost repost={post.repost} />}

        <div class="FeedPost__footer">
          <button
            type="button"
            class={['FeedPost__action', post.isLiked && 'FeedPost__action--liked']}
            onClick={() => togglePostLike(post)}
            title={lang.use(post.isLiked ? 'feed_post_unlike' : 'feed_post_like')}
          >
            <Icon16LikeOutline />
            {post.likesCount > 0 && post.likesCount}
          </button>

          <button
            type="button"
            class="FeedPost__action"
            onClick={() => commentsModal.open({ post })}
            title={lang.use('feed_post_comments')}
          >
            <Icon16CommentOutline />
            {post.commentsCount > 0 && post.commentsCount}
          </button>

          <button
            type="button"
            class={['FeedPost__action', post.isReposted && 'FeedPost__action--reposted']}
            onClick={() => repostModal.open({ post })}
            title={lang.use('feed_post_repost')}
          >
            <Icon16Repost />
            {post.repostsCount > 0 && post.repostsCount}
          </button>

          <button
            type="button"
            class="FeedPost__action"
            onClick={() => shareModal.open({ post })}
            title={lang.use('feed_post_share')}
          >
            <Icon20MessageArrowRightOutline width="16" height="16" />
          </button>

          {post.viewsCount !== undefined && (
            <span class="FeedPost__counter FeedPost__counter--views">
              <Icon24ViewOutline width="16" height="16" />
              {post.viewsCount}
            </span>
          )}
        </div>
      </article>
    )
  }
}, {
  props: ['post']
})

type RepostProps = {
  repost: Post.Repost
}

const FeedRepost = defineComponent<RepostProps>((props) => {
  const { peers } = usePeersStore()
  const router = useRouter()
  const formatDate = useFormatDate()

  return () => {
    const { repost } = props
    const author = Peer.safeGet(peers, repost.ownerId)

    const openWall = () => router.push({
      name: 'Wall',
      params: { ownerId: repost.ownerId }
    })

    return (
      <div class="FeedRepost">
        <div class="FeedRepost__header">
          <span class="FeedRepost__avatar FeedPost__clickable" onClick={openWall}>
            <Avatar peer={author} size={32} />
          </span>
          <div class="FeedRepost__headerText">
            <span class="FeedRepost__author FeedPost__clickable" onClick={openWall}>
              {Peer.name(author)}
            </span>
            {repost.createdAt > 0 && (
              <span class="FeedRepost__date">{formatDate(repost.createdAt)}</span>
            )}
          </div>
        </div>

        {repost.text && <div class="FeedRepost__text">{repost.text}</div>}

        {Attach.count(repost.attaches) > 0 && (
          <Attaches class="FeedRepost__attaches" attaches={repost.attaches} />
        )}

        {repost.repost && <FeedRepost repost={repost.repost} />}
      </div>
    )
  }
}, {
  props: ['repost']
})
