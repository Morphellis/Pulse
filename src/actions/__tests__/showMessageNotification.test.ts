import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import * as Convo from 'model/Convo'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'
import { useServerClockStore } from 'store/serverClock'
import { useSettingsStore } from 'store/settings'

vi.hoisted(() => {
  globalThis.localStorage = {
    length: 0,
    key: () => null,
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined
  }
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true })
})

const mocks = vi.hoisted(() => ({ showNotification: vi.fn() }))

// Рендерер общается с main-процессом только через мост из preload, его и подменяем
vi.mock('misc/electronBridge', () => ({
  electronBridge: {
    notifications: { show: mocks.showNotification }
  }
}))

// Звук уводит нас в Audio, которого в ноде нет, а проверяем мы не его
vi.mock('misc/notificationSound', () => ({
  playNotificationSound: () => undefined
}))

vi.mock('services', () => ({
  useServices: () => ({ lang: { use: (key: string) => key } })
}))

const { showMessageNotification } = await import('../showMessageNotification')

const MINUTE = 60_000
const PEER_ID = Peer.resolveId(1)

function makeConvo() {
  return Convo.safeGet(new Map(), PEER_ID)
}

/** Входящее сообщение с указанным серверным временем отправки */
function makeMessage(sentAt: number): Message.Normal {
  return {
    kind: 'Normal',
    peerId: PEER_ID,
    cmid: Message.resolveCmid(1),
    authorId: Peer.resolveOwnerId(1),
    isOut: false,
    sentAt,
    updatedAt: undefined,
    randomId: 0,
    text: 'привет',
    attaches: {},
    replyMessage: undefined,
    forwardedMessages: undefined,
    hasMentioned: false
  }
}

function notificationsSent() {
  return mocks.showNotification.mock.calls
}

beforeEach(() => {
  setActivePinia(createPinia())
  mocks.showNotification.mockReset()
  vi.useFakeTimers()

  const settings = useSettingsStore()
  settings.notifications = true
  settings.notificationSound = false

  // Convo.safeGet и Peer.safeGet в dev-режиме предупреждают о заглушках
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('showMessageNotification: свежесть сообщения', () => {
  test('свежее сообщение показывается', () => {
    showMessageNotification(makeConvo(), makeMessage(Date.now()))

    expect(notificationsSent()).toHaveLength(1)
  })

  test('старое сообщение из догоняющей пачки не показывается', () => {
    showMessageNotification(makeConvo(), makeMessage(Date.now() - 30 * MINUTE))

    expect(notificationsSent()).toHaveLength(0)
  })

  test('часы, убежавшие вперёд, не отключают уведомления совсем', () => {
    const skew = 10 * MINUTE
    const clock = useServerClockStore()

    /*
      Локальные часы на десять минут впереди серверных. Раньше возраст считался
      вычитанием из Date.now(), и каждое живое сообщение выглядело
      десятиминутной давности — уведомления пропадали целиком и молча
    */
    const sentAt = Date.now() - skew
    clock.observe(sentAt)

    showMessageNotification(makeConvo(), makeMessage(sentAt))

    expect(notificationsSent()).toHaveLength(1)
  })

  test('при убежавших часах старое сообщение всё ещё отсекается', () => {
    const skew = 10 * MINUTE
    const clock = useServerClockStore()

    const liveSentAt = Date.now() - skew
    clock.observe(liveSentAt)

    showMessageNotification(makeConvo(), makeMessage(liveSentAt - 30 * MINUTE))

    expect(notificationsSent()).toHaveLength(0)
  })

  test('часы, отставшие назад, тоже не мешают', () => {
    const skew = -10 * MINUTE
    const clock = useServerClockStore()

    const sentAt = Date.now() - skew
    clock.observe(sentAt)

    showMessageNotification(makeConvo(), makeMessage(sentAt))

    expect(notificationsSent()).toHaveLength(1)
  })
})

describe('showMessageNotification: что уведомления не заслуживает', () => {
  test('своё сообщение', () => {
    const message = { ...makeMessage(Date.now()), isOut: true }
    showMessageNotification(makeConvo(), message)

    expect(notificationsSent()).toHaveLength(0)
  })

  test('беседа с выключенными уведомлениями', () => {
    const convo = makeConvo()
    convo.notifications.enabled = false

    showMessageNotification(convo, makeMessage(Date.now()))

    expect(notificationsSent()).toHaveLength(0)
  })
})
