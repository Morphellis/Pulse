import { GroupsGroup } from 'services/contracts/api/objects/GroupsGroup'
import { NewsfeedItem } from 'services/contracts/api/objects/NewsfeedItem'
import { UsersUser } from 'services/contracts/api/objects/UsersUser'
import { WallWallpost } from 'services/contracts/api/objects/WallWallpost'

// newsfeed.get
export type NewsfeedGetParams = {
  /** Типы новостей через запятую: post, photo, wall_photo, friend, note, audio, video */
  filters?: string
  count?: number
  /**
   * Курсор следующей страницы из next_from предыдущего ответа.
   * Лента не пагинируется по offset: пока листаешь, наверху появляются новые посты
   */
  start_from?: string
  fields?: string
}

export type NewsfeedGetResponse = {
  items: NewsfeedItem[]
  profiles?: UsersUser[]
  groups?: GroupsGroup[]
  /** Отсутствует, когда лента закончилась */
  next_from?: string
  /** Тип ленты, который выбрал сервер. Сейчас всегда recent */
  feed_type?: string
}

// newsfeed.search
export type NewsfeedSearchParams = {
  q: string
  count?: number
  start_from?: string
  extended?: 1
  fields?: string
}

/**
 * В отличие от newsfeed.get отдаёт записи в форме стены: айди в id, владелец
 * в owner_id. Поэтому конвертируется тем же fromApiWallPost
 */
export type NewsfeedSearchResponse = {
  count: number
  items: WallWallpost[]
  profiles?: UsersUser[]
  groups?: GroupsGroup[]
  next_from?: string
}
