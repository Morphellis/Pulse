import { UsersUser } from 'services/contracts/api/objects/UsersUser'

// friends.get
export type FriendsGetParams = {
  user_id?: number
  order?: 'hints' | 'random' | 'name'
  count?: number
  offset?: number
  fields?: string
}

export type FriendsGetResponse = {
  count: number
  /** Числа без fields, объекты с fields */
  items: Array<number | UsersUser>
}

// friends.getMutual
export type FriendsGetMutualParams = {
  source_uid?: number
  target_uid?: number
  target_uids?: string
  count?: number
  offset?: number
}

export type FriendsGetMutualResponse =
  | number[]
  | Array<{ id: number, common_friends: number[], common_count: number }>
