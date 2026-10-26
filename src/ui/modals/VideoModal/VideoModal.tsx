import { computed, defineComponent, shallowRef, watch } from 'vue'
import { useServices } from 'services'
import * as Attach from 'model/Attach'
import * as Peer from 'model/Peer'
import { resolveVideoSources } from 'actions'
import { useGlobalModal } from 'hooks'
import { Modal } from 'ui/modals/parts'
import { Button } from 'ui/ui/Button/Button'
import { Link } from 'ui/ui/Link/Link'
import { Spinner } from 'ui/ui/Spinner/Spinner'
import { VideoPlayer } from 'ui/ui/VideoPlayer/VideoPlayer'
import './VideoModal.css'

export type VideoModalParams = {
  video: Attach.Video
  /** Нужен только видеосообщениям: ссылка на них ведёт не на видео, а на переписку */
  peerId?: Peer.Id
}

/**
 * Подбираем размер окна плеера под пропорции кадра.
 *
 * Клипы и кружки вертикальные, поэтому ограничиваем их по ширине отдельно:
 * растянутый на всю ширину клип занимает экран целиком и смотрится нелепо
 */
function playerSize(video: Attach.Video): { width: number, height: number } {
  const frameWidth = video.width ?? 16
  const frameHeight = video.height ?? 9
  const isVertical = frameHeight > frameWidth

  const maxWidth = Math.min(isVertical ? 420 : 1000, Math.round(window.innerWidth * 0.85))
  const maxHeight = Math.round(window.innerHeight * 0.8)

  let width = maxWidth
  let height = Math.round((width * frameHeight) / frameWidth)

  if (height > maxHeight) {
    height = maxHeight
    width = Math.round((height * frameWidth) / frameHeight)
  }

  return { width, height }
}

/**
 * Видео играем обычным тегом video по прямой ссылке на файл — ВК отдаёт их сам,
 * см. resolveVideoSources.
 *
 * Кружки (video_message) — исключение: ВК считает выдачу их файла напрямую
 * «внешним доступом» и отказывает даже через video.get, а собственной страницы
 * на сайте у них, в отличие от обычных видео, тоже нет. Единственное официально
 * работающее место — переписка в самом ВК, поэтому для кружков сразу показываем
 * объяснение со ссылкой на неё, не тратя запрос на заведомо обречённый video.get
 */
export const VideoModal = defineComponent<VideoModalParams>((params) => {
  const { lang } = useServices()
  const { videoModal } = useGlobalModal()

  const size = computed(() => playerSize(params.video))
  const pageUrl = computed(() => (
    params.video.isVideoMessage && params.peerId !== undefined
      ? Peer.convoUrl(params.peerId)
      : Attach.videoUrl(params.video)
  ))

  const sources = shallowRef<Attach.VideoSource[]>([])
  const status = shallowRef<'loading' | 'ready' | 'unavailable'>('loading')

  const load = async (ignoreCache = false) => {
    const { video } = params

    status.value = 'loading'

    try {
      const resolved = await resolveVideoSources(video, { ignoreCache })

      // Пока грузились, модалку могли переоткрыть на другом видео
      if (params.video !== video) {
        return
      }

      sources.value = resolved
      status.value = resolved.length > 0 ? 'ready' : 'unavailable'
    } catch (error) {
      console.warn('[VideoModal] не удалось получить ссылки на видео', error)

      if (params.video === video) {
        status.value = 'unavailable'
      }
    }
  }

  /*
    Ссылки ВК живут несколько дней и протухают. Если файл не проигрался,
    один раз просим ВК выдать их заново, минуя кеш.
    Флаг именно на видео, а не на модалку: модалка переиспользуется между
    открытиями, и без сброса вторая неудачная ссылка теряла бы свою попытку
  */
  let wasRetried = false

  /*
    Модалка переиспользуется между открытиями, поэтому всё, что зависит
    от видео, пересчитываем по watch, а не один раз в setup
  */
  watch(() => params.video, (video) => {
    wasRetried = false
    sources.value = []

    if (video.isVideoMessage) {
      status.value = 'unavailable'
      return
    }

    void load()
  }, { immediate: true })

  const onMediaError = () => {
    if (wasRetried) {
      status.value = 'unavailable'
      return
    }

    wasRetried = true
    void load(true)
  }

  return () => {
    const { video } = params

    const unavailableText = video.isVideoMessage
      ? 'video_message_only_in_vk'
      : video.isLive
        ? 'video_live_only_in_vk'
        : 'video_only_in_vk'

    return (
      <Modal
        title={video.title || lang.use(
          video.isVideoMessage ? 'video_message_title' : 'video_untitled'
        )}
        opened={videoModal.opened}
        onClose={videoModal.close}
        onVisibilityChange={videoModal.onVisibilityChange}
        withoutBodyPadding
        class="VideoModal"
        style={{ width: `${size.value.width}px` }}
        buttons={
          <Link href={pageUrl.value}>
            <Button mode="secondary">{lang.use('video_open_in_vk')}</Button>
          </Link>
        }
      >
        <div
          class="VideoModal__player"
          style={{ width: `${size.value.width}px`, height: `${size.value.height}px` }}
        >
          {status.value === 'ready' && (
            <VideoPlayer
              key={Attach.id(video)}
              sources={sources.value}
              poster={video.image?.url}
              viewportHeight={size.value.height}
              onMediaError={onMediaError}
            />
          )}

          {status.value === 'loading' && (
            <div class="VideoModal__state">
              <Spinner size="medium" />
            </div>
          )}

          {status.value === 'unavailable' && (
            <div class="VideoModal__state">
              {lang.use(unavailableText)}
            </div>
          )}
        </div>
      </Modal>
    )
  }
}, {
  props: ['video', 'peerId']
})
