import { GroupsGroup } from 'services/contracts/api/objects/GroupsGroup'
import { UsersUser } from 'services/contracts/api/objects/UsersUser'
import { PEER_FIELDS } from 'misc/constants'

/** Всё, что можно вытащить из профиля одним users.get */
export const DOSSIER_USER_FIELDS = [
  PEER_FIELDS,
  'photo_200',
  'bdate',
  'city',
  'country',
  'home_town',
  'maiden_name',
  'domain',
  'screen_name',
  'status',
  'site',
  'followers_count',
  'counters',
  'last_seen',
  'online',
  'blacklisted',
  'blacklisted_by_me',
  'friend_status',
  'is_friend',
  'common_count',
  'relation',
  'relation_partner',
  'schools',
  'universities',
  'career',
  'occupation',
  'verified',
  'can_write_private_message',
  'can_send_friend_request',
  'has_mobile',
  'contacts',
  'connections',
  'relatives',
  'about',
  'interests',
  'activities'
].join(',')

/** Короткий набор полей для списков друзей и подписок */
export const SHORT_USER_FIELDS = [PEER_FIELDS, 'bdate', 'city', 'last_seen', 'online'].join(',')

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []

  for (let index = 0; index < array.length; index += size) {
    chunks.push(array.slice(index, index + size))
  }

  return chunks
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isUserObject(value: unknown): value is UsersUser {
  return isRecord(value) && typeof value.id === 'number' && typeof value.first_name === 'string'
}

export function isGroupObject(value: unknown): value is GroupsGroup {
  return isRecord(value) && typeof value.id === 'number' && typeof value.screen_name === 'string'
}

export function fullName(user: UsersUser) {
  return `${user.first_name} ${user.last_name}`
}

export function userLink(user: UsersUser) {
  return `https://vk.com/${user.domain ?? user.screen_name ?? `id${user.id}`}`
}

/**
 * Убирает разметку упоминаний ВК из текста: [id123|Имя] и [club45|Название]
 * превращаются в само имя, чтобы комментарий читался как обычный текст
 */
export function stripMentions(text: string) {
  return text.replace(/\[(?:id|club|public)\d+\|([^\]]+)\]/g, '$1')
}

export function describeError(error: unknown) {
  if (isRecord(error) && typeof error.message === 'string') {
    return error.message
  }

  return String(error)
}
