import { defineComponent, shallowRef } from 'vue'
import { useServices } from 'services'
import * as IApi from 'services/contracts/IApi'
import { useGlobalModal } from 'hooks'
import { Modal } from 'ui/modals/parts'
import { Button } from 'ui/ui/Button/Button'
import './ConfirmModal.css'

export type ConfirmModalParams = {
  title: string
  description: string
  submitLabel: string
  onConfirm: () => Promise<void>
}

/** Общая модалка подтверждения для необратимых или чувствительных действий */
export const ConfirmModal = defineComponent<ConfirmModalParams>((params) => {
  const { lang } = useServices()
  const { confirmModal } = useGlobalModal()

  const status = shallowRef<'idle' | 'submitting' | 'error'>('idle')
  const errorText = shallowRef('')

  const submit = async () => {
    status.value = 'submitting'

    try {
      await params.onConfirm()
      confirmModal.close()
    } catch (error) {
      errorText.value = IApi.describeApiError(error)
      console.warn('[ConfirmModal] error:', errorText.value)
      status.value = 'error'
    }
  }

  return () => (
    <Modal
      title={params.title}
      opened={confirmModal.opened}
      onClose={confirmModal.close}
      onVisibilityChange={confirmModal.onVisibilityChange}
      class="ConfirmModal"
      buttons={[
        <Button
          mode="destructive"
          onClick={submit}
          disabled={status.value === 'submitting'}
          loading={status.value === 'submitting'}
        >
          {params.submitLabel}
        </Button>,
        <Button mode="secondary" onClick={confirmModal.close}>
          {lang.use('modal_close_label')}
        </Button>
      ]}
    >
      <div class="ConfirmModal__text">{params.description}</div>

      {status.value === 'error' && (
        <div class="ConfirmModal__error">
          {lang.use('confirm_modal_failed')}
          {errorText.value && `: ${errorText.value}`}
        </div>
      )}
    </Modal>
  )
}, {
  props: ['title', 'description', 'submitLabel', 'onConfirm']
})
