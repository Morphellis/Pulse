import { computed, defineComponent, KeyboardEvent, onMounted, shallowRef } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useServices } from 'services'
import * as IEngine from 'services/contracts/IEngine'
import { useDetectiveStore } from 'store/detective'
import { loadInitialData } from 'actions'
import { resumeCommentsScanAfterRestart } from 'actions/detective/commentsScan'
import { startOnlineTracker } from 'actions/detective/onlineTracker'
import { useModal } from 'hooks'
import { NavRail } from './NavRail'
import { useResizableConvoList } from './useResizableConvoList'
import { ConvoList } from 'ui/messenger/ConvoList/ConvoList'
import { Modal } from 'ui/modals/parts'
import { Button } from 'ui/ui/Button/Button'
import './AppShell.css'

/**
 * Оболочка приложения: панель разделов, список диалогов и содержимое активного раздела.
 *
 * Список диалогов живет здесь, а не внутри мессенджера, чтобы оставаться на месте
 * при переключении на ленту.
 *
 * Инициализация данных и лонгполла тоже здесь: так сообщения продолжают приходить
 * во время просмотра ленты, а приложение не инициализируется заново на каждый
 * переход между разделами
 */
export const AppShell = defineComponent(() => {
  const route = useRoute()
  const router = useRouter()
  const { lang } = useServices()
  const columnsLayout = useColumnsLayout()
  const convoListResize = useResizableConvoList()
  const initErrorModal = useModal()
  const engineFailModal = useModal()
  const engineFailReason = shallowRef('')

  /** На узком экране список и содержимое не помещаются рядом и показываются по очереди */
  const hasContent = computed(() => (
    route.name === 'Convo' ||
    route.name === 'Feed' ||
    route.name === 'Wall' ||
    route.name === 'Profile' ||
    route.name === 'Detective'
  ))

  onMounted(() => {
    loadInitialData(initErrorModal.open, onEngineFail)

    // Фоновые задачи детектива продолжают работу после перезапуска приложения
    const detective = useDetectiveStore()
    if (detective.trackerEnabled && detective.watched.length > 0) {
      startOnlineTracker()
    }
    resumeCommentsScanAfterRestart()
  })

  /** Клик по разделу сообщений заодно возвращает список, если он был скрыт */
  const onMessengerClick = () => {
    convoListResize.expand()
    router.push({ name: 'NoConvo' })
  }

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && route.name === 'Convo') {
      if (route.query.canGoBack) {
        router.back()
      } else {
        router.push({ name: 'NoConvo' })
      }
    }
  }

  const onEngineFail = (reason: IEngine.FailReason) => {
    engineFailModal.open()

    switch (reason) {
      case IEngine.FailReason.RETRIEVE_KEY_ERROR:
        engineFailReason.value = lang.use('engineFailModal_description_retrieve_key')
        break
      case IEngine.FailReason.RESYNC_ERROR:
        engineFailReason.value = lang.use('engineFailModal_description_resync')
        break
      case IEngine.FailReason.INVALIDATE_CACHE:
        engineFailReason.value = lang.use('engineFailModal_description_invalidate_cache')
        break
      case IEngine.FailReason.OTHER:
        engineFailReason.value = lang.use('engineFailModal_description_other')
        break
    }
  }

  const closeInitErrorModal = () => {
    initErrorModal.close()
    loadInitialData(initErrorModal.open, onEngineFail)
  }

  return () => (
    <div
      class={[
        'AppShell',
        hasContent.value && 'AppShell--withContent',
        convoListResize.isCollapsed.value && 'AppShell--convoListCollapsed'
      ]}
      onKeydown={onKeydown}
      tabindex={-1}
    >
      <NavRail onMessengerClick={onMessengerClick} />

      <ConvoList
        class="AppShell__convoList"
        style={convoListResize.style.value}
        compact={columnsLayout.value === 'compact' || convoListResize.isCompact.value}
      />

      <div
        class="AppShell__resizer"
        onPointerdown={convoListResize.onResizeStart}
        onDblclick={convoListResize.toggle}
        title={lang.use('convo_list_resize_hint')}
      />

      {/*
        Появление раздела анимируем css-анимацией самого экрана, а не Transition:
        Transition с mode="out-in" на время ухода предыдущего экрана оставляет
        контейнер пустым, и раздел успевает мигнуть отсутствием содержимого
      */}
      <div class="AppShell__content" key={route.path}>
        <RouterView />
      </div>

      <Modal
        opened={initErrorModal.opened}
        onClose={closeInitErrorModal}
        title={lang.use('initErrorModal_title')}
        buttons={
          <Button onClick={closeInitErrorModal}>
            {lang.use('initErrorModal_retry')}
          </Button>
        }
      >
        {lang.use('initErrorModal_text')}
      </Modal>

      <Modal
        opened={engineFailModal.opened}
        onClose={engineFailModal.close}
        title={lang.use('engineFailModal_title')}
        buttons={[
          <Button onClick={() => location.reload()}>
            {lang.use('engineFailModal_reload')}
          </Button>,
          <Button onClick={engineFailModal.close}>
            {lang.use('modal_close_label')}
          </Button>
        ]}
        class="EngineFailModal"
      >
        {engineFailReason.value}
        <br /><br />
        {lang.use('engineFailModal_reload_note')}
      </Modal>
    </div>
  )
})

function useColumnsLayout() {
  const oneColumnQuery = window.matchMedia('(width < 500px)')
  const compactTwoColumnQuery = window.matchMedia('(width <= 700px)')

  const isOneColumn = shallowRef(oneColumnQuery.matches)
  const isCompactTwoColumn = shallowRef(compactTwoColumnQuery.matches)

  oneColumnQuery.addEventListener('change', ({ matches }) => {
    isOneColumn.value = matches
  })
  compactTwoColumnQuery.addEventListener('change', ({ matches }) => {
    isCompactTwoColumn.value = matches
  })

  return computed(() => {
    if (isOneColumn.value) {
      return 'single'
    }
    if (isCompactTwoColumn.value) {
      return 'compact'
    }
    return 'dual'
  })
}
