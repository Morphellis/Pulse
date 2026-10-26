import { computed } from 'vue'
import { useSettingsStore } from 'store/settings'
import { contrastTextColor, shade, withAlpha } from 'misc/color'

/** Готовые варианты акцента: первый столбец палитры в настройках */
export const ACCENT_PRESETS = [
  '#2688eb',
  '#5c6bc0',
  '#7c4dff',
  '#ab47bc',
  '#e91e63',
  '#f4511e',
  '#f9a825',
  '#43a047',
  '#00897b',
  '#546e7a'
]

/**
 * Собирает переопределения токенов VKUI из выбранных пользователем цветов.
 *
 * Стили возвращаются для инлайнового применения к элементу со схемой: только так
 * они перебьют объявления самой схемы, заданные на том же элементе
 */
export function useAppearanceColors() {
  const settings = useSettingsStore()

  return computed<Record<string, string>>(() => {
    const style: Record<string, string> = {}
    const { accentColor, outgoingMessageColor } = settings

    if (accentColor) {
      const hover = shade(accentColor, -0.12)
      const active = shade(accentColor, -0.2)
      const onAccent = contrastTextColor(accentColor)

      Object.assign(style, {
        '--vkui--color_background_accent': accentColor,
        '--vkui--color_background_accent--hover': hover,
        '--vkui--color_background_accent--active': active,
        '--vkui--color_background_accent_themed': accentColor,
        '--vkui--color_background_accent_themed--hover': hover,
        '--vkui--color_background_accent_themed--active': active,

        '--vkui--color_icon_accent': accentColor,
        '--vkui--color_icon_accent_themed': accentColor,

        '--vkui--color_text_accent': accentColor,
        '--vkui--color_text_accent_themed': accentColor,
        '--vkui--color_text_link': accentColor,
        '--vkui--color_text_link--hover': hover,
        '--vkui--color_text_contrast_themed': onAccent,

        '--vkui--color_stroke_accent': accentColor,
        '--vkui--color_stroke_accent_themed': accentColor,
        // Полупрозрачный вариант используется как свечение вокруг поля в фокусе
        '--vkui--color_stroke_accent--active': withAlpha(accentColor, 0.24)
      })
    }

    if (outgoingMessageColor) {
      style['--vkd--color_background_message_out'] = outgoingMessageColor
    }

    return style
  })
}
