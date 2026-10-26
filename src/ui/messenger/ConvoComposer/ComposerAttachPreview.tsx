import { defineComponent, onUnmounted } from 'vue'
import { useServices } from 'services'
import { useGlobalModal } from 'hooks'
import { formatDuration } from 'misc/utils'
import { AttachPreview } from 'ui/messenger/ConvoComposer/useComposerAttaches'
import { ButtonIcon } from 'ui/ui/ButtonIcon/ButtonIcon'
import { CircleProgressBar } from 'ui/ui/CircleProgressBar/CircleProgressBar'
import { Icon24Cancel, Icon24Mic } from 'assets/icons'
import './ComposerAttachPreview.css'

type Props = {
  attachPreview: AttachPreview
  onRemove: () => void
  onRetry: () => void
  onCancel: () => void
}

export const ComposerAttachPreview = defineComponent<Props>((props) => {
  const { lang } = useServices()
  const { photoViewerModal } = useGlobalModal()
  const isPhotoFile = props.attachPreview.kind === 'UploadingAttach' &&
    props.attachPreview.attach.kind === 'Photo'
  // Превью из файла делаем только для картинок: для остальных показываем расширение
  const objectUrl = isPhotoFile && props.attachPreview.kind === 'UploadingAttach'
    ? URL.createObjectURL(props.attachPreview.attach.file)
    : undefined

  onUnmounted(() => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
    }
  })

  return () => {
    const { kind, attach } = props.attachPreview
    const photo = kind === 'Attach' && attach.kind === 'Photo' && attach
    const doc = kind === 'Attach' && attach.kind === 'Doc' && attach
    const voice = kind === 'Attach' && attach.kind === 'Voice' && attach
    const isDoc = !!doc || (kind === 'UploadingAttach' && attach.kind === 'Doc')
    const isVoice = !!voice || (kind === 'UploadingAttach' && attach.kind === 'Voice')
    const src = photo ? photo.sizes.get('x')?.url : objectUrl

    const label = doc
      ? doc.ext
      : kind === 'UploadingAttach' && attach.kind === 'Doc'
        ? extOf(attach.file.name)
        : ''

    return (
      <div
        class={[
          'ComposerAttachPreview',
          photo && 'ComposerAttachPreview--clickable',
          (isDoc || isVoice) && 'ComposerAttachPreview--doc'
        ]}
        title={
          kind === 'UploadingAttach' && attach.failed
            ? lang.use('me_attach_upload_failed')
            : doc ? doc.title : voice ? formatDuration(voice.duration) : undefined
        }
      >
        <ButtonIcon
          class="ComposerAttachPreview__remove"
          icon={<Icon24Cancel width={16} height={16} />}
          onClick={props.onRemove}
        />

        {isVoice
          ? <Icon24Mic class="ComposerAttachPreview__voiceIcon" />
          : isDoc
            ? <span class="ComposerAttachPreview__ext">{label.slice(0, 4)}</span>
            : (
              <img
                src={src}
                class="ComposerAttachPreview__img"
                onClick={() => photo && photoViewerModal.open({ photo })}
              />
            )}

        {kind === 'UploadingAttach' && (
          <CircleProgressBar
            class="ComposerAttachPreview__progress"
            progress={attach.progress}
            showRetry={attach.failed}
            onRetry={props.onRetry}
            onCancel={props.onCancel}
          />
        )}
      </div>
    )
  }
}, {
  props: ['attachPreview', 'onRemove', 'onRetry', 'onCancel']
})

function extOf(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot + 1)
}
