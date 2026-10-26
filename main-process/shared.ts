import type { AppearanceScheme } from 'store/mainSettings'
import type { ActualTheme } from 'ui/app/App/useThemeScheme'

/*
  Этот модуль импортируется и в main-процессе, и в рендерере,
  поэтому здесь не должно быть импортов из Node.js или Electron
*/

/** Ширина окна уведомлений: main процесс ставит окно, рендерер верстает под эту же ширину */
export const NOTIFICATION_WIDTH = 380

/** Одно всплывающее уведомление. Готовится в основном окне, показывается в отдельном */
export type NotificationPayload = {
  id: string
  peerId: number
  /** Имя собеседника или название беседы */
  title: string
  /** Автор сообщения в беседе. В личке совпадает с title, поэтому не заполняется */
  author?: string
  text: string
  avatar?: string
  initials: string
  /** Индекс цвета заглушки аватара, повторяет логику Avatar */
  avatarColor: number
}

/** Схема и пользовательские цвета, чтобы окно уведомлений выглядело как остальное приложение */
export type NotificationTheme = {
  scheme: string
  colors: Record<string, string>
}

/**
 * Проверяет, что адрес вообще является веб-ссылкой.
 *
 * Ссылки приходят из вложений сообщений, то есть от кого угодно, а shell.openExternal
 * отдаёт системе любую схему целиком — от file:// и UNC-путей до сторонних протоколов
 * с собственными обработчиками
 */
export function isWebUrl(rawUrl: string): boolean {
  let protocol: string

  try {
    protocol = new URL(rawUrl).protocol
  } catch {
    return false
  }

  return protocol === 'https:' || protocol === 'http:'
}

export function getColorBackgroundContent(theme: ActualTheme, scheme: AppearanceScheme) {
  const key: `${typeof scheme}-${typeof theme}` = `${scheme}-${theme}`

  switch (key) {
    case 'vkcom-light':
    case 'vkui-light':
      return '#fff'
    case 'vkcom-dark':
      return '#222'
    case 'vkui-dark':
      return '#19191a'
  }
}

/**
 * Вызывает целевую функцию через delay мс после последнего вызова обертки
 */
export function debounce<Args extends unknown[]>(fn: ((...args: Args) => void), delay: number) {
  let timerId: ReturnType<typeof setTimeout> | null = null

  return function (this: unknown, ...args: Args) {
    if (timerId) {
      clearTimeout(timerId)
    }

    timerId = setTimeout(() => {
      fn.apply(this, args)
      timerId = null
    }, delay)
  }
}
