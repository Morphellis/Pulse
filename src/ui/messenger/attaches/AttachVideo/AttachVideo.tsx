import { defineComponent } from 'vue'
import { useServices } from 'services'
import * as Attach from 'model/Attach'
import * as Peer from 'model/Peer'
import { useGlobalModal } from 'hooks'
import { formatDuration } from 'misc/utils'
import { AttachVideoMessage } from 'ui/messenger/attaches/AttachVideo/AttachVideoMessage'
import { Icon24ViewOutline, Icon32PlayCircle } from 'assets/icons'
import './AttachVideo.css'

type Props = {
  video: Attach.Video
  /** Нужен только кружку — см. AttachVideoMessage */
  peerId?: Peer.Id
}

export const AttachVideo = defineComponent<Props>((props) => {
  const { lang } = useServices()
  const { videoModal } = useGlobalModal()

  return () => {
    const { video } = props

    /*
      У кружка нет ни заголовка, ни просмотров, и открывается он иначе,
      поэтому это отдельный компонент, а не ветка внутри карточки
    */
    if (video.isVideoMessage) {
      return <AttachVideoMessage video={video} peerId={props.peerId} />
    }

    return (
      <div
        class="AttachVideo"
        onClick={() => videoModal.open({ video })}
        title={video.title}
      >
        <div class="AttachVideo__preview">
          {video.image
            ? <img class="AttachVideo__image" src={video.image.url} />
            : <div class="AttachVideo__imagePlaceholder" />}

          <span class="AttachVideo__play">
            <Icon32PlayCircle />
          </span>

          {video.isLive
            ? <span class="AttachVideo__live">{lang.use('video_live')}</span>
            : video.duration !== undefined && (
              <span class="AttachVideo__duration">{formatDuration(video.duration)}</span>
            )}
        </div>

        <div class="AttachVideo__info">
          <span class="AttachVideo__title">
            {video.title || lang.use('video_untitled')}
          </span>
          {video.views !== undefined && (
            <span class="AttachVideo__views">
              <Icon24ViewOutline width="14" height="14" />
              {video.views}
            </span>
          )}
        </div>
      </div>
    )
  }
}, {
  props: ['video', 'peerId']
})
