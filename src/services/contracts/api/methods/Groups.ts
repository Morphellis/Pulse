import { GroupsGroup } from 'services/contracts/api/objects/GroupsGroup'
import { UsersUser } from 'services/contracts/api/objects/UsersUser'

// groups.getById
export type GroupsGetByIdParams = {
  group_ids: string | number
  fields: string
}

export type GroupsGetByIdResponse = {
  groups: GroupsGroup[]
  profiles: UsersUser[]
}

// groups.get
export type GroupsGetParams = {
  user_id?: number
  extended?: 0 | 1
  filter?: string
  fields?: string
  offset?: number
  /** Максимум 1000 */
  count?: number
}

export type GroupsGetResponse = {
  count: number
  /** Числа без extended, объекты с extended */
  items: Array<number | GroupsGroup>
}
