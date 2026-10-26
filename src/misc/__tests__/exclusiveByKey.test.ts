import { describe, expect, test } from 'vitest'
import { exclusiveByKey } from 'misc/utils'

describe(exclusiveByKey.name, () => {
  test('повторный вызов с тем же ключом, пока предыдущий не завершился, игнорируется', async () => {
    let calls = 0
    let running = 0
    let resolveFirst: () => void = () => undefined

    const action = exclusiveByKey(async () => {
      calls++
      running++
      await new Promise<void>((resolve) => {
        resolveFirst = resolve
      })
      running--
    }, () => 'key')

    const first = action()
    const second = action()

    expect(running).toBe(1)

    resolveFirst()
    await first
    await second

    expect(calls).toBe(1)
  })

  test('вызовы с разными ключами выполняются независимо и не блокируют друг друга', async () => {
    const seen: string[] = []

    const action = exclusiveByKey(async (key: string) => {
      seen.push(`start:${key}`)
      await Promise.resolve()
      seen.push(`end:${key}`)
    }, (key) => key)

    await Promise.all([action('a'), action('b')])

    expect(seen).toContain('start:a')
    expect(seen).toContain('start:b')
    expect(seen).toContain('end:a')
    expect(seen).toContain('end:b')
  })

  test('после завершения предыдущего вызова с тем же ключом новый выполняется', async () => {
    let calls = 0
    const action = exclusiveByKey((): Promise<void> => {
      calls++
      return Promise.resolve()
    }, () => 'key')

    await action()
    await action()

    expect(calls).toBe(2)
  })

  test('ключ освобождается, даже если действие бросило ошибку', async () => {
    let calls = 0
    const action = exclusiveByKey((): Promise<void> => {
      calls++
      return Promise.reject(new Error('fail'))
    }, () => 'key')

    await expect(action()).rejects.toThrow('fail')
    await expect(action()).rejects.toThrow('fail')

    expect(calls).toBe(2)
  })
})
