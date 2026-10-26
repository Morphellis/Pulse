import { defineComponent, shallowRef, watch } from 'vue'
import * as Convo from 'model/Convo'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'
import { useConvosStore } from 'store/convos'
import { useMessageContextMenuStore } from 'store/messageContextMenu'
import { useMessageSelectionStore } from 'store/messageSelection'
import { usePeersStore } from 'store/peers'
import { NonEmptyArray } from 'misc/utils'
import { ConvoMessage } from 'ui/messenger/ConvoMessage/ConvoMessage'
import { MessageActions } from 'ui/messenger/ConvoMessage/MessageActions'
import { ExpiredMessage } from 'ui/messenger/ExpiredMessage/ExpiredMessage'
import { ServiceMessage } from 'ui/messenger/ServiceMessage/ServiceMessage'
import { Avatar } from 'ui/ui/Avatar/Avatar'
import './MessagesStack.css'

type Props = {
  messages: NonEmptyArray<Message.Message>
  openMessagePreview: (cmid: Message.Cmid) => void
}

export const MessagesStack = defineComponent<Props>((props) => {
  const { convos } = useConvosStore()
  const { peers } = usePeersStore()

  return () => {
    const [message] = props.messages
    const author = Peer.safeGet(peers, message.authorId)
    const convo = Convo.safeGet(convos, message.peerId)
    const isChat = Peer.isChatPeerId(convo.id)
    const isChannel = Convo.isChannel(convo)

    return (
      <div class={['MessagesStack', message.isOut && 'MessagesStack--out']}>
        {message.kind === 'Normal' && !message.isOut && isChat && !isChannel && (
          <Avatar class="MessagesStack__avatar" peer={author} size={32} />
        )}
        <div class="MessagesStack__messages">
          {props.messages.map((message, index) => (
            <StackMessage
              key={message.kind === 'Pending' ? message.randomId : message.cmid}
              message={message}
              isHead={index === 0}
              openMessagePreview={props.openMessagePreview}
            />
          ))}
        </div>
      </div>
    )
  }
}, {
  props: ['messages', 'openMessagePreview']
})

type StackMessageProps = {
  message: Message.Message
  isHead: boolean
  openMessagePreview: (cmid: Message.Cmid) => void
}

const StackMessage = defineComponent<StackMessageProps>((props) => {
  const { convos, scrollAnchors } = useConvosStore()
  const selection = useMessageSelectionStore()
  const contextMenu = useMessageContextMenuStore()
  const highlightTimeoutId = shallowRef<number>()

  const isSelected = () => (
    props.message.cmid !== undefined &&
    selection.isSelected(props.message.peerId, props.message.cmid)
  )

  const onMessageClick = () => {
    // Вне режима выделения клик по сообщению ничего не делает, как и раньше
    if (!selection.isActive || props.message.cmid === undefined) {
      return
    }

    selection.toggle(props.message.peerId, props.message.cmid)
  }

  /*
    Правая кнопка открывает меню сообщения у курсора. В режиме выделения не мешаем:
    там правая кнопка ничего осмысленного не делает
  */
  const onContextMenu = (event: MouseEvent) => {
    const { message } = props

    if (message.kind !== 'Normal' || selection.isActive) {
      return
    }

    event.preventDefault()
    contextMenu.open(
      message,
      Convo.safeGet(convos, message.peerId),
      event.clientX,
      event.clientY
    )
  }

  watch(() => scrollAnchors.get(props.message.peerId), (anchor) => {
    if (
      anchor?.kind === 'Message' &&
      anchor.cmid === props.message.cmid &&
      anchor.highlight !== false
    ) {
      window.clearTimeout(highlightTimeoutId.value)
      highlightTimeoutId.value = window.setTimeout(() => {
        highlightTimeoutId.value = undefined
      }, 1000)
    }
  }, { immediate: true })

  return () => {
    const { message, isHead } = props

    switch (message.kind) {
      case 'Normal':
      case 'Pending':
        return (
          <div
            class={[
              'MessagesStack__message',
              highlightTimeoutId.value && 'MessagesStack__message--highlighted',
              isSelected() && 'MessagesStack__message--selected'
            ]}
            data-cmid={message.cmid}
            // В режиме выделения клик по сообщению переключает его выбор
            onClick={onMessageClick}
            onContextmenu={onContextMenu}
          >
            <ConvoMessage
              message={message}
              showName={isHead && Peer.isChatPeerId(message.peerId)}
              openMessagePreview={props.openMessagePreview}
              convo={Convo.safeGet(convos, message.peerId)}
            />

            {/* Отправленным сообщениям можно ответить, ещё не ушедшим - нет */}
            {message.kind === 'Normal' && <MessageActions message={message} />}
          </div>
        )

      case 'Service':
        return (
          <div
            class={[
              'MessagesStack__message MessagesStack__message--centered',
              highlightTimeoutId.value && 'MessagesStack__message--highlighted'
            ]}
            data-cmid={message.cmid}
          >
            <ServiceMessage message={message} />
          </div>
        )

      case 'Expired':
        return (
          <div
            class={[
              'MessagesStack__message MessagesStack__message--centered',
              highlightTimeoutId.value && 'MessagesStack__message--highlighted'
            ]}
            data-cmid={message.cmid}
          >
            <ExpiredMessage count={1} />
          </div>
        )
    }
  }
}, {
  props: ['message', 'isHead', 'openMessagePreview']
})
