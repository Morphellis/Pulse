import { BaseImage } from 'services/contracts/api/objects/BaseImage'
import { GroupsGroup } from 'services/contracts/api/objects/GroupsGroup'
import { PhotosPhoto } from 'services/contracts/api/objects/PhotosPhoto'
import { PhotosPhotoSize } from 'services/contracts/api/objects/PhotosPhotoSize'
import { UsersUser } from 'services/contracts/api/objects/UsersUser'

export type MessagesMessageAttachment = {
  type: MessagesMessageAttachmentType
  photo?: PhotosPhoto
  audio?: unknown
  video?: MessagesMessageAttachmentVideo
  video_playlist?: unknown
  video_message?: MessagesMessageAttachmentVideo
  doc?: MessagesMessageAttachmentDoc
  link?: MessagesMessageAttachmentLink
  market?: unknown
  gift?: unknown
  sticker?: MessagesMessageAttachmentsSticker
  wall?: MessagesMessageAttachmentWall
  wall_reply?: unknown
  money_transfer?: unknown
  money_request?: unknown
  story?: unknown
  article?: unknown
  poll?: unknown
  audio_playlist?: unknown
  podcast?: unknown
  group?: unknown
  curator?: unknown
  widget?: unknown
  link_curator?: unknown
  vkpay?: unknown
  ugc_sticker?: unknown
  album?: unknown
  market_album?: unknown
  call?: unknown
  graffiti?: unknown
  audio_message?: MessagesMessageAttachmentAudioMessage
  artist?: unknown
  event?: unknown
  mini_app?: unknown
  group_call_in_progress?: unknown
  donut_link?: unknown
  narrative?: unknown
  app_action?: unknown
  question?: unknown
  sticker_pack_preview?: unknown
}

export type MessagesMessageAttachmentType =
  | 'photo'
  | 'audio'
  | 'video'
  | 'video_playlist'
  | 'video_message'
  | 'doc'
  | 'link'
  | 'market'
  | 'gift'
  | 'sticker'
  | 'wall'
  | 'wall_reply'
  | 'money_transfer'
  | 'money_request'
  | 'story'
  | 'article'
  | 'poll'
  | 'audio_playlist'
  | 'podcast'
  | 'group'
  | 'curator'
  | 'widget'
  | 'link_curator'
  | 'vkpay'
  | 'ugc_sticker'
  | 'album'
  | 'market_album'
  | 'call'
  | 'graffiti'
  | 'audio_message'
  | 'artist'
  | 'event'
  | 'mini_app'
  | 'group_call_in_progress'
  | 'donut_link'
  | 'narrative'
  | 'app_action'
  | 'question'
  | 'sticker_pack_preview'

export type MessagesMessageAttachmentGeo = {
  coordinates?: {
    latitude: number
    longitude: number
  }
  place?: {
    address?: string
    checkins?: number
    city?: string
    country?: string
    created?: number
    icon?: string
    id?: number
    latitude?: number
    longitude?: number
    title?: string
    type?: string
  }
  showmap?: number
  type?: string
}

type MessagesMessageAttachmentsSticker = {
  inner_type: 'base_sticker_new'
  sticker_id?: number
  product_id?: number
  images?: BaseImage[]
  images_with_background?: BaseImage[]
  animation_url?: string
  animations?: Array<{
    type?: 'light' | 'dark'
    url?: string
  }>
  is_allowed?: boolean
  render?: {
    id?: string
    images: BaseImage[]
    is_stub?: boolean
    is_rendering?: boolean
  }
  vmoji?: {
    character_id: string
  }
  image_config_context?: {
    config_id?: number
    version?: number
  }
}

export type MessagesMessageAttachmentDoc = {
  id: number
  owner_id: number
  title: string
  /** Размер в байтах */
  size: number
  /** Расширение без точки */
  ext: string
  date: number
  /** Ссылка на скачивание. Живёт ограниченное время */
  url?: string
  access_key?: string
  /** 1, если ВК считает файл потенциально опасным */
  is_unsafe?: boolean
  preview?: {
    photo?: { sizes?: PhotosPhotoSize[] }
  }
}

export type MessagesMessageAttachmentVideo = {
  id: number
  owner_id: number
  title?: string
  description?: string
  /** Длительность в секундах. У прямых эфиров отсутствует */
  duration?: number
  /** Обложки разного размера */
  image?: BaseImage[]
  first_frame?: BaseImage[]
  access_key?: string
  views?: number
  /** Ссылка на страницу встраиваемого плеера. Личные видео ВК через неё не отдаёт */
  player?: string
  /** 1 у прямого эфира */
  live?: number
  /** 0, если видео недоступно для просмотра */
  can_play?: number
  platform?: string
  /** Помимо перечисленных ВК присылает и другие виды. video_message — кружок */
  type?: 'video' | 'video_message' | 'short_video' | 'live' | (string & {})
  width?: number
  height?: number
  /**
   * Прямые ссылки на медиа. Приходят только тому клиенту, который представился
   * не браузером, поэтому в ленте и на стене их нет — там видео резолвится отдельно
   */
  files?: MessagesMessageAttachmentVideoFiles
}

/**
 * Ключи вида mp4_<высота кадра> — готовые файлы, их играет обычный video.
 * hls и dash Chromium не понимает: они остаются только у прямых эфиров,
 * где кроме них ничего и нет
 */
export type MessagesMessageAttachmentVideoFiles = {
  mp4_144?: string
  mp4_240?: string
  mp4_360?: string
  mp4_480?: string
  mp4_720?: string
  mp4_1080?: string
  mp4_1440?: string
  mp4_2160?: string
  hls?: string
  dash_sep?: string
  hls_live?: string
  dash_live?: string
  rtmp?: string
  failover_host?: string
}

type MessagesMessageAttachmentLink = {
  url: string
  title?: string
  description?: string
  caption?: string
  photo?: PhotosPhoto
}

export type MessagesMessageAttachmentAudioMessage = {
  id: number
  owner_id: number
  access_key: string
  link_mp3: string
  link_ogg: string
  duration: number
  waveform: number[]
  transcript?: string
  transcript_state: 'in_progress' | 'done' | 'error'
}

export type MessagesMessageAttachmentWall = {
  inner_type: 'wall_wallpost'
  id?: number
  /** Айди автора стены, иногда может не приходить */
  owner_id?: number
  /** Айди автора стены, если не пришел owner_id */
  to_id?: number
  /** Айди автора поста, может отличаться от автора стены */
  from_id?: number
  from?: UsersUser | GroupsGroup
  access_key?: string
  date?: number
  text?: string
  attachments?: MessagesMessageAttachment[]
  copy_history?: MessagesMessageAttachmentWall[]
  poster?: unknown
  views?: { count: number }
  is_deleted?: boolean
  deleted_reason?: string
  deleted_details?: string
  donut?: {
    is_donut: boolean
    placeholder?: { text: string }
  }
}
