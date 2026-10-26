import { defineComponent, shallowRef } from 'vue'
import { useServices } from 'services'
import * as Post from 'model/Post'
import { sharePost } from 'actions'
import { useGlobalModal, useRecipients } from 'hooks'
import { Modal } from 'ui/modals/parts'
import { Button } from 'ui/ui/Button/Button'
import { Input } from 'ui/ui/Input/Input'
import { RecipientList } from 'ui/ui/RecipientList/RecipientList'
import './ShareModal.css'

export type ShareModalParams = {
  post: Post.Post
}

export const ShareModal = defineComponent<ShareModalParams>((params) => {
  const { lang } = useServices()
  const { shareModal } = useGlobalModal()

  const query = shallowRef('')
  const message = shallowRef('')
  const status = shallowRef<'idle' | 'sending' | 'error'>('idle')
  const failedCount = shallowRef(0)

  const recipients = useRecipients(query)

  const submit = async () => {
    if (recipients.selected.value.size === 0) {
      return
    }

    status.value = 'sending'

    const { failed } = await sharePost(
      params.post,
      [...recipients.selected.value],
      message.value
    )

    if (failed.length === 0) {
      shareModal.close()
      return
    }

    failedCount.value = failed.length
    status.value = 'error'
  }

  return () => (
    <Modal
      title={lang.use('share_title')}
      opened={shareModal.opened}
      onClose={shareModal.close}
      onVisibilityChange={shareModal.onVisibilityChange}
      class="ShareModal"
      buttons={
        <Button
          onClick={submit}
          disabled={recipients.selected.value.size === 0 || status.value === 'sending'}
          loading={status.value === 'sending'}
        >
          {recipients.selected.value.size > 0
            ? lang.use('share_submit_count', { count: recipients.selected.value.size })
            : lang.use('share_submit')}
        </Button>
      }
    >
      <Input
        class="ShareModal__search"
        placeholder={lang.use('share_search_placeholder')}
        value={query.value}
        onInput={(event) => (query.value = event.target.value)}
        autofocus
        inLayer
      />

      <RecipientList recipients={recipients} />

      <Input
        class="ShareModal__message"
        placeholder={lang.use('share_message_placeholder')}
        value={message.value}
        onInput={(event) => (message.value = event.target.value)}
        disabled={status.value === 'sending'}
        inLayer
      />

      {status.value === 'error' && (
        <div class="ShareModal__error">
          {lang.usePlural('share_error_count', failedCount.value)}
        </div>
      )}
    </Modal>
  )
}, {
  props: ['post']
})
