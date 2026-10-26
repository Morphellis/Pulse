import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as Convo from 'model/Convo'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'
import { useMessageJournalStore } from 'store/messageJournal'
import { useSettingsStore } from 'store/settings'
import { keepDeletedMessage, keepEditedMessage } from 'actions'

// Сторы создают RendererStorage прямо на импорте модуля, а тесты гоняются в ноде
vi.hoisted(() => {
  const store = new Map<string, string>()
  globalThis.localStorage = {
    length: 0,
    key: () => null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear()
  }
})

const peerId = Peer.resolveId(1)

const buildMessage = (text: string, cmid = 10): Message.Normal => ({
  kind: 'Normal',
  peerId,
  cmid: Message.resolveCmid(cmid),
  authorId: Peer.resolveOwnerId(1),
  isOut: false,
  sentAt: 0,
  updatedAt: undefined,
  randomId: 0,
  text,
  attaches: {},
  replyMessage: undefined,
  forwardedMessages: undefined,
  hasMentioned: false
})

// Хелперам нужен только идентификатор беседы, остальное поле не читается
const buildConvo = () => ({ kind: 'UserConvo', id: peerId } as Convo.Convo)

describe('перехват изменений сообщений', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useMessageJournalStore().clear()
  })

  test('удалённое сообщение остаётся и попадает в журнал', () => {
    const convo = buildConvo()
    const message = buildMessage('привет')

    const kept = keepDeletedMessage(convo, message)

    expect(kept).toBe(true)
    expect(message.deletedAt).toBeTypeOf('number')
    expect(useMessageJournalStore().entries).toMatchObject([
      { kind: 'deleted', cmid: 10, text: 'привет' }
    ])
  })

  test('при выключенной настройке сообщение не удерживается', () => {
    useSettingsStore().keepDeletedMessages = false

    const message = buildMessage('привет')
    const kept = keepDeletedMessage(buildConvo(), message)

    expect(kept).toBe(false)
    expect(message.deletedAt).toBeUndefined()
    expect(useMessageJournalStore().entries).toHaveLength(0)
  })

  test('правка сохраняет прежний текст и накапливает историю', () => {
    const convo = buildConvo()
    const first = buildMessage('первый')
    const second = buildMessage('второй')
    const third = buildMessage('третий')

    keepEditedMessage(convo, first, second)
    keepEditedMessage(convo, second, third)

    expect(third.editHistory).toEqual(['первый', 'второй'])
    expect(useMessageJournalStore().entries).toMatchObject([
      { kind: 'edited', text: 'второй', newText: 'третий' },
      { kind: 'edited', text: 'первый', newText: 'второй' }
    ])
  })

  test('правка без изменения текста историю не пополняет', () => {
    const convo = buildConvo()
    const previous = buildMessage('текст')
    previous.editHistory = ['старое']
    const next = buildMessage('текст')

    keepEditedMessage(convo, previous, next)

    expect(next.editHistory).toEqual(['старое'])
    expect(useMessageJournalStore().entries).toHaveLength(0)
  })
})
