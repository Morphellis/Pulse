import { defineComponent } from 'vue'
import { useServices } from 'services'
import * as Peer from 'model/Peer'
import { useRecipients } from 'hooks'
import { Avatar } from 'ui/ui/Avatar/Avatar'
import { Spinner } from 'ui/ui/Spinner/Spinner'
import { Icon16CheckOutline } from 'assets/icons'
import './RecipientList.css'

type Props = {
  recipients: ReturnType<typeof useRecipients>
}

/** Общий список получателей для отправки записи и пересылки сообщений */
export const RecipientList = defineComponent<Props>((props) => {
  const { lang } = useServices()

  return () => {
    const { filtered, friendsStatus, isSelected, toggle } = props.recipients

    return (
      <div class="RecipientList">
        {filtered.value.map((recipient) => (
          <div
            key={recipient.peerId}
            class={[
              'Recipient',
              isSelected(recipient.peerId) && 'Recipient--selected'
            ]}
            onClick={() => toggle(recipient.peerId)}
          >
            <Avatar peer={recipient.peer} size={32} />
            <span class="Recipient__name">{Peer.name(recipient.peer)}</span>
            {isSelected(recipient.peerId) && (
              <Icon16CheckOutline class="Recipient__check" />
            )}
          </div>
        ))}

        {friendsStatus.value === 'loading' && (
          <Spinner size="regular" class="RecipientList__spinner" />
        )}

        {filtered.value.length === 0 && friendsStatus.value !== 'loading' && (
          <div class="RecipientList__placeholder">{lang.use('share_nothing_found')}</div>
        )}
      </div>
    )
  }
}, {
  props: ['recipients']
})
