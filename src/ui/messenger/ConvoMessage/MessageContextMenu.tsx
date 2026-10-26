import { defineComponent, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useServices } from 'services'
import * as Convo from 'model/Convo'
import * as ConvoDraft from 'model/ConvoDraft'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'
import { useConvoDraftsStore } from 'store/convoDrafts'
import { useConvosStore } from 'store/convos'
import { useMessageContextMenuStore } from 'store/messageContextMenu'
import { useMessageSelectionStore } from 'store/messageSelection'
import { toggleMessageImportant } from 'actions'
import { useFocusTrap, useGlobalModal, useMessageReadInfo, useViewer } from 'hooks'
import { ReactionPicker } from 'ui/messenger/ConvoMessage/ReactionPicker'
import { ActionMenu } from 'ui/ui/ActionMenu/ActionMenu'
import { ActionMenuItem } from 'ui/ui/ActionMenuItem/ActionMenuItem'
import {
  Icon16CheckDoubleOutline,
  Icon16CopyOutline,
  Icon16Text,
  Icon20CheckboxOn,
  Icon20MessageArrowRightOutline,
  Icon20Reply,
  Icon20TrashOutline,
  Icon24StarOutline
} from 'assets/icons'
import './MessageContextMenu.css'

/** Отступ от края окна, чтобы меню не прилипало к нему вплотную */
const VIEWPORT_PADDING = 8

/**
 * Меню сообщения по правой кнопке.
 *
 * Живёт одно на всё приложение и рисуется у курсора: так оно не зависит
 * от того, где именно в истории находится сообщение
 */
export const MessageContextMenu = defineComponent(() => {
  const route = useRoute()
  const menu = useMessageContextMenuStore()
  const { convos } = useConvosStore()
  const selection = useMessageSelectionStore()

  // Переход в другую беседу или раздел не должен оставлять меню висеть поверх него
  watch(() => route.fullPath, () => menu.close())

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && menu.message) {
      event.stopPropagation()
      menu.close()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))

  /*
    Подложка перекрывает весь экран и первой ловит правую кнопку по соседнему
    сообщению, поэтому сама решает, переоткрыть меню на нём или просто закрыться.
    Чтобы узнать, что находится под курсором, на мгновение убираем себя
    из хит-теста — это синхронно, и никакое другое событие вклиниться не успеет
  */
  const findMessageUnderCursor = (
    event: MouseEvent
  ): { message: Message.Normal, convo: Convo.Convo } | undefined => {
    if (route.name !== 'Convo' || selection.isActive) {
      return undefined
    }

    const backdrop = event.currentTarget
    if (!(backdrop instanceof HTMLElement)) {
      return undefined
    }

    backdrop.style.pointerEvents = 'none'
    const elementBelow = document.elementFromPoint(event.clientX, event.clientY)
    backdrop.style.pointerEvents = ''

    const cmidAttr = elementBelow?.closest<HTMLElement>('[data-cmid]')?.dataset.cmid
    const cmidNumber = cmidAttr ? Number(cmidAttr) : NaN
    if (!Number.isFinite(cmidNumber) || cmidNumber <= 0) {
      return undefined
    }

    const peerId = Peer.resolveId(Number(route.params.peerId))
    const convo = convos.get(peerId)
    const foundMessage = convo && Convo.findMessage(convo, Message.resolveCmid(cmidNumber))

    if (!convo || foundMessage?.kind !== 'Normal') {
      return undefined
    }

    return { message: foundMessage, convo }
  }

  const onBackdropContextMenu = (event: MouseEvent) => {
    event.preventDefault()

    const target = findMessageUnderCursor(event)

    if (target) {
      menu.open(target.message, target.convo, event.clientX, event.clientY)
    } else {
      menu.close()
    }
  }

  return () => {
    const { message, convo } = menu

    /*
      Телепорт не нужен: компонент и так живёт прямым ребёнком .App,
      а меню позиционируется фиксированно и не зависит от родителя
    */
    return (
      <>
        {message && (
          <>
            <div
              class="MessageContextMenu__backdrop"
              onClick={() => menu.close()}
              onContextmenu={onBackdropContextMenu}
            />

            {/*
              Ключ меняется вместе с сообщением, поэтому панель монтируется заново
              при каждом открытии: так фокус-трап и позиционирование каждый раз
              стартуют с чистого состояния, а не тянут его от предыдущего сообщения
            */}
            <MessageContextMenuPanel
              key={Message.key(message)}
              message={message}
              convo={convo}
              x={menu.x}
              y={menu.y}
              onClose={() => menu.close()}
            />
          </>
        )}
      </>
    )
  }
})

type PanelProps = {
  message: Message.Normal
  convo: Convo.Convo | undefined
  x: number
  y: number
  onClose: () => void
}

const MessageContextMenuPanel = defineComponent<PanelProps>((props) => {
  const { lang } = useServices()
  const { drafts } = useConvoDraftsStore()
  const selection = useMessageSelectionStore()
  const { deleteMessagesModal, forwardModal } = useGlobalModal()
  const getReadInfo = useMessageReadInfo()
  const viewer = useViewer()

  const $root = shallowRef<HTMLDivElement | null>(null)
  const position = shallowRef({ left: 0, top: 0 })
  const isPositioned = shallowRef(false)
  const { onFocusIn, onFocusOut } = useFocusTrap($root)

  /*
    Координаты курсора — только отправная точка: у нижнего или правого края
    меню нужно развернуть в другую сторону. Разворот тоже клэмпим с обеих сторон,
    иначе на маленьком окне меню могло уехать уже за противоположный край
  */
  onMounted(() => {
    const element = $root.value
    if (!element) {
      return
    }

    const { width, height } = element.getBoundingClientRect()

    let left = props.x
    if (left + width + VIEWPORT_PADDING > window.innerWidth) {
      left = props.x - width
    }
    left = Math.min(
      Math.max(VIEWPORT_PADDING, left),
      Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING)
    )

    let top = props.y
    if (top + height + VIEWPORT_PADDING > window.innerHeight) {
      top = props.y - height
    }
    top = Math.min(
      Math.max(VIEWPORT_PADDING, top),
      Math.max(VIEWPORT_PADDING, window.innerHeight - height - VIEWPORT_PADDING)
    )

    position.value = { left, top }
    isPositioned.value = true

    // Фокус — на саму панель, чтобы Tab и стрелки сразу работали внутри меню
    element.focus()
  })

  const run = (action: () => void) => () => {
    action()
    props.onClose()
  }

  const reply = () => {
    const draft = ConvoDraft.safeGet(drafts, props.message.peerId)
    draft.replyTo = Message.toForeign(props.message)
  }

  const startEditing = () => {
    const draft = ConvoDraft.safeGet(drafts, props.message.peerId)
    draft.replyTo = undefined
    draft.editing = { cmid: props.message.cmid, originalText: props.message.text }
  }

  const copyText = () => {
    navigator.clipboard.writeText(props.message.text).catch((error: unknown) => {
      console.warn('[MessageContextMenu] copy failed', error)
    })
  }

  return () => {
    const { message, convo } = props
    const readInfo = getReadInfo(message, convo)

    return (
      <div
        class={['MessageContextMenu', {
          'MessageContextMenu--positioned': isPositioned.value
        }]}
        style={{ left: `${position.value.left}px`, top: `${position.value.top}px` }}
        ref={$root}
        tabindex="-1"
        onFocusin={onFocusIn}
        onFocusout={onFocusOut}
      >
        {/* Реакции стоят над списком действий, как в телеграме */}
        <ReactionPicker message={message} onPick={props.onClose} />

        <ActionMenu class="MessageContextMenu__actions">
          {readInfo && (
            <div class="MessageContextMenu__readInfo">
              <Icon16CheckDoubleOutline width="14" height="14" />
              {readInfo}
            </div>
          )}

          <ActionMenuItem
            icon={<Icon20Reply width="20" />}
            text={lang.use('me_message_reply')}
            onClick={run(reply)}
          />
          <ActionMenuItem
            icon={<Icon20MessageArrowRightOutline width="20" />}
            text={lang.use('me_message_forward')}
            onClick={run(() => forwardModal.open({
              fromPeerId: message.peerId,
              cmids: [message.cmid]
            }))}
          />
          {message.text && (
            <ActionMenuItem
              icon={<Icon16CopyOutline width="20" />}
              text={lang.use('me_message_copy')}
              onClick={run(copyText)}
            />
          )}
          <ActionMenuItem
            icon={<Icon24StarOutline width="20" />}
            text={lang.use(message.isImportant
              ? 'me_message_unmark_important'
              : 'me_message_mark_important')}
            onClick={run(() => void toggleMessageImportant(message))}
          />
          <ActionMenuItem
            icon={<Icon20CheckboxOn width="20" />}
            text={lang.use('me_message_select')}
            onClick={run(() => selection.toggle(message.peerId, message.cmid))}
          />
          {message.isOut && (
            <ActionMenuItem
              icon={<Icon16Text width="20" />}
              text={lang.use('me_message_edit')}
              onClick={run(startEditing)}
            />
          )}
          <ActionMenuItem
            icon={<Icon20TrashOutline width="20" color="var(--vkui--color_icon_negative)" />}
            text={lang.use('me_message_delete')}
            onClick={run(() => deleteMessagesModal.open({
              peerId: message.peerId,
              cmids: [message.cmid],
              forEveryone: message.peerId === viewer.id
                ? 'self_convo'
                : message.isOut ? 'available' : 'foreign_messages'
            }))}
          />
        </ActionMenu>
      </div>
    )
  }
}, {
  props: ['message', 'convo', 'x', 'y', 'onClose']
})
