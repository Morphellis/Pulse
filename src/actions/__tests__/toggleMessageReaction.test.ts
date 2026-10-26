import { describe, expect, test, vi } from 'vitest'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'
import { isReactionTogglePending, toggleMessageReaction } from 'actions'

// Баррель actions тянет за собой стор viewer, а тот создаёт RendererStorage
// прямо на импорте модуля — тесты гоняются в ноде без localStorage
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

const fetchMock = vi.fn()

vi.mock('services', () => ({
  useServices: () => ({ api: { fetch: fetchMock } })
}))

const peerId = Peer.resolveId(1)

const buildMessage = (cmid = 10): Message.Normal => ({
  kind: 'Normal',
  peerId,
  cmid: Message.resolveCmid(cmid),
  authorId: Peer.resolveOwnerId(1),
  isOut: false,
  sentAt: 0,
  updatedAt: undefined,
  randomId: 0,
  text: '',
  attaches: {},
  replyMessage: undefined,
  forwardedMessages: undefined,
  hasMentioned: false
})

describe(toggleMessageReaction.name, () => {
  // Пока запрос не завершился, isReactionTogglePending защищает от обгоняющего
  // снимка из лонгпола (см. handleEngineUpdates, событие 601)
  test('помечает сообщение занятым, пока запрос не завершился', async () => {
    const message = buildMessage()
    let resolveFetch: () => void = () => undefined

    fetchMock.mockImplementationOnce(() => new Promise((resolve) => {
      resolveFetch = () => resolve(undefined)
    }))

    expect(isReactionTogglePending(message)).toBe(false)

    const call = toggleMessageReaction(message, 5)

    expect(isReactionTogglePending(message)).toBe(true)
    expect(message.myReactionId).toBe(5)

    resolveFetch()
    await call

    expect(isReactionTogglePending(message)).toBe(false)
  })

  test('снимает пометку и откатывает реакцию, даже если запрос упал', async () => {
    const message = buildMessage(11)
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error('network')))

    await toggleMessageReaction(message, 5)

    expect(isReactionTogglePending(message)).toBe(false)
    expect(message.myReactionId).toBeUndefined()
  })

  test('до вызова тоггла сообщение не считается занятым', () => {
    expect(isReactionTogglePending(buildMessage(12))).toBe(false)
  })
})
