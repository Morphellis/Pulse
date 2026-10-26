import { reactive, shallowRef } from 'vue'
import { createSingletonHook } from 'misc/utils'
import { CaptchaModalParams } from 'ui/modals/CaptchaModal/CaptchaModal'
import { CommentsModalParams } from 'ui/modals/CommentsModal/CommentsModal'
import { ConfirmModalParams } from 'ui/modals/ConfirmModal/ConfirmModal'
import {
  DeleteMessagesModalParams
} from 'ui/modals/DeleteMessagesModal/DeleteMessagesModal'
import { ForwardModalParams } from 'ui/modals/ForwardModal/ForwardModal'
import { PeerInfoModalParams } from 'ui/modals/PeerInfoModal/PeerInfoModal'
import { PhotoViewerModalProps } from 'ui/modals/PhotoViewerModal/PhotoViewerModal'
import { RepostModalParams } from 'ui/modals/RepostModal/RepostModal'
import { ShareModalParams } from 'ui/modals/ShareModal/ShareModal'
import { VideoModalParams } from 'ui/modals/VideoModal/VideoModal'

export const useGlobalModal = createSingletonHook(() => {
  return {
    captchaModal: createGlobalModal<CaptchaModalParams>('CaptchaModal'),
    commentsModal: createGlobalModal<CommentsModalParams>('CommentsModal'),
    confirmModal: createGlobalModal<ConfirmModalParams>('ConfirmModal'),
    deleteMessagesModal: createGlobalModal<DeleteMessagesModalParams>('DeleteMessagesModal'),
    forwardModal: createGlobalModal<ForwardModalParams>('ForwardModal'),
    journalModal: createGlobalModal<object>('JournalModal'),
    peerInfoModal: createGlobalModal<PeerInfoModalParams>('PeerInfoModal'),
    photoViewerModal: createGlobalModal<PhotoViewerModalProps>('PhotoViewerModal'),
    repostModal: createGlobalModal<RepostModalParams>('RepostModal'),
    settingsModal: createGlobalModal<object>('SettingsModal'),
    shareModal: createGlobalModal<ShareModalParams>('ShareModal'),
    videoModal: createGlobalModal<VideoModalParams>('VideoModal')
  }
})

function createGlobalModal<ModalParams>(modalName: string) {
  const opened = shallowRef(false)
  const visible = shallowRef(false)
  const params = shallowRef<ModalParams>()

  function open(modalParams: ModalParams) {
    if (opened.value) {
      throw new Error(`Модалка ${modalName} уже открыта`)
    }

    opened.value = true
    params.value = modalParams
  }

  function close() {
    opened.value = false
  }

  function onVisibilityChange(isVisible: boolean) {
    visible.value = isVisible

    // Удаляем параметры только когда модалка полностью закрылась
    if (!opened.value && !visible.value) {
      params.value = undefined
    }
  }

  return reactive({
    opened,
    visible,
    params,
    open,
    close,
    onVisibilityChange
  })
}
