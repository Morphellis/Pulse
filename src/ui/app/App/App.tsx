import { defineComponent } from 'vue'
import { RouterView } from 'vue-router'
import { useServices } from 'services'
import { useMainSettingsStore } from 'store/mainSettings'
import { useGlobalModal } from 'hooks'
import { subscribeToElectronEvent } from 'misc/utils'
import { isMacOS } from 'misc/constants'
import { electronBridge } from 'misc/electronBridge'
import { exposeFeatures } from './exposeFeatures'
import { useAppearanceColors } from './useAppearanceColors'
import { useNotificationsBridge } from './useNotificationsBridge'
import { useThemeScheme } from './useThemeScheme'
import { Titlebar } from 'ui/app/Titlebar/Titlebar'
import { ConvoContextMenu } from 'ui/messenger/ConvoContextMenu/ConvoContextMenu'
import { MessageContextMenu } from 'ui/messenger/ConvoMessage/MessageContextMenu'
import { CaptchaModal } from 'ui/modals/CaptchaModal/CaptchaModal'
import { CommentsModal } from 'ui/modals/CommentsModal/CommentsModal'
import { ConfirmModal } from 'ui/modals/ConfirmModal/ConfirmModal'
import { DeleteMessagesModal } from 'ui/modals/DeleteMessagesModal/DeleteMessagesModal'
import { ForwardModal } from 'ui/modals/ForwardModal/ForwardModal'
import { JournalModal } from 'ui/modals/JournalModal/JournalModal'
import { ModalsContainer } from 'ui/modals/parts'
import { PeerInfoModal } from 'ui/modals/PeerInfoModal/PeerInfoModal'
import { PhotoViewerModal } from 'ui/modals/PhotoViewerModal/PhotoViewerModal'
import { RepostModal } from 'ui/modals/RepostModal/RepostModal'
import { SettingsModal } from 'ui/modals/SettingsModal/SettingsModal'
import { ShareModal } from 'ui/modals/ShareModal/ShareModal'
import { VideoModal } from 'ui/modals/VideoModal/VideoModal'
import './App.css'

export const App = defineComponent(() => {
  const { lang } = useServices()
  const scheme = useThemeScheme()
  const appearanceColors = useAppearanceColors()
  const mainSettings = useMainSettingsStore()

  exposeFeatures()
  useNotificationsBridge()

  if (isMacOS) {
    electronBridge.menu.build(lang.useRaw('app_menu_labels'))
  }

  subscribeToElectronEvent(() => (
    electronBridge.window.onBoundsChange((bounds) => {
      mainSettings.bounds = bounds
    })
  ))

  return () => (
    <div class="root" data-scheme={scheme.value} style={appearanceColors.value}>
      {mainSettings.useCustomTitlebar && <Titlebar />}

      <div class={['App', { 'App--isMacOS': isMacOS }]}>
        <RouterView />

        <ModalsContainer />
        <GlobalModals />
        <MessageContextMenu />
        <ConvoContextMenu />
      </div>
    </div>
  )
})

const GlobalModals = defineComponent(() => {
  const {
    captchaModal,
    commentsModal,
    confirmModal,
    deleteMessagesModal,
    forwardModal,
    journalModal,
    peerInfoModal,
    photoViewerModal,
    repostModal,
    settingsModal,
    shareModal,
    videoModal
  } = useGlobalModal()

  return () => [
    // Параметры появляются при открытии модалки,
    // а удаляются только после окончания анимации закрытия модалки
    captchaModal.params && <CaptchaModal {...captchaModal.params} />,
    commentsModal.params && <CommentsModal {...commentsModal.params} />,
    confirmModal.params && <ConfirmModal {...confirmModal.params} />,
    deleteMessagesModal.params && <DeleteMessagesModal {...deleteMessagesModal.params} />,
    forwardModal.params && <ForwardModal {...forwardModal.params} />,
    journalModal.params && <JournalModal {...journalModal.params} />,
    peerInfoModal.params && <PeerInfoModal {...peerInfoModal.params} />,
    photoViewerModal.params && <PhotoViewerModal {...photoViewerModal.params} />,
    repostModal.params && <RepostModal {...repostModal.params} />,
    settingsModal.params && <SettingsModal {...settingsModal.params} />,
    shareModal.params && <ShareModal {...shareModal.params} />,
    videoModal.params && <VideoModal {...videoModal.params} />
  ]
})
