import {
  defineComponent,
  onBeforeUnmount,
  onMounted,
  shallowReactive,
  shallowRef,
  TransitionGroup
} from 'vue'
import { NotificationPayload, NotificationTheme } from 'main-process/shared'
import { NotificationToast } from 'ui/notifications/NotificationToast/NotificationToast'
import './NotificationsApp.css'

/** Больше трех карточек не помещается в угол экрана, не перекрывая половину рабочего стола */
const MAX_VISIBLE = 3

/*
  Окно уведомлений работает в песочнице и общается с main-процессом только через
  мост из notificationPreload.ts, поэтому никакого electron здесь нет
*/
const bridge = window.vkDesktopNotifications

export const NotificationsApp = defineComponent(() => {
  const items = shallowReactive<NotificationPayload[]>([])
  const scheme = shallowRef('vkcom-light')
  const colors = shallowRef<Record<string, string>>({})
  const rootEl = shallowRef<HTMLElement | null>(null)

  /*
    Высоту окна знает только эта сторона: сколько строк займет текст, заранее не посчитать.
    Меряем не по длине списка, а по реальной верстке: карточка остается в потоке,
    пока играет анимация ухода, и окно не должно схлопнуться раньше времени
  */
  const reportHeight = () => {
    const stack = rootEl.value
    const isEmpty = !stack || stack.childElementCount === 0

    bridge.resize(isEmpty ? 0 : Math.ceil(stack.offsetHeight))
  }

  const dismiss = (id: string) => {
    const index = items.findIndex((item) => item.id === id)
    if (index !== -1) {
      items.splice(index, 1)
    }
  }

  const removeByPeer = (peerId: number) => {
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i]?.peerId === peerId) {
        items.splice(i, 1)
      }
    }
  }

  const activate = (payload: NotificationPayload) => {
    bridge.activate(payload.peerId)

    // Открыв переписку, показывать остальные уведомления из нее незачем
    removeByPeer(payload.peerId)
  }

  const onAdd = (payload: NotificationPayload) => {
    items.push(payload)

    while (items.length > MAX_VISIBLE) {
      items.shift()
    }
  }

  const onClear = (peerId: number | undefined) => {
    if (peerId === undefined) {
      items.splice(0, items.length)
    } else {
      removeByPeer(peerId)
    }
  }

  const onTheme = (theme: NotificationTheme) => {
    scheme.value = theme.scheme
    colors.value = theme.colors
  }

  /*
    Наблюдатель, а не разовый замер после изменения списка: карточка остается в потоке,
    пока играет анимация ухода, и высота меняется уже после нее
  */
  let observer: ResizeObserver | null = null
  const unsubscribers: Array<() => void> = []

  onMounted(() => {
    unsubscribers.push(
      bridge.onAdd(onAdd),
      bridge.onClear(onClear),
      bridge.onTheme(onTheme)
    )

    if (rootEl.value) {
      observer = new ResizeObserver(reportHeight)
      observer.observe(rootEl.value)
    }
  })

  onBeforeUnmount(() => {
    for (const unsubscribe of unsubscribers) {
      unsubscribe()
    }
    unsubscribers.length = 0

    observer?.disconnect()
    observer = null
  })

  return () => (
    <div class="root NotificationsRoot" data-scheme={scheme.value} style={colors.value}>
      <div class="NotificationsStack" ref={rootEl}>
        <TransitionGroup name="toast">
          {items.map((payload) => (
            <NotificationToast
              key={payload.id}
              payload={payload}
              onActivate={activate}
              onDismiss={dismiss}
            />
          ))}
        </TransitionGroup>
      </div>
    </div>
  )
})
