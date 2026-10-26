import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { Semaphore } from 'misc/Semaphore'

describe(Semaphore.name, () => {
  beforeEach(() => {
    // Semaphore.release зовёт window.setTimeout, а тесты гоняются в node-окружении без window
    vi.stubGlobal('window', globalThis)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  test('пропускает не больше capacity одновременных операций', async () => {
    const semaphore = new Semaphore(2, 100)
    const acquired: number[] = []

    void semaphore.lock().then(() => acquired.push(1))
    void semaphore.lock().then(() => acquired.push(2))
    void semaphore.lock().then(() => acquired.push(3))

    await vi.advanceTimersByTimeAsync(0)
    expect(acquired).toEqual([1, 2])
  })

  test('после release ожидающий получает слот только через window мс', async () => {
    const semaphore = new Semaphore(1, 100)

    await semaphore.lock()

    let secondAcquired = false
    void semaphore.lock().then(() => {
      secondAcquired = true
    })

    semaphore.release()

    await vi.advanceTimersByTimeAsync(50)
    expect(secondAcquired).toBe(false)

    await vi.advanceTimersByTimeAsync(50)
    expect(secondAcquired).toBe(true)
  })

  test('слот из очереди передаётся следующему напрямую, не открывая лишний', async () => {
    const semaphore = new Semaphore(1, 50)

    await semaphore.lock()

    const order: number[] = []
    void semaphore.lock().then(() => order.push(2))
    void semaphore.lock().then(() => order.push(3))

    // Отпускаем первого — слот должен достаться второму, а не обоим сразу
    semaphore.release()

    await vi.advanceTimersByTimeAsync(50)
    expect(order).toEqual([2])

    // Третий всё ещё ждёт: второй ещё не вызвал release
    await vi.advanceTimersByTimeAsync(1000)
    expect(order).toEqual([2])

    semaphore.release()
    await vi.advanceTimersByTimeAsync(50)
    expect(order).toEqual([2, 3])
  })

  test('после освобождения без очереди ресурс возвращается в пул', async () => {
    const semaphore = new Semaphore(1, 50)

    await semaphore.lock()
    semaphore.release()

    await vi.advanceTimersByTimeAsync(50)

    let acquired = false
    void semaphore.lock().then(() => {
      acquired = true
    })

    await vi.advanceTimersByTimeAsync(0)
    expect(acquired).toBe(true)
  })
})
