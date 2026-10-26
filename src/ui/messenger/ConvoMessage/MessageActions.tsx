import { defineComponent } from 'vue'
import { useServices } from 'services'
import * as Convo from 'model/Convo'
import * as Message from 'model/Message'
import { useConvosStore } from 'store/convos'
import { useMessageContextMenuStore } from 'store/messageContextMenu'
import { ButtonIcon } from 'ui/ui/ButtonIcon/ButtonIcon'
import { Icon24MoreHorizontal } from 'assets/icons'
import './MessageActions.css'

type Props = {
  message: Message.Normal
}

/**
 * Кнопка действий рядом с сообщением.
 *
 * Своего меню не держит: открывает то же самое, что и правая кнопка мыши,
 * иначе списки действий пришлось бы поддерживать в двух местах
 */
export const MessageActions = defineComponent<Props>((props) => {
  const { lang } = useServices()
  const { convos } = useConvosStore()
  const contextMenu = useMessageContextMenuStore()

  const openMenu = (event: { currentTarget: HTMLElement }) => {
    const { message } = props
    // Меню раскрывается от нижнего края кнопки, а не от точки нажатия
    const rect = event.currentTarget.getBoundingClientRect()

    contextMenu.open(
      message,
      Convo.safeGet(convos, message.peerId),
      rect.left,
      rect.bottom + 4
    )
  }

  return () => (
    <ButtonIcon
      class="MessageActions"
      icon={<Icon24MoreHorizontal width="20" color="var(--vkui--color_icon_secondary)" />}
      title={lang.use('me_message_actions')}
      withHoverBackground
      onClick={openMenu}
    />
  )
}, {
  props: ['message']
})
