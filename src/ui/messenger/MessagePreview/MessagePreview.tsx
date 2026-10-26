import { defineComponent } from 'vue'
import { useServices } from 'services'
import * as Message from 'model/Message'
import { PlainServiceMessage } from 'ui/messenger/ServiceMessage/ServiceMessage'
import './MessagePreview.css'

type Props = {
  message: Message.Message | Message.Foreign | Message.Pinned
  accent?: boolean
}

export const MessagePreview = defineComponent<Props>((props) => {
  const { lang } = useServices()

  return () => {
    const { message, accent } = props
    const className = accent ? 'MessagePreview--accent' : 'MessagePreview'

    if (message.kind === 'Expired') {
      return (
        <span class={className}>
          {lang.usePlural('me_messages_disappeared', 1)}
        </span>
      )
    }

    if (message.kind === 'Service') {
      return <PlainServiceMessage message={message} />
    }

    const attachmentPreview = Message.attachesPreview(message, lang)

    if (!message.text && !attachmentPreview) {
      return (
        <span class={className}>
          {lang.use('me_empty_message')}
        </span>
      )
    }

    return (
      <>
        {message.text}

        {attachmentPreview && (
          <span class={className}>
            {message.text && ' '}
            {attachmentPreview}
          </span>
        )}
      </>
    )
  }
}, {
  props: ['message', 'accent']
})

