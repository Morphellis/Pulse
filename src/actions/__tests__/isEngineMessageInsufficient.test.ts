import { describe, expect, test, vi } from 'vitest'
import { isEngineMessageInsufficient } from 'actions'

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

type Attachments = {
  attachments?: string
  attachments_count?: string
  attach1_type?: string
  attach2_type?: string
}

// Собирает минимальный кортеж события 10004 (новое сообщение) — важна только
// секция attachments, остальные поля isEngineMessageInsufficient не читает
function buildUpdate(attachments: Attachments): Parameters<typeof isEngineMessageInsufficient>[0] {
  return [
    10004,
    100,
    0,
    0,
    1,
    0,
    'текст',
    {},
    attachments,
    0,
    1,
    0
  ] as unknown as Parameters<typeof isEngineMessageInsufficient>[0]
}

describe(isEngineMessageInsufficient.name, () => {
  test('видео и кружок из компактных данных лонгпола всегда недостаточны', () => {
    const compactShape = {
      attachments: '[{"video_message":{}}]',
      attachments_count: '1'
    }

    expect(isEngineMessageInsufficient(
      buildUpdate({ ...compactShape, attach1_type: 'video_message' }),
      undefined
    )).toBe(true)

    expect(isEngineMessageInsufficient(
      buildUpdate({ ...compactShape, attach1_type: 'video' }),
      undefined
    )).toBe(true)
  })

  test('voice и стикер из компактных данных лонгпола считаются достаточными', () => {
    const base = { attachments: '[{}]', attachments_count: '1' }

    expect(isEngineMessageInsufficient(
      buildUpdate({ ...base, attach1_type: 'sticker' }),
      undefined
    )).toBe(false)

    expect(isEngineMessageInsufficient(
      buildUpdate({ ...base, attach1_type: 'audio_message' }),
      undefined
    )).toBe(false)
  })

  test('два вложения в одном сообщении всегда недостаточны, даже voice и стикер', () => {
    const update = buildUpdate({
      attachments: '[{},{}]',
      attachments_count: '2',
      attach1_type: 'sticker',
      attach2_type: 'audio_message'
    })

    expect(isEngineMessageInsufficient(update, undefined)).toBe(true)
  })

  test('сообщение без вложений само по себе не считается недостаточным', () => {
    expect(isEngineMessageInsufficient(buildUpdate({}), undefined)).toBe(false)
  })
})
