import { useServices } from 'services'
import { describeApiError } from 'services/contracts/IApi'
import * as Convo from 'model/Convo'
import { exclusiveByKey } from 'misc/utils'

/**
 * Включает и выключает уведомления по беседе целиком (не привязано к каналам).
 *
 * Как и остальные действия над беседой, применяет изменение сразу и откатывает
 * его при ошибке: раньше состояние менялось только после успеха, а неудача уходила
 * в консоль — пользователь жал кнопку, ничего не происходило, и понять почему
 * было неоткуда. Вернувшийся на место значок и есть сообщение о неудаче
 */
export const toggleConvoMute = exclusiveByKey(
  async (convo: Convo.Convo) => {
    const { api } = useServices()
    const wasEnabled = convo.notifications.enabled

    convo.notifications.enabled = !wasEnabled

    try {
      await api.fetch('account.setSilenceMode', {
        peer_id: convo.id,
        sound: wasEnabled ? 0 : 1,
        time: wasEnabled ? -1 : 0
      })
    } catch (error) {
      console.warn('[toggleConvoMute] error:', describeApiError(error))

      convo.notifications.enabled = wasEnabled
    }
  },
  (convo) => String(convo.id)
)
