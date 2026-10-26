import { useUsageStore } from 'store/usage'
import { USAGE_COUNTER_ENDPOINT } from 'misc/constants'

/**
 * Отмечает запуск приложения на сервере счётчика и забирает текущее число.
 *
 * Это единственное место во всём приложении, которое обращается не к ВК.
 * Пока USAGE_COUNTER_ENDPOINT пуст, запрос не отправляется вообще
 */
export async function reportUsage() {
  if (!USAGE_COUNTER_ENDPOINT) {
    return
  }

  const usage = useUsageStore()

  if (usage.status === 'loading') {
    return
  }

  try {
    usage.status = 'loading'

    const response = await fetch(USAGE_COUNTER_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installId: usage.ensureInstallId() }),
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      throw new Error(`counter responded with ${response.status}`)
    }

    const result = await response.json() as { users?: number, logins?: number }

    usage.users = result.users ?? 0
    usage.logins = result.logins ?? 0
    usage.status = 'idle'
  } catch (err) {
    // Счётчик не должен мешать работе приложения, поэтому ошибку только логируем
    console.warn('[reportUsage] error', err)
    usage.status = 'error'
  }
}
