import { useServices } from 'services'
import * as Convo from 'model/Convo'

/**
 * Блокирует автора личной беседы (пользователя или сообщество).
 *
 * Разблокировки здесь намеренно нет, хотя account.unban заведён в контракте:
 * чтобы показать «разблокировать», нужно знать текущее состояние, а признака
 * блокировки нет ни в модели Convo, ни в объекте беседы из апи. Прежнее название
 * toggleConvoOwnerBlocked это состояние обещало, но никогда не проверяло —
 * действие всегда было односторонним
 *
 * TODO: требует источника признака блокировки (account.getBanned при старте
 * либо разбор can_write в объекте беседы) — до тех пор кнопка односторонняя
 */
export async function blockConvoOwner(convo: Convo.UserConvo | Convo.GroupConvo) {
  const { api } = useServices()

  await api.fetch('account.ban', { owner_id: convo.id })
}
