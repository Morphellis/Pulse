import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

// Хук берёт таймеры из window, которого в ноде нет
vi.hoisted(() => {
  Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true })
})

/**
 * Заглушка opus-recorder, повторяющая поведение настоящей библиотеки в том,
 * что важно для этих тестов:
 * — start() ждёт разрешения на микрофон и до него ничего не захватывает;
 * — stop() из состояния inactive возвращается сразу и поток не трогает;
 * — close() и только close() освобождает AudioContext
 */
class FakeRecorder {
  static instances: FakeRecorder[] = []

  state: 'inactive' | 'loading' | 'recording' | 'paused' = 'inactive'
  isStreamStopped = false
  isClosed = false
  /** Отдавать ли данные по stop(): выключается, чтобы проверить таймаут энкодера */
  emitsData = true
  ondataavailable: (data: Uint8Array) => void = () => undefined

  private grant!: () => void
  private readonly permission: Promise<void>

  constructor() {
    this.permission = new Promise<void>((resolve) => (this.grant = resolve))
    FakeRecorder.instances.push(this)
  }

  static get last() {
    const instance = FakeRecorder.instances.at(-1)
    if (!instance) {
      throw new Error('Recorder was not created')
    }
    return instance
  }

  static reset() {
    FakeRecorder.instances = []
  }

  async start() {
    this.state = 'loading'
    await this.permission
    this.state = 'recording'
  }

  /** Имитирует выданное пользователем разрешение на микрофон */
  grantMicrophone() {
    this.grant()
  }

  pause() {
    this.state = 'paused'
    return Promise.resolve()
  }

  resume() {
    this.state = 'recording'
  }

  stop() {
    // Настоящая библиотека выходит отсюда сразу для любого состояния, кроме
    // recording и paused — в том числе пока ещё висит запрос доступа к микрофону
    if (this.state !== 'recording' && this.state !== 'paused') {
      return Promise.resolve()
    }

    this.state = 'inactive'
    this.isStreamStopped = true

    if (this.emitsData) {
      this.ondataavailable(new Uint8Array([1, 2, 3]))
    }

    return Promise.resolve()
  }

  close() {
    this.isClosed = true
    return Promise.resolve()
  }
}

vi.mock('opus-recorder', () => ({ default: FakeRecorder }))
vi.mock('opus-recorder/dist/encoderWorker.min.js?url', () => ({ default: 'encoderWorker.js' }))

const { useVoiceRecorder } = await import('../useVoiceRecorder')

/** Даёт отработать цепочкам промисов внутри хука */
async function flushMicrotasks() {
  for (let turn = 0; turn < 20; turn++) {
    await Promise.resolve()
  }
}

beforeEach(() => {
  FakeRecorder.reset()
  vi.useFakeTimers()
  /*
    Хук объявляет onUnmounted, а компонента в тестах нет — Vue пишет об этом
    предупреждение на каждый вызов. Сообщения самого хука тоже сюда попадают
  */
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useVoiceRecorder: отмена во время запроса доступа', () => {
  test('микрофон не остаётся включённым, а статус не уезжает в recording', async () => {
    const recorder = useVoiceRecorder()
    const starting = recorder.start()

    // Пользователь передумал, пока висит системный запрос доступа
    recorder.cancel()
    expect(recorder.status.value).toBe('idle')

    // Доступ выдан уже после отмены
    FakeRecorder.last.grantMicrophone()
    await starting
    await flushMicrotasks()

    expect(recorder.status.value).toBe('idle')
    expect(FakeRecorder.last.isStreamStopped).toBe(true)
    expect(FakeRecorder.last.isClosed).toBe(true)
  })

  test('после отмены можно начать запись заново', async () => {
    const recorder = useVoiceRecorder()

    const abandoned = recorder.start()
    recorder.cancel()
    FakeRecorder.last.grantMicrophone()
    await abandoned
    await flushMicrotasks()

    const starting = recorder.start()
    FakeRecorder.last.grantMicrophone()
    await starting

    expect(recorder.status.value).toBe('recording')
    expect(FakeRecorder.instances).toHaveLength(2)
  })
})

describe('useVoiceRecorder: освобождение AudioContext', () => {
  test('close() вызывается на каждый завершённый цикл записи', async () => {
    const recorder = useVoiceRecorder()

    for (let cycle = 0; cycle < 3; cycle++) {
      const starting = recorder.start()
      FakeRecorder.last.grantMicrophone()
      await starting

      await recorder.stop()
      await flushMicrotasks()
    }

    expect(FakeRecorder.instances).toHaveLength(3)
    // Без close() контекст остаётся жить, и через несколько записей их лимит исчерпывается
    expect(FakeRecorder.instances.every(({ isClosed }) => isClosed)).toBe(true)
  })

  test('close() вызывается и при отмене уже идущей записи', async () => {
    const recorder = useVoiceRecorder()

    const starting = recorder.start()
    FakeRecorder.last.grantMicrophone()
    await starting

    recorder.cancel()
    await flushMicrotasks()

    expect(FakeRecorder.last.isStreamStopped).toBe(true)
    expect(FakeRecorder.last.isClosed).toBe(true)
  })
})

describe('useVoiceRecorder: длительность', () => {
  test('пауза не съедает время между тиками таймера', async () => {
    const recorder = useVoiceRecorder()

    const starting = recorder.start()
    FakeRecorder.last.grantMicrophone()
    await starting

    // Намеренно не кратно интервалу таймера: остаток и терялся на каждой паузе
    await vi.advanceTimersByTimeAsync(1100)
    recorder.pause()
    expect(recorder.duration.value).toBeCloseTo(1.1, 5)

    recorder.resume()
    await vi.advanceTimersByTimeAsync(900)

    const { duration } = await recorder.stop()
    expect(duration).toBeCloseTo(2, 5)
  })
})

describe('useVoiceRecorder: молчащий энкодер', () => {
  test('stop() не висит вечно, а падает по таймауту', async () => {
    const recorder = useVoiceRecorder()

    const starting = recorder.start()
    FakeRecorder.last.grantMicrophone()
    await starting

    FakeRecorder.last.emitsData = false

    const stopping = recorder.stop()
    const outcome = stopping.then(() => 'resolved', () => 'rejected')

    await vi.advanceTimersByTimeAsync(15000)

    await expect(outcome).resolves.toBe('rejected')
    expect(recorder.status.value).toBe('idle')
  })
})
