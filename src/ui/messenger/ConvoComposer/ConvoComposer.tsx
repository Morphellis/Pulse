import {
  ChangeEvent,
  computed,
  defineComponent,
  KeyboardEvent,
  onMounted,
  onUnmounted,
  shallowRef,
  watch
} from 'vue'
import { useServices } from 'services'
import * as Attach from 'model/Attach'
import * as Convo from 'model/Convo'
import * as ConvoDraft from 'model/ConvoDraft'
import * as Peer from 'model/Peer'
import { useConvoDraftsStore } from 'store/convoDrafts'
import { useConvosStore } from 'store/convos'
import { editMessage, sendMessage, sendSticker } from 'actions'
import { useVoiceRecorder } from 'hooks'
import { formatDuration, isEventWithModifier } from 'misc/utils'
import { ComposerAttachPreview } from 'ui/messenger/ConvoComposer/ComposerAttachPreview'
import { ComposerMuteChannelButton } from 'ui/messenger/ConvoComposer/ComposerMuteChannelButton'
import { useComposerAttaches } from 'ui/messenger/ConvoComposer/useComposerAttaches'
import { ReplyMessage } from 'ui/messenger/ReplyMessage/ReplyMessage'
import { StickerPicker } from 'ui/messenger/StickerPicker/StickerPicker'
import { ActionMenu } from 'ui/ui/ActionMenu/ActionMenu'
import { ActionMenuItem } from 'ui/ui/ActionMenuItem/ActionMenuItem'
import { ButtonIcon } from 'ui/ui/ButtonIcon/ButtonIcon'
import { Popper } from 'ui/ui/Popper/Popper'
import {
  Icon16Text,
  Icon20PictureOutline,
  Icon20TrashOutline,
  Icon24AddCircleOutline,
  Icon24Cancel,
  Icon24Info,
  Icon24Mic,
  Icon24Pause,
  Icon24Play,
  Icon24Send,
  Icon24SmileOutline,
  Icon24Stop
} from 'assets/icons'
import './ConvoComposer.css'

type Props = {
  convo: Convo.Convo
}

type RecordedVoicePreview = {
  blob: Blob
  url: string
  duration: number
}

/**
 * Записанные, но ещё не отправленные голосовые — по одному на беседу.
 *
 * Живут вне компонента: смена беседы пересоздаёт композер целиком
 * (см. key={route.path} в AppShell), и вместе с ним готовая запись раньше
 * молча пропадала. Блоб освобождается при отправке или явном удалении
 */
const pendingVoices = new Map<Peer.Id, RecordedVoicePreview>()

export const ConvoComposer = defineComponent<Props>((props) => {
  const { lang } = useServices()
  const { drafts } = useConvoDraftsStore()
  const { scrollAnchors } = useConvosStore()
  const $input = shallowRef<HTMLSpanElement | null>(null)
  const isDraggingOver = shallowRef(false)
  const editFailed = shallowRef(false)

  const draft = ConvoDraft.safeGet(drafts, props.convo.id)
  const {
    attachPreviews,
    removeAttachPreview,
    uploadAttach,
    retryUploadingAttach,
    abortUploadingAttach
  } = useComposerAttaches(props.convo, draft)

  /** Правка уже улетела на сервер: до ответа поле трогать нельзя */
  const isEditSubmitting = shallowRef(false)

  const canSendMessage = computed(() => (
    ConvoDraft.isSendable(draft) &&
    draft.uploadingAttaches.length === 0 &&
    !isEditSubmitting.value
  ))

  const voiceRecorder = useVoiceRecorder()
  const isRecordingActive = computed(() => (
    voiceRecorder.status.value === 'recording' || voiceRecorder.status.value === 'paused'
  ))
  // Пока есть что отправить текстом или вложением, микрофон не нужен — это кнопка send
  const showMicButton = computed(() => !draft.editing && !canSendMessage.value)

  /** Записанное, но ещё не отправленное голосовое — можно переслушать перед отправкой */
  const recordedVoice = shallowRef<RecordedVoicePreview | null>(
    pendingVoices.get(props.convo.id) ?? null
  )
  const isPreviewPlaying = shallowRef(false)
  const previewTime = shallowRef(0)
  let previewAudio: HTMLAudioElement | null = null

  /** Плеер предпрослушки живёт вместе с композером, сама запись — дольше него */
  const attachPreviewAudio = (voice: RecordedVoicePreview) => {
    const audio = new Audio(voice.url)

    audio.addEventListener('play', () => (isPreviewPlaying.value = true))
    audio.addEventListener('pause', () => (isPreviewPlaying.value = false))
    audio.addEventListener('timeupdate', () => {
      previewTime.value = audio.currentTime === 0 ? voice.duration : audio.currentTime
    })

    previewAudio = audio
    previewTime.value = voice.duration
  }

  const detachPreviewAudio = () => {
    previewAudio?.pause()
    previewAudio = null
    isPreviewPlaying.value = false
  }

  if (recordedVoice.value) {
    attachPreviewAudio(recordedVoice.value)
  }

  const startRecording = async () => {
    try {
      await voiceRecorder.start()
    } catch (error) {
      // Отказ в доступе к микрофону или его отсутствие — тихо остаёмся в обычном виде
      console.warn('[ConvoComposer] microphone error', error)
    }
  }

  const togglePauseRecording = () => {
    if (voiceRecorder.status.value === 'recording') {
      voiceRecorder.pause()
    } else if (voiceRecorder.status.value === 'paused') {
      voiceRecorder.resume()
    }
  }

  /** Убирает запись насовсем: и с экрана, и из хранилища, переживающего смену беседы */
  const discardRecordedVoice = () => {
    detachPreviewAudio()

    if (recordedVoice.value) {
      URL.revokeObjectURL(recordedVoice.value.url)
    }

    pendingVoices.delete(props.convo.id)
    recordedVoice.value = null
  }

  /** Останавливает запись, но не отправляет её: даёт сначала переслушать результат */
  const stopRecording = async () => {
    try {
      const { blob, duration } = await voiceRecorder.stop()
      const voice: RecordedVoicePreview = {
        blob,
        url: URL.createObjectURL(blob),
        duration
      }

      pendingVoices.set(props.convo.id, voice)
      recordedVoice.value = voice
      attachPreviewAudio(voice)
    } catch (error) {
      console.warn('[ConvoComposer] failed to stop recording', error)
    }
  }

  const togglePreviewPlay = () => {
    if (!previewAudio) {
      return
    }

    if (isPreviewPlaying.value) {
      previewAudio.pause()
    } else {
      previewAudio.play()
    }
  }

  const sendRecordedVoice = () => {
    if (!recordedVoice.value) {
      return
    }

    const { blob } = recordedVoice.value
    uploadAttach('Voice', new File([blob], 'voice.ogg', { type: 'audio/ogg' }))
    discardRecordedVoice()
  }

  // Разбираем только плеер: сама запись переживает уход из беседы и ждёт возвращения
  onUnmounted(detachPreviewAudio)

  const cancelReply = () => {
    draft.replyTo = undefined
    $input.value?.focus()
  }

  onMounted(() => {
    if (!$input.value) {
      return
    }

    $input.value.focus()

    if (draft.text) {
      $input.value.innerText = draft.text

      const sel = window.getSelection()!
      sel.selectAllChildren($input.value)
      sel.collapseToEnd()
    }
  })

  const setInputText = (text: string) => {
    if (!$input.value) {
      return
    }

    $input.value.innerText = text
    $input.value.focus()

    const selection = window.getSelection()
    if (selection && text) {
      selection.selectAllChildren($input.value)
      selection.collapseToEnd()
    }
  }

  const cancelEditing = () => {
    draft.editing = undefined
    draft.text = ''
    setInputText('')
  }

  const onMessageSend = () => {
    const { editing } = draft

    if (editing) {
      if (isEditSubmitting.value) {
        return
      }

      /*
        Драфт снимаем только после успеха. Раньше сброс шёл сразу, не дожидаясь
        ответа: неудачная правка оставляла сообщение прежним, а набранный текст
        был уже стёрт, и повторить её было нечем
      */
      const { text } = draft
      isEditSubmitting.value = true
      editFailed.value = false

      editMessage(props.convo.id, editing.cmid, text).then((ok) => {
        isEditSubmitting.value = false

        if (ok) {
          ConvoDraft.reset(draft)
          setInputText('')
        } else {
          editFailed.value = true
        }
      })
      return
    }

    sendMessage(props.convo.id, draft.text, draft.attaches, { replyTo: draft.replyTo })
    ConvoDraft.reset(draft)
    setInputText('')
  }

  /*
    Стикер уходит отдельным сообщением, поэтому набранный текст не трогаем.
    Ответ при этом переносится на стикер: так же ведет себя сам ВК
  */
  const onStickerPick = (stickerId: number) => {
    sendSticker(props.convo.id, stickerId, { replyTo: draft.replyTo })
    draft.replyTo = undefined
  }

  /*
    Правку включают из меню сообщения, когда композер уже смонтирован,
    поэтому текст в поле подставляем отдельно
  */
  watch(() => draft.editing?.cmid, (cmid) => {
    editFailed.value = false

    if (cmid !== undefined) {
      draft.text = draft.editing?.originalText ?? ''
      setInputText(draft.text)
    }
  })

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    // Escape отменяет правку или ответ, не закрывая при этом саму беседу
    if (event.key === 'Escape' && (draft.replyTo || draft.editing)) {
      event.preventDefault()
      event.stopPropagation()

      if (draft.editing) {
        cancelEditing()
      } else {
        cancelReply()
      }
      return
    }

    if (event.code === 'Enter' && !isEventWithModifier(event)) {
      // Предотвращаем перенос строки
      event.preventDefault()

      if (!canSendMessage.value) {
        return
      }

      onMessageSend()
    }
  }

  const onInput = (event: ChangeEvent<HTMLElement>) => {
    draft.text = event.currentTarget.innerText ?? ''
  }

  const onPaste = (event: ClipboardEvent) => {
    for (const file of event.clipboardData?.files ?? []) {
      if (['image/png', 'image/jpeg', 'image/gif'].includes(file.type)) {
        event.preventDefault()
        uploadAttach('Photo', file)
      }
    }
  }

  const openFilePicker = async () => {
    const fileHandles = await showOpenFilePicker({ multiple: true }).catch(() => [])

    for (const fileHandle of fileHandles) {
      uploadAttach('Doc', await fileHandle.getFile())
    }
  }

  /** Картинки уходят как фото, всё остальное как документы */
  const uploadDroppedFile = (file: File) => {
    const isPhoto = ['image/png', 'image/jpeg', 'image/gif'].includes(file.type)
    uploadAttach(isPhoto ? 'Photo' : 'Doc', file)
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    isDraggingOver.value = false

    for (const file of event.dataTransfer?.files ?? []) {
      uploadDroppedFile(file)
    }
  }

  const openPhotoPicker = async () => {
    const fileHandles = await showOpenFilePicker({
      excludeAcceptAllOption: true,
      multiple: true,
      types: [{
        accept: {
          'image/*': ['.png', '.jpg', '.jpeg', '.gif']
        }
      }]
    }).catch(() => [])

    for (const fileHandle of fileHandles) {
      const file = await fileHandle.getFile()
      uploadAttach('Photo', file)
    }
  }

  const renderPanel = () => {
    if (recordedVoice.value) {
      return (
        <>
          <ButtonIcon
            class="ConvoComposer__recordingCancel"
            icon={<Icon20TrashOutline width="20" />}
            title={lang.use('me_composer_record_cancel')}
            onClick={discardRecordedVoice}
          />
          <ButtonIcon
            class="ConvoComposer__recordingPause"
            icon={isPreviewPlaying.value ? <Icon24Pause /> : <Icon24Play />}
            title={lang.use('me_composer_record_play')}
            onClick={togglePreviewPlay}
          />
          <span class="ConvoComposer__recordingTime">
            {formatDuration(previewTime.value)}
          </span>
          <ButtonIcon
            class="ConvoComposer__send"
            icon={<Icon24Send />}
            title={lang.use('me_composer_record_send')}
            onClick={sendRecordedVoice}
          />
        </>
      )
    }

    if (isRecordingActive.value) {
      const isPaused = voiceRecorder.status.value === 'paused'

      return (
        <>
          <ButtonIcon
            class="ConvoComposer__recordingCancel"
            icon={<Icon20TrashOutline width="20" />}
            title={lang.use('me_composer_record_cancel')}
            onClick={voiceRecorder.cancel}
          />
          <span
            class={['ConvoComposer__recordingDot', isPaused && 'ConvoComposer__recordingDot--paused']}
          />
          <span class="ConvoComposer__recordingTime">
            {formatDuration(voiceRecorder.duration.value)}
          </span>
          <ButtonIcon
            class="ConvoComposer__recordingPause"
            icon={isPaused ? <Icon24Play /> : <Icon24Pause />}
            title={lang.use(isPaused ? 'me_composer_record_resume' : 'me_composer_record_pause')}
            onClick={togglePauseRecording}
          />
          <ButtonIcon
            class="ConvoComposer__send"
            icon={<Icon24Stop />}
            title={lang.use('me_composer_record_stop')}
            onClick={() => void stopRecording()}
          />
        </>
      )
    }

    if (props.convo.kind === 'ChatConvo' && props.convo.status === 'kicked') {
      return (
        <div class="ConvoComposer__restriction">
          <Icon24Info color="var(--vkui--color_accent_orange)" />
          {lang.use('me_chat_kicked_status')}
        </div>
      )
    }

    if (Convo.isChannel(props.convo)) {
      return <ComposerMuteChannelButton convo={props.convo} />
    }

    return (
      <>
        <Popper
          placement="top-start"
          offset={{
            // Отступ слева кнопки, чтобы начало меню совпадало с началом поля ввода
            crossAxis: -6,
            // Отступ сверху кнопки (4px) + дефолтный отступ от элемента у поппера (4px)
            mainAxis: 8
          }}
          closeOnContentClick
          content={
            <ActionMenu>
              <ActionMenuItem
                icon={<Icon20PictureOutline />}
                text={lang.use('me_composer_attach_photo')}
                onClick={openPhotoPicker}
              />
              <ActionMenuItem
                icon={<Icon16Text width="20" />}
                text={lang.use('me_composer_attach_file')}
                onClick={openFilePicker}
              />
            </ActionMenu>
          }
        >
          <ButtonIcon class="ConvoComposer__addAttaches" icon={<Icon24AddCircleOutline />} />
        </Popper>

        <span
          class="ConvoComposer__input"
          contenteditable="plaintext-only"
          role="textbox"
          placeholder={lang.use('me_convo_composer_placeholder')}
          ref={$input}
          onKeydown={onKeyDown}
          onInput={onInput}
          onPaste={onPaste}
        />

        {/*
          Панель намеренно не закрывается по клику внутри: так же ведет себя сам ВК,
          где можно перебирать наборы и отправить несколько стикеров подряд.
          Закрывается кликом мимо или по Escape
        */}
        <Popper
          placement="top-end"
          offset={{ mainAxis: 8 }}
          content={<StickerPicker onPick={onStickerPick} />}
        >
          <ButtonIcon
            class="ConvoComposer__stickers"
            icon={<Icon24SmileOutline />}
            title={lang.use('me_composer_stickers')}
          />
        </Popper>

        {showMicButton.value ? (
          <ButtonIcon
            class="ConvoComposer__send"
            icon={<Icon24Mic />}
            title={lang.use('me_composer_record_voice')}
            onClick={() => void startRecording()}
            // Предотвращаем сброс фокуса с поля ввода
            onMousedown={(event) => event.preventDefault()}
          />
        ) : (
          <ButtonIcon
            class="ConvoComposer__send"
            disabled={!canSendMessage.value}
            icon={<Icon24Send />}
            onClick={onMessageSend}
            // Предотвращаем сброс фокуса с поля ввода
            onMousedown={(event) => event.preventDefault()}
          />
        )}
      </>
    )
  }

  return () => (
    <div
      class={['ConvoComposer', isDraggingOver.value && 'ConvoComposer--dragover']}
      onDragover={(event: DragEvent) => {
        event.preventDefault()
        isDraggingOver.value = true
      }}
      onDragleave={() => (isDraggingOver.value = false)}
      onDrop={onDrop}
    >
      <div class="ConvoComposer__inner">
        {draft.editing && (
          <div class="ConvoComposer__reply">
            <div class="ConvoComposer__editing">
              <span class="ConvoComposer__editingTitle">{lang.use('me_message_editing')}</span>
              <span class="ConvoComposer__editingText">{draft.editing.originalText}</span>
              {editFailed.value && (
                <span class="ConvoComposer__editingError">{lang.use('me_message_edit_failed')}</span>
              )}
            </div>
            <ButtonIcon
              class="ConvoComposer__replyCancel"
              icon={<Icon24Cancel width="20" color="var(--vkui--color_icon_secondary)" />}
              title={lang.use('me_message_edit_cancel')}
              onClick={cancelEditing}
              withHoverBackground
            />
          </div>
        )}

        {draft.replyTo && !draft.editing && (
          <div class="ConvoComposer__reply">
            <ReplyMessage
              class="ConvoComposer__replyPreview"
              reply={draft.replyTo}
              onClick={() => {
                if (draft.replyTo?.cmid) {
                  scrollAnchors.set(props.convo.id, {
                    kind: 'Message',
                    cmid: draft.replyTo.cmid,
                    reversible: true
                  })
                }
              }}
            />
            <ButtonIcon
              class="ConvoComposer__replyCancel"
              icon={<Icon24Cancel width="20" color="var(--vkui--color_icon_secondary)" />}
              title={lang.use('me_message_reply_cancel')}
              onClick={cancelReply}
              withHoverBackground
            />
          </div>
        )}

        {attachPreviews.value.length > 0 && (
          <div class="ConvoComposer__attaches">
            {attachPreviews.value.map((attachPreview) => (
              <ComposerAttachPreview
                key={attachPreview.kind === 'Attach'
                  ? Attach.id(attachPreview.attach)
                  : attachPreview.attach.id}
                attachPreview={attachPreview}
                onRemove={() => removeAttachPreview(attachPreview)}
                onRetry={() => {
                  if (attachPreview.kind === 'UploadingAttach') {
                    retryUploadingAttach(attachPreview.attach)
                  }
                }}
                onCancel={() => {
                  if (attachPreview.kind === 'UploadingAttach') {
                    abortUploadingAttach(attachPreview.attach)
                  }
                }}
              />
            ))}
          </div>
        )}

        <div class="ConvoComposer__panel">
          {renderPanel()}
        </div>
      </div>
    </div>
  )
}, {
  props: ['convo']
})
