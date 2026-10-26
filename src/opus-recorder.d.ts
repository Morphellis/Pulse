declare module 'opus-recorder' {
  type RecorderOptions = {
    /** Путь до воркера с энкодером, обязателен: без него библиотека не найдёт свой WASM */
    encoderPath: string
    encoderSampleRate?: number
    encoderBitRate?: number
    numberOfChannels?: number
  }

  // @ts-expect-error Переопределяем экспорт: библиотека — UMD-бандл без своих типов
  // eslint-disable-next-line import-x/no-default-export
  export default class Recorder {
    constructor(options: RecorderOptions)
    ondataavailable: (data: Uint8Array) => void
    start(): Promise<void>
    /** Останавливает запись и гасит микрофон, но AudioContext оставляет живым — см. close */
    stop(): Promise<void>
    pause(flush?: boolean): Promise<void>
    resume(): void
    /**
     * Освобождает AudioContext и воркер энкодера. Без вызова каждая запись оставляет
     * после себя живой контекст, а их число на документ ограничено браузером
     */
    close(): Promise<void>
  }
}
