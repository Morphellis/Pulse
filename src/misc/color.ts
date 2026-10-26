type Rgb = { r: number, g: number, b: number }

/** Принимает #rgb и #rrggbb, возвращает undefined на всём остальном */
export function parseHex(hex: string): Rgb | undefined {
  const value = hex.trim().replace(/^#/, '')

  const expanded = value.length === 3
    ? value.split('').map((char) => char + char).join('')
    : value

  if (!/^[\da-f]{6}$/i.test(expanded)) {
    return undefined
  }

  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16)
  }
}

export function toHex({ r, g, b }: Rgb): string {
  const channel = (value: number) => (
    Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0')
  )

  return `#${channel(r)}${channel(g)}${channel(b)}`
}

/**
 * Осветляет при amount > 0 и затемняет при amount < 0.
 *
 * Мешаем с белым или чёрным вместо работы в HSL: для наведения и нажатия
 * этого достаточно, а поведение предсказуемо на любом исходном цвете
 */
export function shade(hex: string, amount: number): string {
  const rgb = parseHex(hex)

  if (!rgb) {
    return hex
  }

  const target = amount > 0 ? 255 : 0
  const ratio = Math.abs(amount)

  return toHex({
    r: rgb.r + (target - rgb.r) * ratio,
    g: rgb.g + (target - rgb.g) * ratio,
    b: rgb.b + (target - rgb.b) * ratio
  })
}

export function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex)

  if (!rgb) {
    return hex
  }

  return `rgb(${rgb.r} ${rgb.g} ${rgb.b} / ${clamp(alpha, 0, 1)})`
}

/**
 * Относительная яркость по WCAG. Нужна, чтобы понять, какой текст читается
 * поверх выбранного цвета: на жёлтом акценте белые подписи было бы не разобрать
 */
export function luminance(hex: string): number {
  const rgb = parseHex(hex)

  if (!rgb) {
    return 0
  }

  const channel = (value: number) => {
    const normalized = value / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  }

  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
}

export function contrastTextColor(hex: string): string {
  return luminance(hex) > 0.5 ? '#000000' : '#ffffff'
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
