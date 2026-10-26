import { onUnmounted, shallowRef } from 'vue'

import Recorder from 'opus-recorder'
// eslint-disable-next-line import-x/extensions -- ссылка на статический ассет, а не модуль
import encoderPath from 'opus-recorder/dist/encoderWorker.min.js?url'

export type VoiceRecorderStatus = 'idle' | 'recording' | 'paused' | 'error'

export type RecordedVoice = {
  blob: Blob
  duration: number
}

/**
 * Сколько ждём последний кусок от энкодера после остановки.
 *
 * Без потолка промис stop() резолвится только из ondataavailable: если энкодер
 * данные не отдаст, композер останется в состоянии записи навсегда
 */
const ENCODER_FLUSH_TIMEOUT = 10000

/**
 * Записывает голосовое сразу в Ogg/Opus 16 кГц — формат, которого ждёт ВК
 * для голосовых (см. Uploader.uploadVoice). Встроенный в Chromium/Electron
 * MediaRecorder умеет писать только в WebM, поэтому кодирование в Ogg берёт
 * на себя WASM-энкодер библиотеки, а не браузерный API
 */
export function useVoiceRecorder() {
  const status = shallowRef<VoiceRecorderStatus>('idle')
  const duration = shallowRef(0)

  let recorder: Recorder | null = null
  let intervalId = 0
  /** Секунды, накопленные до текущего отрезка записи — переживают паузу/возобновление */
  let elapsedBeforeSegment = 0
  let segmentStartedAt = 0
  /**
   * Растёт на каждый старт и на каждую отмену.
   *
   * start() запоминает своё значение и сверяется с ним после ожидания доступа
   * к микрофону: если значение сменилось, запись успели отменить, пока висел
   * системный запрос, и продолжать нельзя
   */
  let generation = 0
  /** Между вызовом start() и получением доступа гасить ещё нечего — потока нет */
  let isStarting = false

  const clearTimer = () => {
    window.clearInterval(intervalId)
    intervalId = 0
  }

  const tick = () => {
    duration.value = elapsedBeforeSegment + (Date.now() - segmentStartedAt) / 1000
  }

  const startTimer = () => {
    clearTimer()
    segmentStartedAt = Date.now()
    intervalId = window.setInterval(tick, 200)
  }

  const reset = () => {
    clearTimer()
    recorder = null
    status.value = 'idle'
    duration.value = 0
    elapsedBeforeSegment = 0
  }

  /**
   * Полностью освобождает рекордер: микрофон гасит stop(), а AudioContext
   * и воркер энкодера — только close(). Без второго вызова каждая запись
   * оставляет после себя живой контекст, и через несколько записей
   * браузер перестаёт выдавать новые
   */
  const dispose = async (target: Recorder) => {
    target.ondataavailable = () => undefined

    try {
      await target.stop()
    } catch (error) {
      console.warn('[useVoiceRecorder] stop failed', error)
    }

    try {
      await target.close()
    } catch (error) {
      console.warn('[useVoiceRecorder] close failed', error)
    }
  }

  const start = async () => {
    if (recorder) {
      throw new Error('Recorder is already active')
    }

    const currentGeneration = ++generation
    const currentRecorder = new Recorder({
      encoderPath,
      encoderSampleRate: 16000,
      encoderBitRate: 16000,
      numberOfChannels: 1
    })

    recorder = currentRecorder
    isStarting = true

    try {
      // Просит доступ к микрофону сама — своего getUserMedia нам заводить не нужно
      await currentRecorder.start()
    } catch (error) {
      isStarting = false

      // Отмену во время запроса доступа не перебиваем состоянием ошибки
      if (generation === currentGeneration) {
        reset()
        status.value = 'error'
      }

      void dispose(currentRecorder)
      throw error
    }

    isStarting = false

    /*
      Запись отменили, пока висел запрос доступа. К этому моменту микрофон уже
      захвачен, а cancel() гасить было нечего — освобождаем здесь, иначе запись
      продолжится вхолостую и остановить её будет уже нечем
    */
    if (generation !== currentGeneration) {
      void dispose(currentRecorder)
      return
    }

    status.value = 'recording'
    elapsedBeforeSegment = 0
    startTimer()
  }

  const pause = () => {
    if (!recorder || status.value !== 'recording') {
      return
    }

    void recorder.pause()
    // Считаем время по факту, а не по последнему тику: иначе на каждой паузе
    // теряется до интервала таймера, и за несколько пауз набегает заметная разница
    tick()
    clearTimer()
    elapsedBeforeSegment = duration.value
    status.value = 'paused'
  }

  const resume = () => {
    if (!recorder || status.value !== 'paused') {
      return
    }

    recorder.resume()
    startTimer()
    status.value = 'recording'
  }

  /** Останавливает запись и отдаёт готовый файл вместе с его длительностью */
  const stop = (): Promise<RecordedVoice> => {
    const currentRecorder = recorder

    if (!currentRecorder || isStarting) {
      return Promise.reject(new Error('Recorder is not active'))
    }

    if (status.value === 'recording') {
      tick()
    }
    clearTimer()

    const finalDuration = duration.value

    return new Promise<RecordedVoice>((resolve, reject) => {
      let isSettled = false
      let timeoutId = 0

      const settle = (error: Error | null, blob?: Blob) => {
        if (isSettled) {
          return
        }
        isSettled = true

        window.clearTimeout(timeoutId)
        void dispose(currentRecorder)
        reset()

        if (error || !blob) {
          reject(error ?? new Error('Voice encoder returned no data'))
        } else {
          resolve({ blob, duration: finalDuration })
        }
      }

      timeoutId = window.setTimeout(
        () => settle(new Error('Voice encoder timed out')),
        ENCODER_FLUSH_TIMEOUT
      )

      currentRecorder.ondataavailable = (data) => {
        // Тип из воркера формально ArrayBufferLike, Blob ждёт именно ArrayBuffer
        settle(null, new Blob([data as BlobPart], { type: 'audio/ogg' }))
      }

      void currentRecorder.stop()
    })
  }

  /** Останавливает запись, не сохраняя результат */
  const cancel = () => {
    const abandoned = recorder
    const wasStarting = isStarting

    // Сообщаем ещё не завершившемуся start(), что его результат больше не нужен
    generation++
    reset()

    if (abandoned && !wasStarting) {
      void dispose(abandoned)
    }
  }

  onUnmounted(cancel)

  return { status, duration, start, pause, resume, stop, cancel }
}
