import { defineComponent, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { NotificationPayload } from 'main-process/shared'
import { Icon24Cancel } from 'assets/icons'
import 'ui/ui/Avatar/Avatar.css'
import './NotificationToast.css'

/** Столько уведомление висит на экране, если его не трогать */
const LIFETIME = 6000

type Props = {
  payload: NotificationPayload
  onActivate: (payload: NotificationPayload) => void
  onDismiss: (id: string) => void
}

export const NotificationToast = defineComponent<Props>((props) => {
  const timerId = shallowRef<number | null>(null)

  const stopTimer = () => {
    if (timerId.value !== null) {
      window.clearTimeout(timerId.value)
      timerId.value = null
    }
  }

  /*
    Наведение останавливает таймер и начинает его заново при уходе курсора:
    уведомление не должно исчезать в тот момент, когда его читают
  */
  const startTimer = () => {
    stopTimer()
    timerId.value = window.setTimeout(() => props.onDismiss(props.payload.id), LIFETIME)
  }

  onMounted(startTimer)
  onBeforeUnmount(stopTimer)

  return () => {
    const { payload } = props

    return (
      <div
        class="NotificationToast"
        onMouseenter={stopTimer}
        onMouseleave={startTimer}
        onClick={() => props.onActivate(payload)}
      >
        {payload.avatar
          ? <img class="Avatar NotificationToast__avatar" src={payload.avatar} />
          : (
            <span
              class={[
                'Avatar',
                'Avatar--size-40',
                `Avatar--color-${payload.avatarColor}`,
                'NotificationToast__avatar'
              ]}
            >
              {payload.initials}
            </span>
          )}

        <div class="NotificationToast__content">
          <div class="NotificationToast__title">{payload.title}</div>
          <div class="NotificationToast__text">
            {payload.author && <span class="NotificationToast__author">{payload.author}: </span>}
            {payload.text}
          </div>
        </div>

        <button
          class="NotificationToast__close"
          title="Закрыть"
          onClick={(event) => {
            event.stopPropagation()
            props.onDismiss(payload.id)
          }}
        >
          <Icon24Cancel width="16" height="16" />
        </button>
      </div>
    )
  }
}, {
  props: ['payload', 'onActivate', 'onDismiss']
})
