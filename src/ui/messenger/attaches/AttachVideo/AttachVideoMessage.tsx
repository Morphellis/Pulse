import { defineComponent } from 'vue'
import * as Attach from 'model/Attach'
import * as Peer from 'model/Peer'
import { useGlobalModal } from 'hooks'
import { formatDuration } from 'misc/utils'
import { Icon32PlayCircle } from 'assets/icons'
import './AttachVideoMessage.css'

type Props = {
  video: Attach.Video
  /** Нужен, чтобы кнопка в модалке вела на переписку, а не на несуществующую страницу видео */
  peerId: Peer.Id | undefined
}

/**
 * Кружок ВК не отдаёт напрямую: ни файл, ни свою страницу на сайте — то и другое
 * ВК считает «внешним доступом» и отказывает даже через messenger-токен
 * (см. объяснение в VideoModal). Поэтому здесь только превью со счётчиком
 * длительности, а клик открывает модалку с объяснением и ссылкой на переписку
 */
export const AttachVideoMessage = defineComponent<Props>((props) => {
  const { videoModal } = useGlobalModal()

  return () => {
    const { video } = props

    return (
      <div
        class="AttachVideoMessage"
        onClick={() => videoModal.open({ video, peerId: props.peerId })}
      >
        {video.image ? (
          <img class="AttachVideoMessage__preview" src={video.image.url} />
        ) : (
          <div class="AttachVideoMessage__placeholder" />
        )}

        <span class="AttachVideoMessage__center AttachVideoMessage__play">
          <Icon32PlayCircle />
        </span>

        {video.duration !== undefined && (
          <span class="AttachVideoMessage__duration">{formatDuration(video.duration)}</span>
        )}
      </div>
    )
  }
}, {
  props: ['video', 'peerId']
})
