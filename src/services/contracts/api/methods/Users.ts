import { UsersUser } from 'services/contracts/api/objects/UsersUser'

// users.get
export type UsersGetParams = {
  user_ids?: string | number
  fields: string
}

export type UsersGetResponse = UsersUser[]

// users.search
export type UsersSearchParams = {
  q?: string
  /** 0 — по популярности, 1 — по дате регистрации */
  sort?: 0 | 1
  offset?: number
  /** Максимум 1000 результатов даже с offset */
  count?: number
  fields?: string
  city?: number
  country?: number
  hometown?: string
  sex?: 0 | 1 | 2
  age_from?: number
  age_to?: number
  birth_day?: number
  birth_month?: number
  birth_year?: number
  has_photo?: 0 | 1
}

export type UsersSearchResponse = {
  count: number
  items: UsersUser[]
}

// users.getFollowers
export type UsersGetFollowersParams = {
  user_id: number
  offset?: number
  count?: number
  fields?: string
}

export type UsersGetFollowersResponse = {
  count: number
  /** Числа без fields, объекты с fields */
  items: Array<number | UsersUser>
}

// users.getSubscriptions
export type UsersGetSubscriptionsParams = {
  user_id: number
  offset?: number
  count?: number
}

/**
 * Метод отвечает двумя отдельными блоками с идентификаторами.
 *
 * Формы с extended=1 здесь намеренно нет: для чужого профиля она отдаёт
 * верный count и пустой items (см. actions/detective/loadOwners)
 */
export type UsersGetSubscriptionsResponse = {
  users?: { count: number, items: number[] }
  groups?: { count: number, items: number[] }
}
