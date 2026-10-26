import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

/*
  Сторы создают RendererStorage прямо на импорте модуля, а Api и misc/utils ходят
  в таймеры через window — в ноде нет ни того, ни другого. hoisted нужен,
  чтобы заглушки появились до импортов
*/
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

/** Позволяет заставить чтение настроек падать: см. тест про утечку семафора */
const mocks = vi.hoisted(() => ({ settingsFailuresLeft: 0 }))

vi.mock('store/settings', () => ({
  useSettingsStore: () => {
    if (mocks.settingsFailuresLeft > 0) {
      mocks.settingsFailuresLeft--
      throw new Error('settings store is not ready')
    }
    return { lang: 'ru' }
  }
}))

// Капча показывается модалкой, тестам достаточно того, что «пользователь» её ввёл
vi.mock('hooks', () => ({
  useGlobalModal: () => ({
    captchaModal: {
      open: ({ onClose }: { onClose: (key: string) => void }) => onClose('captcha-key')
    }
  })
}))

const { Api } = await import('services/Api')

type ApiResult = Record<string, unknown>

/** Считает запросы и отвечает заранее заданным телом */
function stubFetch(respond: (call: number) => ApiResult) {
  const calls = { count: 0 }

  vi.stubGlobal('fetch', () => {
    calls.count++
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(respond(calls.count))
    })
  })

  return calls
}

const tooManyRequests = {
  error: {
    error_code: 6,
    error_msg: 'Too many requests per second',
    request_params: []
  }
}

const captchaNeeded = {
  error: {
    error_code: 14,
    error_msg: 'Captcha needed',
    captcha_sid: '123',
    captcha_img: 'https://vk.com/captcha.php',
    request_params: []
  }
}

/**
 * Следит за исходом запроса.
 *
 * Обработчик вешается сразу, иначе отказ успевает всплыть как unhandled rejection.
 * Если запрос не завершится вовсе, ожидание этого промиса упрётся в таймаут теста —
 * то есть зависший навсегда запрос виден как провал, а не как зелёный тест
 */
function trackOutcome(request: Promise<unknown>) {
  return request.then(() => 'resolved', () => 'rejected')
}

/** Прокручивает виртуальное время, давая промисам возможность продвинуться */
async function advance(milliseconds: number) {
  for (let passed = 0; passed < milliseconds; passed += 250) {
    await vi.advanceTimersByTimeAsync(250)
  }
}

function createApi() {
  return new Api(() => Promise.resolve('refreshed-token'))
}

beforeEach(() => {
  setActivePinia(createPinia())
  mocks.settingsFailuresLeft = 0
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Api.fetch: ошибка 6 (слишком много запросов)', () => {
  test('при retries: 0 запрос падает, а не крутится вечно', async () => {
    const calls = stubFetch(() => tooManyRequests)
    const api = createApi()

    const outcome = trackOutcome(api.fetch('users.get', { fields: '' }, { retries: 0 }))
    await advance(30000)

    await expect(outcome).resolves.toBe('rejected')
    // Одна попытка при retries: 0 — раньше запросы шли до бесконечности
    expect(calls.count).toBe(1)
  })

  test('retries соблюдается: три попытки при retries: 2, потом отказ', async () => {
    const calls = stubFetch(() => tooManyRequests)
    const api = createApi()

    const outcome = trackOutcome(api.fetch('users.get', { fields: '' }, { retries: 2 }))
    await advance(30000)

    await expect(outcome).resolves.toBe('rejected')
    expect(calls.count).toBe(3)
  })

  test('успех после временной ошибки всё ещё возможен', async () => {
    stubFetch((call) => (call === 1 ? tooManyRequests : { response: { ok: true } }))
    const api = createApi()

    const request = api.fetch('users.get', { fields: '' }, { retries: 1 })
    await advance(5000)

    await expect(request).resolves.toEqual({ ok: true })
  })
})

describe('Api.fetch: потолок на сброс попыток', () => {
  test('бесконечная капча не подвешивает запрос навсегда', async () => {
    const calls = stubFetch(() => captchaNeeded)
    const api = createApi()

    const outcome = trackOutcome(api.fetch('users.get', { fields: '' }, { retries: 0 }))
    await advance(30000)

    await expect(outcome).resolves.toBe('rejected')
    // Сбросов не больше трёх, дальше счётчик попыток работает как обычно
    expect(calls.count).toBeLessThanOrEqual(5)
  })
})

describe('Api.fetch: возврат слота семафора', () => {
  test('падение до запроса не съедает слот навсегда', async () => {
    stubFetch(() => ({ response: { ok: true } }))
    const api = createApi()

    // Ровно столько же, сколько слотов у семафора: если хоть один не вернётся,
    // следующий запрос встанет в очередь навсегда
    mocks.settingsFailuresLeft = 3

    for (let attempt = 0; attempt < 3; attempt++) {
      const failed = trackOutcome(api.fetch('users.get', { fields: '' }, { retries: 0 }))
      await advance(2000)
      await expect(failed).resolves.toBe('rejected')
    }

    const request = api.fetch('users.get', { fields: '' })
    const outcome = trackOutcome(request)
    await advance(5000)

    await expect(outcome).resolves.toBe('resolved')
    await expect(request).resolves.toEqual({ ok: true })
  })
})
