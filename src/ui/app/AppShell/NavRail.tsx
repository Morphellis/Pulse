import { computed, defineComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useServices } from 'services'
import { useConvosStore } from 'store/convos'
import { logout } from 'store/viewer'
import { useGlobalModal, useUnreadCount, useViewer } from 'hooks'
import { JSXElement } from 'misc/utils'
import { ActionMenu } from 'ui/ui/ActionMenu/ActionMenu'
import { ActionMenuItem } from 'ui/ui/ActionMenuItem/ActionMenuItem'
import { Avatar } from 'ui/ui/Avatar/Avatar'
import { Counter } from 'ui/ui/Counter/Counter'
import { Popper } from 'ui/ui/Popper/Popper'
import {
  Icon24DoorArrowRightOutline,
  Icon24GearOutline,
  Icon24ViewOutline,
  Icon28MessageOutline,
  Icon28NewsfeedOutline,
  Icon28ProfileOutline
} from 'assets/icons'
import './NavRail.css'

type Props = {
  /** Разворачивает скрытый список диалогов при переходе в мессенджер */
  onMessengerClick: () => void
}

export const NavRail = defineComponent<Props>((props) => {
  const route = useRoute()
  const router = useRouter()
  const { lang } = useServices()
  const viewer = useViewer()
  const { connection } = useConvosStore()
  const { settingsModal } = useGlobalModal()

  const unreadCount = useUnreadCount()

  const activeSection = computed(() => {
    switch (route.name) {
      case 'Feed':
        return 'feed'
      case 'Profile':
        return 'profile'
      case 'Detective':
        return 'detective'
      default:
        return 'messenger'
    }
  })

  return () => (
    <nav class="NavRail">
      <NavRailItem
        active={activeSection.value === 'messenger'}
        onClick={props.onMessengerClick}
        label={lang.use('nav_messenger')}
        icon={<Icon28MessageOutline />}
        badge={unreadCount.value}
      />
      <NavRailItem
        active={activeSection.value === 'feed'}
        onClick={() => router.push({ name: 'Feed' })}
        label={lang.use('nav_feed')}
        icon={<Icon28NewsfeedOutline />}
      />
      <NavRailItem
        active={activeSection.value === 'profile'}
        onClick={() => router.push({ name: 'Profile' })}
        label={lang.use('nav_profile')}
        icon={<Icon28ProfileOutline />}
      />
      <NavRailItem
        active={activeSection.value === 'detective'}
        onClick={() => router.push({ name: 'Detective' })}
        label={lang.use('nav_detective')}
        icon={<Icon24ViewOutline width="28" height="28" />}
      />

      <div class="NavRail__spacer" />

      {connection.status !== 'connected' && (
        <span class="NavRail__connection" title={lang.use('nav_connecting')} />
      )}

      <Popper
        closeOnContentClick
        placement="right-end"
        content={
          <ActionMenu>
            <ActionMenuItem
              onClick={() => settingsModal.open({})}
              text={lang.use('nav_settings')}
              icon={<Icon24GearOutline width="20" color="var(--vkui--color_icon_secondary)" />}
            />
            <ActionMenuItem
              onClick={logout}
              text={lang.use('nav_logout')}
              icon={
                <Icon24DoorArrowRightOutline
                  width="20"
                  color="var(--vkui--color_icon_negative)"
                />
              }
            />
          </ActionMenu>
        }
      >
        <button type="button" class="NavRail__avatar" title={lang.use('nav_account')}>
          <Avatar peer={viewer} size={32} />
        </button>
      </Popper>
    </nav>
  )
}, {
  props: ['onMessengerClick']
})

type ItemProps = {
  active: boolean
  onClick: () => void
  label: string
  icon: JSXElement
  /** Ноль означает отсутствие бейджа: Counter сам ничего не рисует */
  badge?: number
}

const NavRailItem = defineComponent<ItemProps>((props) => {
  return () => (
    <button
      type="button"
      class={['NavRailItem', props.active && 'NavRailItem--active']}
      onClick={props.onClick}
      title={props.label}
    >
      <span class="NavRailItem__indicator" />
      <span class="NavRailItem__icon">{props.icon}</span>
      {!!props.badge && <Counter class="NavRailItem__badge" count={props.badge} />}
    </button>
  )
}, {
  props: ['active', 'onClick', 'label', 'icon', 'badge']
})
