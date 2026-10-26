import { defineComponent, shallowRef } from 'vue'
import { useServices } from 'services'
import * as Peer from 'model/Peer'
import * as Post from 'model/Post'
import { usePeersStore } from 'store/peers'
import { repostPost } from 'actions'
import { useGlobalModal } from 'hooks'
import { Modal } from 'ui/modals/parts'
import { Button } from 'ui/ui/Button/Button'
import { Input } from 'ui/ui/Input/Input'
import './RepostModal.css'

export type RepostModalParams = {
  post: Post.Post
}

/**
 * Репост публикует запись на стену пользователя, поэтому спрашиваем подтверждение,
 * а не делаем его сразу по клику на счетчик
 */
export const RepostModal = defineComponent<RepostModalParams>((params) => {
  const { lang } = useServices()
  const { peers } = usePeersStore()
  const { repostModal } = useGlobalModal()
  const message = shallowRef('')
  const status = shallowRef<'idle' | 'sending' | 'error'>('idle')

  const submit = async () => {
    status.value = 'sending'

    try {
      await repostPost(params.post, message.value)
      repostModal.close()
    } catch (err) {
      console.warn('[RepostModal] repost error', err)
      status.value = 'error'
    }
  }

  return () => {
    const author = Peer.safeGet(peers, params.post.authorId)

    return (
      <Modal
        title={lang.use('repost_title')}
        opened={repostModal.opened}
        onClose={repostModal.close}
        onVisibilityChange={repostModal.onVisibilityChange}
        class="RepostModal"
        buttons={[
          <Button
            onClick={submit}
            disabled={status.value === 'sending'}
            loading={status.value === 'sending'}
          >
            {lang.use('repost_submit')}
          </Button>,
          <Button mode="secondary" onClick={repostModal.close}>
            {lang.use('modal_close_label')}
          </Button>
        ]}
      >
        <div class="RepostModal__description">
          {lang.use('repost_description', { author: Peer.name(author) })}
        </div>

        <Input
          class="RepostModal__input"
          placeholder={lang.use('repost_comment_placeholder')}
          value={message.value}
          onInput={(event) => (message.value = event.target.value)}
          disabled={status.value === 'sending'}
          autofocus
          inLayer
        />

        {status.value === 'error' && (
          <div class="RepostModal__error">{lang.use('repost_error')}</div>
        )}
      </Modal>
    )
  }
}, {
  props: ['post']
})
