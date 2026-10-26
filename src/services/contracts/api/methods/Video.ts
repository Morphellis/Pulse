import {
  MessagesMessageAttachmentVideo
} from 'services/contracts/api/objects/MessagesMessageAttachment'

// video.get
export type VideoGetParams = {
  /** Идентификаторы вида {owner_id}_{id}_{access_key} через запятую */
  videos: string
  count?: number
}

/**
 * Нужен ради поля player: в ленте и на стене видео приходит без него,
 * а без плеера видео можно только открыть на сайте
 */
export type VideoGetResponse = {
  count: number
  items: MessagesMessageAttachmentVideo[]
}
