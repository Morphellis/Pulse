import { useServices } from 'services'
import * as Message from 'model/Message'
import { exclusiveByKey } from 'misc/utils'

/**
 * Помечает сообщение важным или снимает отметку.
 *
 * Отметка личная: собеседник её не видит, а ВК возвращает такие сообщения
 * отдельным фильтром
 */
export const toggleMessageImportant = exclusiveByKey(
  async (message: Message.Normal) => {
    const { api } = useServices()
    const wasImportant = !!message.isImportant

    message.isImportant = !wasImportant

    try {
      await api.fetch('messages.markAsImportant', {
        peer_id: message.peerId,
        cmids: String(message.cmid),
        important: wasImportant ? 0 : 1
      })
    } catch (error) {
      console.warn('[toggleMessageImportant] error', error)

      message.isImportant = wasImportant
    }
  },
  (message) => Message.key(message)
)
