import { BaseImage } from 'services/contracts/api/objects/BaseImage'
import {
  MessagesMessageAttachment,
  MessagesMessageAttachmentAudioMessage,
  MessagesMessageAttachmentDoc,
  MessagesMessageAttachmentVideo,
  MessagesMessageAttachmentVideoFiles,
  MessagesMessageAttachmentWall
} from 'services/contracts/api/objects/MessagesMessageAttachment'
import { PhotosPhoto } from 'services/contracts/api/objects/PhotosPhoto'
import { PhotosPhotoSize } from 'services/contracts/api/objects/PhotosPhotoSize'
import * as Attach from 'model/Attach'
import * as Peer from 'model/Peer'
import { insertPeers } from 'actions'
import { isNonEmptyArray } from 'misc/utils'

export function fromApiAttaches(
  apiAttaches: MessagesMessageAttachment[],
  wasVoiceMessageListened: boolean
): Attach.Attaches {
  const attaches: Attach.Attaches = {}

  const addUnknown = (attach: MessagesMessageAttachment) => {
    const unknown = {
      kind: 'Unknown' as const,
      type: attach.type,
      raw: attach
    }
    attaches.unknown = [...(attaches.unknown ?? []), unknown]
  }

  for (const apiAttach of apiAttaches) {
    switch (apiAttach.type) {
      case 'sticker': {
        if (!apiAttach.sticker?.sticker_id || !apiAttach.sticker.product_id) {
          addUnknown(apiAttach)
          break
        }

        attaches.sticker = {
          kind: 'Sticker',
          id: apiAttach.sticker.sticker_id,
          packId: apiAttach.sticker.product_id,
          images: fromApiImageList(apiAttach.sticker.images ?? []),
          imagesWithBackground: fromApiImageList(apiAttach.sticker.images_with_background ?? [])
        }
        break
      }

      case 'audio_message': {
        if (!apiAttach.audio_message) {
          addUnknown(apiAttach)
          break
        }

        attaches.voice = fromApiAttachVoice(apiAttach.audio_message, wasVoiceMessageListened)
        break
      }

      case 'photo': {
        const photo = apiAttach.photo && fromApiAttachPhoto(apiAttach.photo)

        if (!photo) {
          addUnknown(apiAttach)
          break
        }

        attaches.photos = [...(attaches.photos ?? []), photo]
        break
      }

      case 'video': {
        if (!apiAttach.video) {
          addUnknown(apiAttach)
          break
        }

        attaches.videos = [
          ...(attaches.videos ?? []),
          fromApiAttachVideo(apiAttach.video)
        ]
        break
      }

      /*
        Кружок приходит не видео с особым типом, а отдельным видом вложения
        со своим полем. Внутри лежит тот же объект видео, поэтому разбираем так же.
        ВК отдаёт его с response_type: min и без единого поля, которое можно
        было бы использовать (ни files, ни player, ни расшифровки) - ни через
        messages.getDiffContent, ни через video.get. Дальше пытаться уже нечего
      */
      case 'video_message': {
        if (!apiAttach.video_message) {
          addUnknown(apiAttach)
          break
        }

        attaches.videos = [
          ...(attaches.videos ?? []),
          fromApiAttachVideo(apiAttach.video_message, true)
        ]
        break
      }

      case 'doc': {
        if (!apiAttach.doc) {
          addUnknown(apiAttach)
          break
        }

        attaches.docs = [...(attaches.docs ?? []), fromApiAttachDoc(apiAttach.doc)]
        break
      }

      case 'link': {
        if (!apiAttach.link) {
          addUnknown(apiAttach)
          break
        }

        const link: Attach.Link = {
          kind: 'Link',
          url: apiAttach.link.url,
          title: apiAttach.link.title || apiAttach.link.description || '',
          caption: apiAttach.link.caption || apiAttach.link.url,
          imageSizes: apiAttach.link.photo?.sizes
            ? fromApiImageSizes(apiAttach.link.photo.sizes)
            : undefined
        }

        attaches.links = [...(attaches.links ?? []), link]
        break
      }

      case 'wall': {
        const wall = apiAttach.wall && fromApiAttachWall(apiAttach.wall)

        if (!wall) {
          addUnknown(apiAttach)
          break
        }

        attaches.wall = wall
        break
      }

      default: {
        addUnknown(apiAttach)
        break
      }
    }
  }

  return attaches
}

function fromApiAttachWall(apiWall: MessagesMessageAttachmentWall): Attach.Wall | undefined {
  const rawOwnerId = apiWall.owner_id ?? apiWall.to_id

  if (!apiWall.id || !rawOwnerId || !apiWall.from_id) {
    return
  }

  if (apiWall.from) {
    insertPeers(
      'first_name' in apiWall.from
        ? { profiles: [apiWall.from] }
        : { groups: [apiWall.from] }
    )
  }

  return {
    kind: 'Wall',
    id: apiWall.id,
    ownerId: Peer.resolveOwnerId(rawOwnerId),
    authorId: Peer.resolveOwnerId(apiWall.from_id),
    accessKey: apiWall.access_key,
    createdAt: (apiWall.date ?? 0) * 1000,
    text: apiWall.text ?? '',
    attaches: fromApiAttaches(apiWall.attachments ?? [], true),
    isDeleted: !!apiWall.is_deleted,
    donutPlaceholder: apiWall.donut?.placeholder?.text,
    repost: apiWall.copy_history?.[0]
      ? fromApiAttachWall(apiWall.copy_history[0])
      : undefined
  }
}

export function fromApiAttachVideo(
  apiVideo: MessagesMessageAttachmentVideo,
  isVideoMessage = false
): Attach.Video {
  // Обложку берём из image, а не из first_frame: first_frame часто пустой
  const images = apiVideo.image ?? apiVideo.first_frame ?? []
  const largestImage = images.reduce<BaseImage | undefined>((largest, image) => (
    !largest || image.width > largest.width ? image : largest
  ), undefined)

  return {
    kind: 'Video',
    id: apiVideo.id,
    ownerId: Peer.resolveOwnerId(apiVideo.owner_id),
    accessKey: apiVideo.access_key,
    title: apiVideo.title ?? '',
    duration: apiVideo.duration,
    image: largestImage,
    views: apiVideo.views,
    player: apiVideo.player,
    isLive: !!apiVideo.live,
    canPlay: apiVideo.can_play !== 0,
    isVideoMessage: isVideoMessage || apiVideo.type === 'video_message',
    width: apiVideo.width,
    height: apiVideo.height,
    sources: fromApiVideoFiles(apiVideo.files)
  }
}

/**
 * Оставляем только готовые mp4 и сортируем от лучшего качества к худшему.
 *
 * Остальные форматы (hls, dash, rtmp) Chromium играть не умеет, а собственный
 * разборщик манифестов ради прямых эфиров того не стоит: у них есть только они
 */
export function fromApiVideoFiles(
  files: MessagesMessageAttachmentVideoFiles | undefined
): Attach.VideoSource[] | undefined {
  if (!files) {
    return
  }

  const sources: Attach.VideoSource[] = []

  for (const [key, url] of Object.entries(files)) {
    const height = Number(key.replace('mp4_', ''))

    if (key.startsWith('mp4_') && !Number.isNaN(height) && typeof url === 'string') {
      sources.push({ height, url })
    }
  }

  return sources.sort((a, b) => b.height - a.height)
}

export function fromApiAttachDoc(apiDoc: MessagesMessageAttachmentDoc): Attach.Doc {
  return {
    kind: 'Doc',
    id: apiDoc.id,
    ownerId: Peer.resolveOwnerId(apiDoc.owner_id),
    accessKey: apiDoc.access_key,
    title: apiDoc.title,
    ext: apiDoc.ext,
    size: apiDoc.size,
    url: apiDoc.url,
    isUnsafe: !!apiDoc.is_unsafe
  }
}

export function fromApiAttachVoice(
  apiVoice: MessagesMessageAttachmentAudioMessage,
  wasListened: boolean
): Attach.Voice {
  return {
    kind: 'Voice',
    id: apiVoice.id,
    ownerId: Peer.resolveOwnerId(apiVoice.owner_id),
    accessKey: apiVoice.access_key,
    linkMp3: apiVoice.link_mp3,
    linkOgg: apiVoice.link_ogg,
    duration: apiVoice.duration,
    waveform: apiVoice.waveform,
    wasListened,
    transcript: apiVoice.transcript?.trim() ?? '',
    transcriptState: apiVoice.transcript_state
  }
}

export function fromApiAttachPhoto(apiPhoto: PhotosPhoto): Attach.Photo | undefined {
  if (!apiPhoto.orig_photo) {
    return
  }

  return {
    kind: 'Photo',
    id: apiPhoto.id,
    ownerId: Peer.resolveOwnerId(apiPhoto.owner_id),
    accessKey: apiPhoto.access_key,
    image: apiPhoto.orig_photo,
    sizes: fromApiImageSizes(apiPhoto.sizes ?? [])
  }
}

function fromApiImageList(apiImages: BaseImage[]): Attach.ImageList | undefined {
  const images = apiImages.map((image) => ({
    url: image.url,
    width: image.width,
    height: image.height
  }))

  if (!isNonEmptyArray(images)) {
    return undefined
  }

  return images
}

function fromApiImageSizes(apiImageSizes: PhotosPhotoSize[]): Attach.ImageSizes {
  const sizes: Attach.ImageSizes = new Map()

  for (const size of apiImageSizes) {
    sizes.set(size.type as Attach.ImageSize, size)
  }

  return sizes
}
