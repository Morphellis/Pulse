import { computed, defineComponent, onUnmounted, shallowRef, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useServices } from 'services'
import * as Convo from 'model/Convo'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'
import { useConvosStore } from 'store/convos'
import { useMessageSelectionStore } from 'store/messageSelection'
import { useNotificationsStore } from 'store/notifications'
import { insertConvos, insertPeers } from 'actions'
import { useModal } from 'hooks'
import { PEER_FIELDS } from 'misc/constants'
import { electronBridge } from 'misc/electronBridge'
import { useMarkAsReadOnView } from './useMarkAsReadOnView'
import { ConvoComposer } from 'ui/messenger/ConvoComposer/ConvoComposer'
import { ConvoHeader } from 'ui/messenger/ConvoHeader/ConvoHeader'
import { ConvoHistory } from 'ui/messenger/ConvoHistory/ConvoHistory'
import { MessagePreviewModal } from 'ui/messenger/ConvoView/MessagePreviewModal'
import { PinnedMessage } from 'ui/messenger/PinnedMessage/PinnedMessage'
import { SelectionPanel } from 'ui/messenger/SelectionPanel/SelectionPanel'
import { LoadError } from 'ui/ui/LoadError/LoadError'
import { Spinner } from 'ui/ui/Spinner/Spinner'
import './ConvoView.css'

type ConvoViewProps = {
  convo: Convo.Convo
}

const ConvoView = defineComponent<ConvoViewProps>((props) => {
  const { scrollAnchors } = useConvosStore()
  const selection = useMessageSelectionStore()
  const messagePreviewModal = useModal()
  const messagePreviewCmid = shallowRef<Message.Cmid>()

  useMarkAsReadOnView(computed(() => props.convo))

  const openMessagePreview = (cmid: Message.Cmid) => {
    messagePreviewCmid.value = cmid
    messagePreviewModal.open()
  }

  return () => {
    const pinnedMessage = props.convo.kind === 'ChatConvo' && props.convo.pinnedMessage

    return (
      <div class="ConvoView">
        <ConvoHeader convo={props.convo} />
        {pinnedMessage && (
          <PinnedMessage
            pinnedMessage={pinnedMessage}
            onClick={() => {
              if (pinnedMessage.isUnavailable) {
                openMessagePreview(pinnedMessage.cmid)
                return
              }
              scrollAnchors.set(props.convo.id, {
                kind: 'Message',
                cmid: pinnedMessage.cmid,
                reversible: true
              })
            }}
          />
        )}
        <ConvoHistory convo={props.convo} openMessagePreview={openMessagePreview} />

        {/* Пока идёт выделение, вместо поля ввода показываем действия над выбранным */}
        {selection.isActive && selection.peerId === props.convo.id
          ? (
            <div class="ConvoView__selectionPanel">
              <SelectionPanel convo={props.convo} />
            </div>
          )
          : <ConvoComposer convo={props.convo} />}

        {messagePreviewCmid.value && (
          <MessagePreviewModal
            opened={messagePreviewModal.opened}
            onClose={messagePreviewModal.close}
            convo={props.convo}
            cmid={messagePreviewCmid.value}
          />
        )}
      </div>
    )
  }
}, {
  props: ['convo']
})

export const ConvoWrapper = defineComponent(() => {
  const route = useRoute('Convo')
  const { connection, convos } = useConvosStore()
  const { api } = useServices()

  const peerId = computed(() => Peer.resolveId(Number(route.params.peerId)))
  const convo = computed(() => convos.get(peerId.value))
  const isLoadingFailed = shallowRef(false)

  /*
    Открытая переписка не должна порождать уведомления, а те, что уже висят
    на экране, при переходе в нее теряют смысл
  */
  const presence = useNotificationsStore()
  watchEffect(() => {
    presence.activePeerId = peerId.value
    electronBridge.notifications.clear(peerId.value)
  })
  onUnmounted(() => {
    presence.activePeerId = null
  })

  const loadConvo = async () => {
    isLoadingFailed.value = false

    try {
      const {
        items,
        last_messages: apiLastMessages = [],
        profiles,
        groups
      } = await api.fetch('messages.getConversationsById', {
        peer_ids: peerId.value,
        with_last_messages: 1,
        extended: 1,
        fields: PEER_FIELDS
      })

      const [apiConvo] = items
      const [apiLastMessage] = apiLastMessages
      if (!apiConvo) {
        throw new Error('No conversation fetched for ' + peerId.value)
      }

      insertConvos([{ conversation: apiConvo, last_message: apiLastMessage }])
      insertPeers({ profiles, groups })
    } catch (err) {
      console.warn(err)
      isLoadingFailed.value = true
    }
  }

  watchEffect(() => {
    if (!convo.value && connection.status === 'connected' && !isLoadingFailed.value) {
      loadConvo()
    }
  })

  return () => {
    if (convo.value) {
      return <ConvoView convo={convo.value} />
    }

    if (isLoadingFailed.value) {
      return <LoadError onRetry={loadConvo} class="ConvoWrapper__loadError" />
    }

    return <Spinner class="ConvoWrapper__spinner" size="regular" />
  }
})
