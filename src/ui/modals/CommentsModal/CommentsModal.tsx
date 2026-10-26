import { computed, defineComponent, KeyboardEvent, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { useServices } from 'services'
import * as Attach from 'model/Attach'
import * as Peer from 'model/Peer'
import * as Post from 'model/Post'
import { useCommentsStore } from 'store/comments'
import { usePeersStore } from 'store/peers'
import { createPostComment, loadPostComments } from 'actions'
import { useFormatDate, useGlobalModal } from 'hooks'
import { Attaches } from 'ui/messenger/attaches/Attaches'
import { Modal } from 'ui/modals/parts'
import { Avatar } from 'ui/ui/Avatar/Avatar'
import { Button } from 'ui/ui/Button/Button'
import { ButtonText } from 'ui/ui/ButtonText/ButtonText'
import { Input } from 'ui/ui/Input/Input'
import { LoadError } from 'ui/ui/LoadError/LoadError'
import { Spinner } from 'ui/ui/Spinner/Spinner'
import './CommentsModal.css'

export type CommentsModalParams = {
  post: Post.Post
}

export const CommentsModal = defineComponent<CommentsModalParams>((params) => {
  const { lang } = useServices()
  const { commentsModal } = useGlobalModal()
  const commentsStore = useCommentsStore()
  const message = shallowRef('')
  const thread = commentsStore.getThread(Post.key(params.post))

  /**
   * wall.getComments отдает can_post не всегда, поэтому опираемся в первую очередь
   * на признак из самой записи
   */
  const canPost = computed(() => params.post.canComment || thread.canPost)

  onMounted(() => {
    if (thread.comments.length === 0 && thread.status !== 'complete') {
      loadPostComments(params.post)
    }
  })

  const send = async () => {
    const sent = await createPostComment(params.post, message.value)

    if (sent) {
      message.value = ''
    }
  }

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && message.value.trim()) {
      send()
    }
  }

  return () => (
    <Modal
      title={lang.use('comments_title')}
      opened={commentsModal.opened}
      onClose={commentsModal.close}
      onVisibilityChange={commentsModal.onVisibilityChange}
      class="CommentsModal"
      footerLeftContent={
        canPost.value
          ? (
            <Input
              class="CommentsModal__input"
              placeholder={lang.use('comments_placeholder')}
              value={message.value}
              onInput={(event) => (message.value = event.target.value)}
              onKeydown={onKeydown}
              disabled={thread.sendStatus === 'sending'}
              autofocus
              inLayer
            />
          )
          : undefined
      }
      buttons={
        canPost.value
          ? (
            <Button
              onClick={send}
              disabled={!message.value.trim() || thread.sendStatus === 'sending'}
              loading={thread.sendStatus === 'sending'}
            >
              {lang.use('comments_send')}
            </Button>
          )
          : undefined
      }
    >
      {thread.comments.length === 0 && thread.status === 'complete' && (
        <div class="CommentsModal__placeholder">{lang.use('comments_empty')}</div>
      )}

      {thread.status === 'hasMore' && thread.comments.length > 0 && (
        <ButtonText
          class="CommentsModal__loadMore"
          onClick={() => loadPostComments(params.post)}
        >
          {lang.use('comments_load_more')}
        </ButtonText>
      )}

      {thread.comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}

      {thread.status === 'loading' && <Spinner size="regular" class="CommentsModal__spinner" />}

      {thread.status === 'error' && (
        <LoadError onRetry={() => loadPostComments(params.post)} />
      )}

      {thread.sendStatus === 'error' && (
        <div class="CommentsModal__sendError">{lang.use('comments_send_error')}</div>
      )}
    </Modal>
  )
}, {
  props: ['post']
})

type CommentItemProps = {
  comment: Post.Comment
  isReply?: boolean
}

const CommentItem = defineComponent<CommentItemProps>((props) => {
  const { lang } = useServices()
  const { peers } = usePeersStore()
  const router = useRouter()
  const { commentsModal } = useGlobalModal()
  const formatDate = useFormatDate()

  return () => {
    const { comment } = props
    const author = Peer.safeGet(peers, comment.authorId)
    const notLoadedReplies = comment.threadCount - comment.thread.length

    const openWall = () => {
      commentsModal.close()
      router.push({ name: 'Wall', params: { ownerId: comment.authorId } })
    }

    return (
      <div class={['Comment', props.isReply && 'Comment--reply']}>
        <span class="Comment__avatar" onClick={openWall}>
          <Avatar peer={author} size={32} />
        </span>

        <div class="Comment__body">
          <div class="Comment__bubble">
            <span class="Comment__author" onClick={openWall}>{Peer.name(author)}</span>
            {comment.text && <div class="Comment__text">{comment.text}</div>}

            {Attach.count(comment.attaches) > 0 && (
              <Attaches class="Comment__attaches" attaches={comment.attaches} />
            )}
          </div>

          <div class="Comment__meta">
            <span>{formatDate(comment.createdAt)}</span>
            {comment.likesCount > 0 && (
              <span>{lang.usePlural('comments_likes_count', comment.likesCount)}</span>
            )}
          </div>

          {comment.thread.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply />
          ))}

          {notLoadedReplies > 0 && (
            <div class="Comment__hiddenReplies">
              {lang.usePlural('comments_hidden_replies', notLoadedReplies)}
            </div>
          )}
        </div>
      </div>
    )
  }
}, {
  props: ['comment', 'isReply']
})
