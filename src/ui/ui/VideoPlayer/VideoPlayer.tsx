import { computed, defineComponent, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { useServices } from 'services'
import * as Attach from 'model/Attach'
import { formatDuration } from 'misc/utils'
import { ButtonIcon } from 'ui/ui/ButtonIcon/ButtonIcon'
import { Spinner } from 'ui/ui/Spinner/Spinner'
import {
  Icon24FullscreenExitOutline,
  Icon24FullscreenOutline,
  Icon24MuteOutline,
  Icon24Pause,
  Icon24Play,
  Icon24VolumeOutline
} from 'assets/icons'
import './VideoPlayer.css'

type Props = {
  /** Файлы от лучшего качества к худшему */
  sources: Attach.VideoSource[]
  poster?: string
  /** Высота области плеера в пикселях: под неё подбирается качество */
  viewportHeight?: number
  /** Вызывается, когда файл не проигрался: ссылки ВК живут несколько дней и протухают */
  onMediaError?: () => void
}

/** Через сколько прячем панель управления, если мышью не двигают */
const CONTROLS_HIDE_DELAY = 2500
/** Шаг перемотки стрелками и шаг громкости, в секундах и долях */
const SEEK_STEP = 5
const VOLUME_STEP = 0.1

/*
  Громкость живёт между открытиями: выставлять её заново на каждом видео
  раздражает сильнее, чем кажется
*/
let lastVolume = 1
let lastMuted = false

export const VideoPlayer = defineComponent<Props>((props) => {
  const { lang } = useServices()

  const $root = shallowRef<HTMLDivElement | null>(null)
  const $video = shallowRef<HTMLVideoElement | null>(null)

  const isPlaying = shallowRef(false)
  const isBuffering = shallowRef(true)
  const isFullscreen = shallowRef(false)
  const currentTime = shallowRef(0)
  const duration = shallowRef(0)
  const bufferedTo = shallowRef(0)
  const volume = shallowRef(lastVolume)
  const isMuted = shallowRef(lastMuted)
  const areControlsVisible = shallowRef(true)

  let hideControlsTimeout = 0

  /*
    Качество выбираем под размер окна, а не берём лучшее: в модалке высотой 500px
    от 4K никакой пользы, а старт и трафик страдают заметно
  */
  const source = computed(() => {
    const { sources, viewportHeight } = props

    if (!viewportHeight) {
      return sources[0]
    }

    const needed = viewportHeight * window.devicePixelRatio
    const enough = [...sources].reverse().find(({ height }) => height >= needed)

    return enough ?? sources[0]
  })

  const progress = computed(() => (
    duration.value > 0 ? currentTime.value / duration.value : 0
  ))
  const buffered = computed(() => (
    duration.value > 0 ? bufferedTo.value / duration.value : 0
  ))

  const showControls = () => {
    areControlsVisible.value = true
    window.clearTimeout(hideControlsTimeout)

    hideControlsTimeout = window.setTimeout(() => {
      if (isPlaying.value) {
        areControlsVisible.value = false
      }
    }, CONTROLS_HIDE_DELAY)
  }

  const togglePlay = () => {
    const video = $video.value
    if (!video) {
      return
    }

    if (video.paused) {
      void video.play().catch(() => {
        /*
          Автозапуск со звуком браузер может отклонить. Пробуем без него:
          беззвучное видео лучше, чем застывший кадр
        */
        video.muted = true
        void video.play().catch(() => null)
      })
    } else {
      video.pause()
    }

    showControls()
  }

  const seekBy = (seconds: number) => {
    const video = $video.value
    if (video) {
      video.currentTime = Math.min(
        Math.max(0, video.currentTime + seconds),
        video.duration || 0
      )
      showControls()
    }
  }

  const setVolume = (value: number) => {
    const video = $video.value
    if (!video) {
      return
    }

    video.volume = Math.min(1, Math.max(0, value))
    video.muted = video.volume === 0
  }

  const toggleMute = () => {
    const video = $video.value
    if (video) {
      video.muted = !video.muted
      showControls()
    }
  }

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => null)
    } else {
      void $root.value?.requestFullscreen().catch(() => null)
    }
  }

  // Перемотка тянется мышью, поэтому не input range: нужен ещё и уровень буфера
  const seekToPointer = (event: PointerEvent) => {
    const track = event.currentTarget
    const video = $video.value

    if (!(track instanceof HTMLElement) || !video?.duration) {
      return
    }

    const { left, width } = track.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (event.clientX - left) / width))

    video.currentTime = ratio * video.duration
    currentTime.value = video.currentTime
  }

  const onTrackPointerDown = (event: PointerEvent) => {
    if (event.currentTarget instanceof HTMLElement) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    seekToPointer(event)
  }

  const onTrackPointerMove = (event: PointerEvent) => {
    const track = event.currentTarget

    if (track instanceof HTMLElement && track.hasPointerCapture(event.pointerId)) {
      seekToPointer(event)
    }
  }

  const onKeyDown = (event: KeyboardEvent) => {
    const { target } = event

    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      return
    }

    switch (event.code) {
      /*
        Пробел на кнопке в фокусе браузер и сам превратит в клик, поэтому
        второй раз переключать воспроизведение здесь не надо
      */
      case 'Space':
        if (!(target instanceof HTMLButtonElement)) {
          event.preventDefault()
          togglePlay()
        }
        break

      case 'KeyK':
        togglePlay()
        break
      case 'ArrowLeft':
        seekBy(-SEEK_STEP)
        break
      case 'ArrowRight':
        seekBy(SEEK_STEP)
        break
      case 'ArrowUp':
        event.preventDefault()
        setVolume(volume.value + VOLUME_STEP)
        break
      case 'ArrowDown':
        event.preventDefault()
        setVolume(volume.value - VOLUME_STEP)
        break
      case 'KeyM':
        toggleMute()
        break
      case 'KeyF':
        toggleFullscreen()
        break

      default:
        break
    }
  }

  const onFullscreenChange = () => {
    isFullscreen.value = document.fullscreenElement === $root.value
  }

  onMounted(() => {
    const video = $video.value
    if (video) {
      video.volume = lastVolume
      video.muted = lastMuted
    }

    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    showControls()
  })

  onBeforeUnmount(() => {
    window.clearTimeout(hideControlsTimeout)
    window.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('fullscreenchange', onFullscreenChange)

    if (document.fullscreenElement === $root.value) {
      void document.exitFullscreen().catch(() => null)
    }
  })

  return () => (
    <div
      class={['VideoPlayer', { 'VideoPlayer--controlsHidden': !areControlsVisible.value }]}
      ref={$root}
      onMousemove={showControls}
      onMouseleave={() => isPlaying.value && (areControlsVisible.value = false)}
    >
      <video
        class="VideoPlayer__video"
        ref={$video}
        src={source.value?.url}
        poster={props.poster}
        autoplay
        onClick={togglePlay}
        onDblclick={toggleFullscreen}
        onPlay={() => (isPlaying.value = true)}
        onPause={() => {
          isPlaying.value = false
          areControlsVisible.value = true
        }}
        onWaiting={() => (isBuffering.value = true)}
        onPlaying={() => (isBuffering.value = false)}
        onCanplay={() => (isBuffering.value = false)}
        onDurationchange={() => (duration.value = $video.value?.duration ?? 0)}
        onTimeupdate={() => (currentTime.value = $video.value?.currentTime ?? 0)}
        onProgress={() => {
          const video = $video.value
          if (!video) {
            return
          }

          // Показываем только тот отрезок буфера, внутри которого сейчас находимся
          for (let index = 0; index < video.buffered.length; index++) {
            const start = video.buffered.start(index)
            const end = video.buffered.end(index)

            if (start <= video.currentTime && end >= video.currentTime) {
              bufferedTo.value = end
            }
          }
        }}
        onVolumechange={() => {
          const video = $video.value
          if (video) {
            volume.value = video.volume
            isMuted.value = video.muted
            lastVolume = video.volume
            lastMuted = video.muted
          }
        }}
        onEnded={() => (areControlsVisible.value = true)}
        onError={() => {
          isBuffering.value = false
          props.onMediaError?.()
        }}
      />

      {isBuffering.value && (
        <div class="VideoPlayer__buffering">
          <Spinner size="medium" />
        </div>
      )}

      <div class="VideoPlayer__controls">
        <div
          class="VideoPlayer__track"
          onPointerdown={onTrackPointerDown}
          onPointermove={onTrackPointerMove}
        >
          <div class="VideoPlayer__trackLine">
            <div
              class="VideoPlayer__trackBuffered"
              style={{ transform: `scaleX(${buffered.value})` }}
            />
            <div
              class="VideoPlayer__trackProgress"
              style={{ transform: `scaleX(${progress.value})` }}
            />
          </div>
          <div class="VideoPlayer__trackKnob" style={{ left: `${progress.value * 100}%` }} />
        </div>

        <div class="VideoPlayer__buttons">
          <ButtonIcon
            class="VideoPlayer__button"
            title={lang.use(isPlaying.value ? 'video_pause' : 'video_play')}
            icon={isPlaying.value ? <Icon24Pause /> : <Icon24Play />}
            onClick={togglePlay}
          />

          <div class="VideoPlayer__volume">
            <ButtonIcon
              class="VideoPlayer__button"
              title={lang.use(isMuted.value ? 'video_unmute' : 'video_mute')}
              icon={isMuted.value ? <Icon24MuteOutline /> : <Icon24VolumeOutline />}
              onClick={toggleMute}
            />
            <input
              class="VideoPlayer__volumeRange"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted.value ? 0 : volume.value}
              onInput={(event) => setVolume(+event.target.value)}
            />
          </div>

          <span class="VideoPlayer__time">
            {formatDuration(currentTime.value)}
            {' / '}
            {formatDuration(duration.value)}
          </span>

          <ButtonIcon
            class="VideoPlayer__button VideoPlayer__fullscreen"
            title={lang.use(isFullscreen.value ? 'video_fullscreen_exit' : 'video_fullscreen')}
            icon={isFullscreen.value
              ? <Icon24FullscreenExitOutline />
              : <Icon24FullscreenOutline />}
            onClick={toggleFullscreen}
          />
        </div>
      </div>
    </div>
  )
}, {
  props: ['sources', 'poster', 'viewportHeight', 'onMediaError']
})
