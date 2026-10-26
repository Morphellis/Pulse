import { defineComponent } from 'vue'
import { useRouter } from 'vue-router'
import { GroupsGroup } from 'services/contracts/api/objects/GroupsGroup'
import { UsersUser } from 'services/contracts/api/objects/UsersUser'
import * as Peer from 'model/Peer'
import { fullName, userLink } from 'actions/detective/common'
import { fromApiGroup, fromApiUser } from 'converters/PeerConverter'
import { JSXElement } from 'misc/utils'
import { Avatar } from 'ui/ui/Avatar/Avatar'
import { Link } from 'ui/ui/Link/Link'

type SectionProps = {
  title: string
  hint?: string
}

export const Section = defineComponent<SectionProps>((props, { slots }) => {
  return () => (
    <div class="DtSection">
      <div class="DtSection__title">
        {props.title}
        {props.hint && <span class="DtSection__hint">{props.hint}</span>}
      </div>
      {slots.default?.()}
    </div>
  )
}, {
  props: ['title', 'hint']
})

type RowProps = {
  label: string
  value?: JSXElement
}

export const Row = defineComponent<RowProps>((props, { slots }) => {
  return () => (
    <div class="DtRow">
      <span class="DtRow__label">{props.label}</span>
      <span class="DtRow__value">{props.value ?? slots.default?.()}</span>
    </div>
  )
}, {
  props: ['label', 'value']
})

type UserRowProps = {
  user: UsersUser
  note?: string
}

/**
 * Человек в списке: по имени открывается его страница внутри приложения,
 * рядом остаётся ссылка на сайт и сам идентификатор — он нужен для слежки
 */
export const UserRow = defineComponent<UserRowProps>((props) => {
  const router = useRouter()

  return () => (
    <div class="DtUser">
      <Avatar peer={fromApiUser(props.user)} size={32} />
      <button
        type="button"
        class="DtUser__name"
        onClick={() => router.push({
          name: 'Profile',
          params: { userId: Peer.resolveRealId(props.user.id, 'User') }
        })}
      >
        {fullName(props.user)}
      </button>
      <span class="DtUser__id">{props.user.id}</span>
      <Link href={userLink(props.user)} title="Открыть в VK">↗</Link>
      {props.user.is_closed && <span class="DtBadge">закрытый</span>}
      {props.note && <span class="DtMuted">{props.note}</span>}
    </div>
  )
}, {
  props: ['user', 'note']
})

type GroupRowProps = {
  group: GroupsGroup
}

export const GroupRow = defineComponent<GroupRowProps>((props) => {
  const router = useRouter()

  return () => (
    <div class="DtUser">
      <Avatar peer={fromApiGroup(props.group)} size={32} />
      <button
        type="button"
        class="DtUser__name"
        onClick={() => router.push({
          name: 'Wall',
          params: { ownerId: Peer.resolveRealId(props.group.id, 'Group') }
        })}
      >
        {props.group.name}
      </button>
      <Link href={`https://vk.com/${props.group.screen_name}`} title="Открыть в VK">↗</Link>
      {props.group.members_count !== undefined && (
        <span class="DtMuted">{props.group.members_count.toLocaleString('ru')}</span>
      )}
    </div>
  )
}, {
  props: ['group']
})

type ProgressProps = {
  value: number
  max: number
}

export const Progress = defineComponent<ProgressProps>((props) => {
  return () => {
    const percent = props.max > 0 ? Math.min(100, (props.value / props.max) * 100) : 0

    return (
      <div class="DtProgress">
        <div class="DtProgress__bar" style={{ width: `${percent}%` }} />
      </div>
    )
  }
}, {
  props: ['value', 'max']
})

export function formatDate(timestamp: number, withTime = false) {
  return new Date(timestamp).toLocaleString('ru', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(withTime && { hour: '2-digit', minute: '2-digit' })
  })
}

export function formatDuration(milliseconds: number) {
  const minutes = Math.round(milliseconds / 60000)

  if (minutes < 60) {
    return `${minutes} мин`
  }

  const hours = Math.floor(minutes / 60)
  return `${hours} ч ${minutes % 60} мин`
}
