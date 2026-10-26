import { describe, expect, test } from 'vitest'
import { estimateRegistrationDate } from 'actions/detective/registrationDate'

function year(timestamp: number) {
  return new Date(timestamp).getUTCFullYear()
}

describe(estimateRegistrationDate.name, () => {
  test('первые страницы относятся к запуску сайта', () => {
    const first = estimateRegistrationDate(1)

    expect(first).not.toBeNull()
    expect(year(first!.at)).toBe(2006)
  })

  test('оценка растёт вместе с номером страницы', () => {
    const ids = [1, 1_000_000, 50_000_000, 200_000_000, 500_000_000, 780_000_000]
    const dates = ids.map((id) => estimateRegistrationDate(id)!.at)

    for (let index = 1; index < dates.length; index++) {
      expect(dates[index]!).toBeGreaterThan(dates[index - 1]!)
    }
  })

  test('внутри размеченного диапазона оценка помечена как приблизительная', () => {
    expect(estimateRegistrationDate(300_000_000)?.precision).toBe('approximate')
  })

  test('за последней опорной точкой оценка помечена как грубая', () => {
    const fresh = estimateRegistrationDate(900_000_000)

    expect(fresh?.precision).toBe('rough')
    // Экстраполяция не должна уводить регистрацию в прошлое
    expect(year(fresh!.at)).toBeGreaterThanOrEqual(2024)
  })

  test('мусор вместо номера страницы не роняет оценку', () => {
    expect(estimateRegistrationDate(0)).toBeNull()
    expect(estimateRegistrationDate(-5)).toBeNull()
    expect(estimateRegistrationDate(Number.NaN)).toBeNull()
  })
})
