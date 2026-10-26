import { useServices } from 'services'
import * as Convo from 'model/Convo'
import * as Message from 'model/Message'
import { useReadReceiptsStore } from 'store/readReceipts'

/**
 * Что известно о прочтении сообщения.
 *
 * Точное время есть только для событий, пойманных при запущенном приложении:
 * ВК хранит лишь границу прочтения, без отметки времени по каждому сообщению
 */
export function useMessageReadInfo() {
  const { lang } = useServices()
  const readReceipts = useReadReceiptsStore()

  return (
    message: Message.Normal | Message.Pending,
    convo: Convo.Convo | undefined
  ): string | undefined => {
    if (!convo || message.kind === 'Pending' || !message.isOut) {
      return undefined
    }

    if (message.cmid > convo.outReadBy) {
      return lang.use('me_read_status_unread')
    }

    const readAt = readReceipts.findReadAt(convo.id, message.cmid)
    const isChat = convo.kind === 'ChatConvo'

    if (!readAt) {
      return lang.use(isChat ? 'me_read_status_chat_no_time' : 'me_read_status_no_time')
    }

    const time = lang
      .dateTimeFormatter({ hour: '2-digit', minute: '2-digit' })
      .format(readAt)

    return lang.use(isChat ? 'me_read_status_chat_at' : 'me_read_status_at', { time })
  }
}
