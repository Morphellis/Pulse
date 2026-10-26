import { defineComponent, shallowRef } from 'vue'
import { useServices } from 'services'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'
import { useMessageSelectionStore } from 'store/messageSelection'
import { deleteMessages } from 'actions'
import { useGlobalModal } from 'hooks'
import { Modal } from 'ui/modals/parts'
import { Button } from 'ui/ui/Button/Button'
import { Checkbox } from 'ui/ui/Checkbox/Checkbox'
import './DeleteMessagesModal.css'

export type DeleteMessagesModalParams = {
  peerId: Peer.Id
  cmids: Message.Cmid[]
  /**
   * Доступно ли удаление у всех. Чужие сообщения так удалить нельзя,
   * а в «Избранном» удалять просто не у кого — и ВК такой запрос отклоняет
   */
  forEveryone: 'available' | 'foreign_messages' | 'self_convo'
}

export const DeleteMessagesModal = defineComponent<DeleteMessagesModalParams>((params) => {
  const { lang } = useServices()
  const { deleteMessagesModal } = useGlobalModal()
  const selection = useMessageSelectionStore()

  // Для собеседника это необратимо, поэтому галочку ставит пользователь, а не мы
  const forEveryone = shallowRef(false)
  const status = shallowRef<'idle' | 'deleting' | 'error'>('idle')
  const errorText = shallowRef('')

  const submit = async () => {
    status.value = 'deleting'

    const { failed } = await deleteMessages(params.peerId, params.cmids, forEveryone.value)

    if (failed.length === 0) {
      selection.reset()
      deleteMessagesModal.close()
      return
    }

    /*
      ВК отвечает по каждому сообщению отдельно, поэтому показываем первую причину:
      обычно все отказы одинаковы, чаще всего это истёкшее время удаления у всех
    */
    errorText.value = failed[0]?.reason ?? ''
    status.value = 'error'
  }

  return () => (
    <Modal
      title={lang.usePlural('delete_messages_title', params.cmids.length)}
      opened={deleteMessagesModal.opened}
      onClose={deleteMessagesModal.close}
      onVisibilityChange={deleteMessagesModal.onVisibilityChange}
      class="DeleteMessagesModal"
      buttons={[
        <Button
          mode="destructive"
          onClick={submit}
          disabled={status.value === 'deleting'}
          loading={status.value === 'deleting'}
        >
          {lang.use('delete_messages_submit')}
        </Button>,
        <Button mode="secondary" onClick={deleteMessagesModal.close}>
          {lang.use('modal_close_label')}
        </Button>
      ]}
    >
      <div class="DeleteMessagesModal__text">
        {lang.usePlural('delete_messages_description', params.cmids.length)}
      </div>

      {params.forEveryone === 'available' && (
        <Checkbox
          label={lang.use('delete_messages_for_everyone')}
          checked={forEveryone.value}
          onChange={(checked) => (forEveryone.value = checked)}
        />
      )}

      {/* В «Избранном» объяснять нечего: там и так очевидно, что удаление только своё */}
      {params.forEveryone === 'foreign_messages' && (
        <div class="DeleteMessagesModal__hint">
          {lang.use('delete_messages_only_for_me')}
        </div>
      )}

      {status.value === 'error' && (
        <div class="DeleteMessagesModal__error">
          {lang.use('delete_messages_failed')}
          {errorText.value && `: ${errorText.value}`}
        </div>
      )}
    </Modal>
  )
}, {
  props: ['peerId', 'cmids', 'forEveryone']
})
