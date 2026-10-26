import { describe, expect, test, vi } from 'vitest'
import { fromApiAttaches, fromApiVideoFiles } from 'converters/AttachConverter'

// Сторы создают RendererStorage прямо на импорте модуля, а тесты гоняются в ноде.
// hoisted нужен, чтобы заглушка появилась до импортов
vi.hoisted(() => {
  globalThis.localStorage = {
    length: 0,
    key: () => null,
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined
  }
})

const videoFiles = {
  mp4_240: 'https://cdn/240',
  mp4_480: 'https://cdn/480',
  hls_ondemand: 'https://cdn/hls',
  failover_host: 'cdn2'
}

describe('fromApiVideoFiles', () => {
  test('оставляет только mp4 и сортирует от лучшего качества', () => {
    expect(fromApiVideoFiles(videoFiles)).toEqual([
      { height: 480, url: 'https://cdn/480' },
      { height: 240, url: 'https://cdn/240' }
    ])
  })

  test('без files возвращает undefined, а без mp4 — пустой список', () => {
    expect(fromApiVideoFiles(undefined)).toBeUndefined()
    expect(fromApiVideoFiles({ hls: 'https://cdn/hls' })).toEqual([])
  })
})

describe('fromApiAttaches', () => {
  test('разбирает кружок, приходящий отдельным видом вложения', () => {
    const attaches = fromApiAttaches([{
      type: 'video_message',
      video_message: {
        id: 456243029,
        owner_id: 452982802,
        access_key: 'key',
        duration: 14,
        width: 480,
        height: 480,
        type: 'video_message',
        files: videoFiles
      }
    }], true)

    expect(attaches.videos).toHaveLength(1)

    const [video] = attaches.videos ?? []
    expect(video?.isVideoMessage).toBe(true)
    expect(video?.sources).toEqual([
      { height: 480, url: 'https://cdn/480' },
      { height: 240, url: 'https://cdn/240' }
    ])
    // Кружок не должен попадать в неразобранные вложения
    expect(attaches.unknown).toBeUndefined()
  })

  test('обычное видео разбирается видео и не считается кружком', () => {
    const attaches = fromApiAttaches([{
      type: 'video',
      video: {
        id: 456241560,
        owner_id: 471450482,
        title: 'Клип',
        duration: 19,
        width: 480,
        height: 852,
        type: 'short_video',
        files: videoFiles
      }
    }], true)

    const [video] = attaches.videos ?? []
    expect(video?.isVideoMessage).toBe(false)
    expect(video?.title).toBe('Клип')
    expect(video?.sources).toHaveLength(2)
  })

  test('вложение без содержимого уходит в неразобранные', () => {
    const attaches = fromApiAttaches([{ type: 'video_message' }], true)

    expect(attaches.videos).toBeUndefined()
    expect(attaches.unknown).toHaveLength(1)
  })
})
