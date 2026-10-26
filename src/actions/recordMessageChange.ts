import * as Convo from 'model/Convo'
import * as Message from 'model/Message'
import { useMessageJournalStore } from 'store/messageJournal'
import { useSettingsStore } from 'store/settings'
import { wasDeletedByUs } from './deleteMessages'

/**
 * Оставляет удалённое сообщение в переписке вместо того, чтобы убрать его.
 *
 * Возвращает true, если сообщение оставлено: вызывающий код в этом случае
 * не должен удалять его из истории
 */
export function keepDeletedMessage(convo: Convo.Convo, message: Message.Confirmed): boolean {
  const settings = useSettingsStore()

  if (!settings.keepDeletedMessages) {
    return false
  }

  // Своё намеренное удаление удерживать не нужно, оно и должно исчезнуть
  if (wasDeletedByUs(convo.id, message.cmid)) {
    return false
  }

  message.deletedAt = Date.now()

  useMessageJournalStore().add({
    kind: 'deleted',
    peerId: convo.id,
    cmid: message.cmid,
    authorId: message.authorId,
    text: Message.textOf(message),
    at: message.deletedAt
  })

  return true
}

/**
 * Переносит историю правок со старой версии сообщения на новую и дописывает
 * прежний текст. Событие о редактировании приносит уже готовое новое сообщение,
 * поэтому прежнюю версию нужно снять до замены
 */
export function keepEditedMessage(
  convo: Convo.Convo,
  previous: Message.Confirmed | undefined,
  next: Message.Confirmed
) {
  const settings = useSettingsStore()

  if (!settings.keepEditHistory || !previous) {
    return
  }

  const previousText = Message.textOf(previous)
  const nextText = Message.textOf(next)

  // Правка вложений без изменения текста историю не пополняет
  if (previousText === nextText) {
    next.editHistory = previous.editHistory
    return
  }

  next.editHistory = [...(previous.editHistory ?? []), previousText]

  // Свои правки в журнал не пишем: он про то, что сделали другие
  if (next.isOut) {
    return
  }

  useMessageJournalStore().add({
    kind: 'edited',
    peerId: convo.id,
    cmid: next.cmid,
    authorId: next.authorId,
    text: previousText,
    newText: nextText,
    at: Date.now()
  })
}
