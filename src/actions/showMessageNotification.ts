import { useServices } from 'services'
import * as Convo from 'model/Convo'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'
import { useNotificationsStore } from 'store/notifications'
import { usePeersStore } from 'store/peers'
import { useServerClockStore } from 'store/serverClock'
import { useSettingsStore } from 'store/settings'
import { electronBridge } from 'misc/electronBridge'
import { playNotificationSound } from 'misc/notificationSound'
import { NotificationPayload } from 'main-process/shared'

/**
 * После переподключения движок может прислать пачку уже прочитанных событий.
 * Уведомляем только о свежем, иначе при возвращении из сна экран завалит карточками.
 *
 * Возраст считается через serverClock, а не вычитанием из Date.now(): время отправки
 * серверное, и при часах, убежавших вперёд хотя бы на минуту, прямое сравнение
 * объявляло старым вообще каждое сообщение — уведомления пропадали целиком и молча
 */
const FRESHNESS_LIMIT = 60_000

export function showMessageNotification(convo: Convo.Convo, message: Message.Message) {
  const settings = useSettingsStore()
  const presence = useNotificationsStore()
  const serverClock = useServerClockStore()

  if (!settings.notifications && !settings.notificationSound) {
    return
  }

  // Служебные и исчезнувшие сообщения показывать не в чем: открывать по ним нечего
  if (message.isOut || message.kind !== 'Normal') {
    return
  }

  if (!convo.notifications.enabled || serverClock.age(message.sentAt) > FRESHNESS_LIMIT) {
    return
  }

  // Переписка открыта и окно активно: пользователь и так видит сообщение
  if (presence.isWindowFocused && presence.activePeerId === convo.id) {
    return
  }

  if (settings.notificationSound) {
    playNotificationSound(settings.notificationSoundId, settings.notificationVolume)
  }

  if (settings.notifications) {
    electronBridge.notifications.show(buildPayload(convo, message))
  }
}

function buildPayload(convo: Convo.Convo, message: Message.Normal): NotificationPayload {
  const { lang } = useServices()
  const settings = useSettingsStore()
  const { peers } = usePeersStore()

  const peer = Peer.safeGet(peers, convo.id)
  // В беседе заголовок занят ее названием, поэтому автора выносим в отдельную строку
  const author = convo.kind === 'ChatConvo'
    ? Peer.name(Peer.safeGet(peers, message.authorId))
    : undefined

  return {
    id: `${convo.id}_${message.cmid}`,
    peerId: convo.id,
    title: Peer.name(peer),
    author,
    text: settings.notificationShowText
      ? messageText(message, lang)
      : lang.use('me_notification_hidden_text'),
    avatar: peer.photo100 || peer.photo50 || undefined,
    initials: Peer.initials(peer),
    avatarColor: Math.abs(peer.id) % 6
  }
}

function messageText(message: Message.Normal, lang: ReturnType<typeof useServices>['lang']) {
  const attaches = Message.attachesPreview(message, lang)

  if (message.text && attaches) {
    return `${message.text} ${attaches}`
  }

  return message.text || attaches || lang.use('me_empty_message')
}
