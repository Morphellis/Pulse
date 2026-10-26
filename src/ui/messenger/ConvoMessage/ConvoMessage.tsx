import { defineComponent, shallowRef } from 'vue'
import { useServices } from 'services'
import * as Attach from 'model/Attach'
import * as Convo from 'model/Convo'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'
import { useConvosStore } from 'store/convos'
import { usePeersStore } from 'store/peers'
import { discardPendingMessage, retryPendingMessage } from 'actions'
import { useMessageReadInfo } from 'hooks'
import { Attaches } from 'ui/messenger/attaches/Attaches'
import { MessageReactions } from 'ui/messenger/ConvoMessage/MessageReactions'
import { ForwardedMessages } from 'ui/messenger/ForwardedMessages/ForwardedMessages'
import { MessageOutStatusIcon } from 'ui/messenger/MessageOutStatusIcon/MessageOutStatusIcon'
import { ReplyMessage } from 'ui/messenger/ReplyMessage/ReplyMessage'
import { ButtonText } from 'ui/ui/ButtonText/ButtonText'
import { Icon16CheckDoubleOutline, Icon20TrashOutline } from 'assets/icons'
import './ConvoMessage.css'

type Props = {
  message: Message.Normal | Message.Pending
  showName: boolean
  openMessagePreview: (cmid: Message.Cmid) => void
  convo?: Convo.Convo
}

export const ConvoMessage = defineComponent<Props>((props) => {
  const { lang } = useServices()
  const { scrollAnchors } = useConvosStore()
  const { peers } = usePeersStore()
  const showEditHistory = shallowRef(false)
  const showReadInfo = shallowRef(false)
  const getReadInfo = useMessageReadInfo()

  const readInfo = () => getReadInfo(props.message, props.convo)

  return () => {
    const { message, showName } = props
    const author = Peer.safeGet(peers, message.authorId)
    const hasAttaches = Attach.kindsCount(message.attaches) > 0
    const isEmpty =
      !message.text &&
      !hasAttaches &&
      !message.replyMessage &&
      !message.forwardedMessages

    return (
      <div
        class={['ConvoMessage', {
          'ConvoMessage--out': message.isOut,
          'ConvoMessage--deleted': !!message.deletedAt
        }]}
        onDblclick={() => (showReadInfo.value = !showReadInfo.value)}
      >
        <div class="ConvoMessage__content">
          {showName && !message.isOut && (
            <div class="ConvoMessage__author">{Peer.name(author)}</div>
          )}

          {message.deletedAt && (
            <div class="ConvoMessage__deletedLabel">
              <Icon20TrashOutline width="14" height="14" />
              {lang.use('me_message_deleted', {
                time: lang
                  .dateTimeFormatter({ hour: '2-digit', minute: '2-digit' })
                  .format(message.deletedAt)
              })}
            </div>
          )}

          {message.replyMessage && (
            <ReplyMessage
              class="ConvoMessage__reply"
              reply={message.replyMessage}
              onClick={() => {
                if (message.replyMessage?.cmid) {
                  if (message.replyMessage.isUnavailable) {
                    props.openMessagePreview(message.replyMessage.cmid)
                    return
                  }
                  scrollAnchors.set(message.peerId, {
                    kind: 'Message',
                    cmid: message.replyMessage.cmid,
                    reversible: true
                  })
                }
              }}
            />
          )}

          {message.text && <span class="ConvoMessage__text">{message.text}</span>}

          {/*
            Прежние версии прячем под раскрытие: собеседник мог поправить смысл,
            но чаще это опечатка, и постоянно показывать её незачем
          */}
          {showEditHistory.value && message.editHistory && (
            <div class="ConvoMessage__editHistory">
              {message.editHistory.map((previousText, index) => (
                <div class="ConvoMessage__previousText" key={index}>
                  {previousText || lang.use('me_empty_message')}
                </div>
              ))}
            </div>
          )}
          {hasAttaches && <Attaches class="ConvoMessage__attaches" attaches={message.attaches} message={message} />}

          {isEmpty && (
            <span class="ConvoMessage__empty">
              {lang.use('me_empty_message')}
            </span>
          )}

          {message.forwardedMessages && <ForwardedMessages messages={message.forwardedMessages} />}

          {/* Сообщение не ушло: даём повторить или выбросить, а не терять молча */}
          {message.kind === 'Pending' && message.isFailed && props.convo && (
            <div class="ConvoMessage__failed">
              <span class="ConvoMessage__failedText">{lang.use('me_message_not_sent')}</span>
              <ButtonText
                class="ConvoMessage__failedAction"
                onClick={() => retryPendingMessage(props.convo!, message)}
              >
                {lang.use('me_message_retry')}
              </ButtonText>
              <ButtonText
                class="ConvoMessage__failedAction ConvoMessage__failedAction--danger"
                onClick={() => discardPendingMessage(props.convo!, message)}
              >
                {lang.use('me_message_discard')}
              </ButtonText>
            </div>
          )}

          {message.kind === 'Normal' && message.reactions && (
            <MessageReactions message={message} />
          )}

          {showReadInfo.value && readInfo() && (
            <div class="ConvoMessage__readInfo">
              <Icon16CheckDoubleOutline width="14" height="14" />
              {readInfo()}
            </div>
          )}

          <span class="ConvoMessage__time">
            {/* Пометка правки становится кнопкой, когда есть что показать */}
            {message.editHistory?.length
              ? (
                <button
                  type="button"
                  class={[
                    'ConvoMessage__editedButton',
                    showEditHistory.value && 'ConvoMessage__editedButton--active'
                  ]}
                  onClick={() => (showEditHistory.value = !showEditHistory.value)}
                  title={lang.use('me_edited_history_hint')}
                >
                  {lang.usePlural('me_edited_versions', message.editHistory.length)}
                </button>
              )
              : message.updatedAt && (lang.use('me_edited_label') + ' · ')}
            {lang
              .dateTimeFormatter({ hour: '2-digit', minute: '2-digit' })
              .format(message.sentAt)}
            {props.message.isOut && (
              <span class="ConvoMessage__status">
                <MessageOutStatusIcon message={props.message} />
              </span>
            )}
          </span>
        </div>
      </div>
    )
  }
}, {
  props: ['message', 'showName', 'openMessagePreview', 'convo']
})
