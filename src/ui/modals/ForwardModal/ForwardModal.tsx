import { defineComponent, shallowRef } from 'vue'
import { useServices } from 'services'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'
import { useMessageSelectionStore } from 'store/messageSelection'
import { forwardMessages } from 'actions'
import { useGlobalModal, useRecipients } from 'hooks'
import { Modal } from 'ui/modals/parts'
import { Button } from 'ui/ui/Button/Button'
import { Input } from 'ui/ui/Input/Input'
import { RecipientList } from 'ui/ui/RecipientList/RecipientList'
import './ForwardModal.css'

export type ForwardModalParams = {
  fromPeerId: Peer.Id
  cmids: Message.Cmid[]
}

export const ForwardModal = defineComponent<ForwardModalParams>((params) => {
  const { lang } = useServices()
  const { forwardModal } = useGlobalModal()
  const selection = useMessageSelectionStore()

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

    const { failed } = await forwardMessages(
      params.fromPeerId,
      params.cmids,
      [...recipients.selected.value],
      message.value
    )

    if (failed.length === 0) {
      // Пересылка удалась - выделение больше не нужно
      selection.reset()
      forwardModal.close()
      return
    }

    failedCount.value = failed.length
    status.value = 'error'
  }

  return () => (
    <Modal
      title={lang.usePlural('forward_title', params.cmids.length)}
      opened={forwardModal.opened}
      onClose={forwardModal.close}
      onVisibilityChange={forwardModal.onVisibilityChange}
      class="ForwardModal"
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
        class="ForwardModal__search"
        placeholder={lang.use('share_search_placeholder')}
        value={query.value}
        onInput={(event) => (query.value = event.target.value)}
        autofocus
        inLayer
      />

      <RecipientList recipients={recipients} />

      <Input
        class="ForwardModal__message"
        placeholder={lang.use('share_message_placeholder')}
        value={message.value}
        onInput={(event) => (message.value = event.target.value)}
        disabled={status.value === 'sending'}
        inLayer
      />

      {status.value === 'error' && (
        <div class="ForwardModal__error">
          {lang.usePlural('share_error_count', failedCount.value)}
        </div>
      )}
    </Modal>
  )
}, {
  props: ['fromPeerId', 'cmids']
})
