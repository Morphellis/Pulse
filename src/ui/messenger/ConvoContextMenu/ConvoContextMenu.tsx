import { defineComponent, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useServices } from 'services'
import * as Convo from 'model/Convo'
import * as Peer from 'model/Peer'
import { useConvoContextMenuStore } from 'store/convoContextMenu'
import { useConvosStore } from 'store/convos'
import { usePeersStore } from 'store/peers'
import {
  blockConvoOwner,
  clearConvoHistory,
  markConvoAsRead,
  markConvoAsUnread,
  toggleConvoArchived,
  toggleConvoMute,
  toggleConvoPinned
} from 'actions'
import { useFocusTrap, useGlobalModal } from 'hooks'
import { ActionMenu } from 'ui/ui/ActionMenu/ActionMenu'
import { ActionMenuItem } from 'ui/ui/ActionMenuItem/ActionMenuItem'
import {
  Icon20TrashOutline,
  Icon24Archive,
  Icon24Block,
  Icon24MarkUnread,
  Icon24MuteOutline,
  Icon24Pin,
  Icon24VolumeOutline
} from 'assets/icons'
import './ConvoContextMenu.css'

/** Отступ от края окна, чтобы меню не прилипало к нему вплотную */
const VIEWPORT_PADDING = 8

/**
 * Меню беседы по правой кнопке в списке бесед.
 *
 * Живёт одно на всё приложение и рисуется у курсора, как и MessageContextMenu
 */
export const ConvoContextMenu = defineComponent(() => {
  const route = useRoute()
  const menu = useConvoContextMenuStore()
  const { convos } = useConvosStore()

  // Переход в другую беседу или раздел не должен оставлять меню висеть поверх него
  watch(() => route.fullPath, () => menu.close())

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && menu.convo) {
      event.stopPropagation()
      menu.close()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))

  /*
    Подложка перекрывает весь экран и первой ловит правую кнопку по соседней беседе,
    поэтому сама решает, переоткрыть меню на ней или просто закрыться
  */
  const findConvoUnderCursor = (event: MouseEvent): Convo.Convo | undefined => {
    const backdrop = event.currentTarget
    if (!(backdrop instanceof HTMLElement)) {
      return undefined
    }

    backdrop.style.pointerEvents = 'none'
    const elementBelow = document.elementFromPoint(event.clientX, event.clientY)
    backdrop.style.pointerEvents = ''

    const peerIdAttr = elementBelow?.closest<HTMLElement>('[data-peer-id]')?.dataset.peerId
    const peerIdNumber = peerIdAttr ? Number(peerIdAttr) : NaN
    if (!Number.isFinite(peerIdNumber) || peerIdNumber === 0) {
      return undefined
    }

    return convos.get(Peer.resolveId(peerIdNumber))
  }

  const onBackdropContextMenu = (event: MouseEvent) => {
    event.preventDefault()

    const convo = findConvoUnderCursor(event)

    if (convo) {
      menu.open(convo, event.clientX, event.clientY)
    } else {
      menu.close()
    }
  }

  return () => {
    const { convo } = menu

    return (
      <>
        {convo && (
          <>
            <div
              class="ConvoContextMenu__backdrop"
              onClick={() => menu.close()}
              onContextmenu={onBackdropContextMenu}
            />

            <ConvoContextMenuPanel
              key={convo.id}
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
  convo: Convo.Convo
  x: number
  y: number
  onClose: () => void
}

const ConvoContextMenuPanel = defineComponent<PanelProps>((props) => {
  const { lang } = useServices()
  const { peers } = usePeersStore()
  const { confirmModal } = useGlobalModal()

  const $root = shallowRef<HTMLDivElement | null>(null)
  const position = shallowRef({ left: 0, top: 0 })
  const isPositioned = shallowRef(false)
  const { onFocusIn, onFocusOut } = useFocusTrap($root)

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

    element.focus()
  })

  const run = (action: () => void) => () => {
    action()
    props.onClose()
  }

  const openClearHistoryModal = () => {
    const { convo } = props

    confirmModal.open({
      title: lang.use('clear_convo_history_title'),
      description: lang.use('clear_convo_history_description'),
      submitLabel: lang.use('clear_convo_history_submit'),
      onConfirm: () => clearConvoHistory(convo)
    })
  }

  const openBlockModal = (convo: Convo.UserConvo | Convo.GroupConvo) => {
    const peer = Peer.safeGet(peers, convo.id)

    confirmModal.open({
      title: lang.use('block_convo_owner_title', { name: Peer.name(peer) }),
      description: lang.use('block_convo_owner_description'),
      submitLabel: lang.use('block_convo_owner_submit'),
      onConfirm: () => blockConvoOwner(convo)
    })
  }

  return () => {
    const { convo } = props
    const isUnread = Convo.isUnread(convo)
    const isPinned = Convo.isPinned(convo)

    return (
      <div
        class={['ConvoContextMenu', {
          'ConvoContextMenu--positioned': isPositioned.value
        }]}
        style={{ left: `${position.value.left}px`, top: `${position.value.top}px` }}
        ref={$root}
        tabindex="-1"
        onFocusin={onFocusIn}
        onFocusout={onFocusOut}
      >
        <ActionMenu class="ConvoContextMenu__actions">
          <ActionMenuItem
            icon={<Icon24Pin width="20" />}
            text={lang.use(isPinned ? 'me_convo_menu_unpin' : 'me_convo_menu_pin')}
            onClick={run(() => void toggleConvoPinned(convo))}
          />
          <ActionMenuItem
            icon={<Icon24Archive width="20" />}
            text={lang.use(convo.isArchived ? 'me_convo_menu_unarchive' : 'me_convo_menu_archive')}
            onClick={run(() => void toggleConvoArchived(convo))}
          />
          <ActionMenuItem
            icon={<Icon24MarkUnread width="20" />}
            text={lang.use(isUnread ? 'me_convo_menu_mark_read' : 'me_convo_menu_mark_unread')}
            onClick={run(() => void (isUnread ? markConvoAsRead(convo) : markConvoAsUnread(convo)))}
          />
          <ActionMenuItem
            icon={convo.notifications.enabled ? <Icon24MuteOutline width="20" /> : <Icon24VolumeOutline width="20" />}
            text={lang.use(convo.notifications.enabled
              ? 'me_convo_disable_notifications'
              : 'me_convo_enable_notifications')}
            onClick={run(() => void toggleConvoMute(convo))}
          />
          <ActionMenuItem
            icon={<Icon20TrashOutline width="20" color="var(--vkui--color_icon_negative)" />}
            text={lang.use('me_convo_menu_clear_history')}
            onClick={run(openClearHistoryModal)}
          />
          {(convo.kind === 'UserConvo' || convo.kind === 'GroupConvo') && (
            <ActionMenuItem
              icon={<Icon24Block width="20" color="var(--vkui--color_icon_negative)" />}
              text={lang.use('me_convo_menu_block')}
              onClick={run(() => openBlockModal(convo))}
            />
          )}
        </ActionMenu>
      </div>
    )
  }
}, {
  props: ['convo', 'x', 'y', 'onClose']
})
