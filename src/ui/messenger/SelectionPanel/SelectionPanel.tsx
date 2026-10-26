import { defineComponent } from 'vue'
import { useServices } from 'services'
import * as Convo from 'model/Convo'
import { useMessageSelectionStore } from 'store/messageSelection'
import { useGlobalModal, useViewer } from 'hooks'
import { Button } from 'ui/ui/Button/Button'
import { ButtonIcon } from 'ui/ui/ButtonIcon/ButtonIcon'
import {
  Icon20MessageArrowRightOutline,
  Icon20TrashOutline,
  Icon24Cancel
} from 'assets/icons'
import './SelectionPanel.css'

type Props = {
  convo: Convo.Convo
}

/** Заменяет поле ввода, пока в беседе выделены сообщения */
export const SelectionPanel = defineComponent<Props>((props) => {
  const { lang } = useServices()
  const selection = useMessageSelectionStore()
  const { deleteMessagesModal, forwardModal } = useGlobalModal()
  const viewer = useViewer()

  const openForward = () => {
    forwardModal.open({
      fromPeerId: props.convo.id,
      cmids: [...selection.cmids]
    })
  }

  const openDelete = () => {
    const cmids = [...selection.cmids]

    // Удалить у всех можно только свои сообщения, поэтому проверяем каждое
    const allOwn = cmids.every((cmid) => {
      const message = Convo.findMessage(props.convo, cmid)
      return message?.isOut === true
    })

    deleteMessagesModal.open({
      peerId: props.convo.id,
      cmids,
      forEveryone: props.convo.id === viewer.id
        ? 'self_convo'
        : allOwn ? 'available' : 'foreign_messages'
    })
  }

  return () => (
    <div class="SelectionPanel">
      <ButtonIcon
        class="SelectionPanel__cancel"
        icon={<Icon24Cancel width="20" color="var(--vkui--color_icon_secondary)" />}
        title={lang.use('selection_cancel')}
        onClick={() => selection.reset()}
        withHoverBackground
      />

      <span class="SelectionPanel__count">
        {lang.usePlural('selection_count', selection.count)}
      </span>

      <Button
        class="SelectionPanel__delete"
        mode="tertiary"
        before={<Icon20TrashOutline width="20" color="var(--vkui--color_icon_negative)" />}
        onClick={openDelete}
      >
        {lang.use('selection_delete')}
      </Button>

      <Button
        class="SelectionPanel__forward"
        before={<Icon20MessageArrowRightOutline width="20" />}
        onClick={openForward}
      >
        {lang.use('selection_forward')}
      </Button>
    </div>
  )
}, {
  props: ['convo']
})
