import { useServices } from 'services'
import { UsersSearchParams } from 'services/contracts/api/methods/Users'
import { UsersUser } from 'services/contracts/api/objects/UsersUser'
import { chunk, isRecord } from 'actions/detective/common'

/**
 * Определение скрытой даты рождения.
 *
 * Поиск людей фильтрует по дате рождения даже тогда, когда она скрыта в профиле:
 * ищем человека по имени, добавляя фильтр birth_year, и смотрим, в каком году он находится.
 * Затем так же перебираем месяц и день. Все проверки укладываются в несколько execute
 */

export type BirthDateEstimate =
  | { kind: 'known', day: number, month: number, year: number }
  | { kind: 'found', day: number | null, month: number | null, year: number, checks: number }
  /** Человека не удалось найти поиском по имени, фильтровать нечего */
  | { kind: 'not_searchable', checks: number }
  | { kind: 'not_found', checks: number }

const MIN_AGE = 13
const MAX_AGE = 90
const SEARCH_BATCH = 25

export async function estimateBirthDate(user: UsersUser): Promise<BirthDateEstimate> {
  const { api } = useServices()
  const known = parseBdate(user.bdate)
  let checks = 0

  if (known?.year) {
    return { kind: 'known', day: known.day, month: known.month, year: known.year }
  }

  const contains = (response: unknown) => (
    isRecord(response) &&
    Array.isArray(response.items) &&
    response.items.some((item) => isRecord(item) && item.id === user.id)
  )

  const search = async (paramsList: UsersSearchParams[]) => {
    const results: unknown[] = []

    for (const batch of chunk(paramsList, SEARCH_BATCH)) {
      const batchResults: unknown[] = await api.fetchMany(
        batch.map((params) => api.buildMethod('users.search', params)),
        { tolerateExecuteErrors: true, retries: 1 }
      )
      checks += batch.length
      results.push(...batchResults)
    }

    return results
  }

  // Подбираем такой базовый запрос, в выдаче которого человек вообще присутствует
  const base: UsersSearchParams = {
    q: `${user.first_name} ${user.last_name}`,
    count: 1000
  }
  const variants: UsersSearchParams[] = [base]

  if (user.city?.id) {
    variants.push({ ...base, city: user.city.id })
  }
  if (user.sex) {
    variants.push({ ...base, sex: user.sex })
  }
  if (user.city?.id && user.sex) {
    variants.push({ ...base, city: user.city.id, sex: user.sex })
  }

  const baseResults = await search(variants)
  const params = variants[baseResults.findIndex(contains)]

  if (!params) {
    return { kind: 'not_searchable', checks }
  }

  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let year = currentYear - MAX_AGE; year <= currentYear - MIN_AGE; year++) {
    years.push(year)
  }

  const yearResults = await search(years.map((year) => ({ ...params, birth_year: year })))
  const year = years[yearResults.findIndex(contains)]

  if (!year) {
    return { kind: 'not_found', checks }
  }

  if (known) {
    return { kind: 'found', day: known.day, month: known.month, year, checks }
  }

  const months = Array.from({ length: 12 }, (_, index) => index + 1)
  const monthResults = await search(
    months.map((month) => ({ ...params, birth_year: year, birth_month: month }))
  )
  const month = months[monthResults.findIndex(contains)] ?? null

  if (!month) {
    return { kind: 'found', day: null, month: null, year, checks }
  }

  const days = Array.from({ length: 31 }, (_, index) => index + 1)
  const dayResults = await search(
    days.map((day) => ({ ...params, birth_year: year, birth_month: month, birth_day: day }))
  )
  const day = days[dayResults.findIndex(contains)] ?? null

  return { kind: 'found', day, month, year, checks }
}

function parseBdate(bdate: string | undefined) {
  if (!bdate) {
    return null
  }

  const [day, month, year] = bdate.split('.').map(Number)

  if (!day || !month) {
    return null
  }

  return { day, month, year: year ?? null }
}

