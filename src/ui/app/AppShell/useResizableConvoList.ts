import { computed } from 'vue'
import { useSettingsStore } from 'store/settings'

/** Ниже этой ширины список выглядит сломанным, поэтому дальше он схлопывается */
const COLLAPSE_THRESHOLD = 140
const MIN_WIDTH = 72
const MAX_WIDTH = 640

/**
 * Позволяет тянуть границу списка диалогов мышью и полностью его скрывать,
 * как в телеграме. Ширина запоминается между запусками
 */
export function useResizableConvoList() {
  const settings = useSettingsStore()

  const isCollapsed = computed(() => settings.convoListCollapsed)

  /** Инлайновый стиль ставим только когда пользователь сам задал ширину */
  const style = computed(() => (
    settings.convoListWidth === null
      ? undefined
      : { width: `${settings.convoListWidth}px` }
  ))

  /** Узкий список показываем в компактном виде - только аватарки */
  const isCompact = computed(() => (
    settings.convoListWidth !== null && settings.convoListWidth <= 110
  ))

  const expand = () => {
    settings.convoListCollapsed = false

    if (settings.convoListWidth !== null && settings.convoListWidth < COLLAPSE_THRESHOLD) {
      settings.convoListWidth = COLLAPSE_THRESHOLD
    }
  }

  const toggle = () => {
    if (settings.convoListCollapsed) {
      expand()
    } else {
      settings.convoListCollapsed = true
    }
  }

  const onResizeStart = (event: PointerEvent) => {
    const resizer = event.currentTarget
    const list = resizer instanceof HTMLElement ? resizer.previousElementSibling : null

    if (!(resizer instanceof HTMLElement) || !(list instanceof HTMLElement)) {
      return
    }

    event.preventDefault()
    resizer.setPointerCapture(event.pointerId)

    // Когда список скрыт, его ширина равна нулю, и он растягивается из этой точки
    const startX = event.clientX
    const startWidth = settings.convoListCollapsed ? 0 : list.getBoundingClientRect().width

    const onPointerMove = (moveEvent: PointerEvent) => {
      const rawWidth = startWidth + (moveEvent.clientX - startX)

      if (rawWidth < COLLAPSE_THRESHOLD) {
        settings.convoListCollapsed = true
        return
      }

      settings.convoListCollapsed = false
      settings.convoListWidth = Math.round(Math.min(Math.max(rawWidth, MIN_WIDTH), MAX_WIDTH))
    }

    const onPointerUp = () => {
      resizer.releasePointerCapture(event.pointerId)
      resizer.removeEventListener('pointermove', onPointerMove)
      resizer.removeEventListener('pointerup', onPointerUp)
      resizer.removeEventListener('pointercancel', onPointerUp)
    }

    resizer.addEventListener('pointermove', onPointerMove)
    resizer.addEventListener('pointerup', onPointerUp)
    resizer.addEventListener('pointercancel', onPointerUp)
  }

  return {
    isCollapsed,
    isCompact,
    style,
    expand,
    toggle,
    onResizeStart
  }
}
