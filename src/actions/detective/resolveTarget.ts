import { useServices } from 'services'

/**
 * Превращает то, что вставил пользователь (ссылка, id, короткое имя), в числовой id пользователя.
 * Возвращает null, если это не пользователь или его не удалось найти
 */
export async function resolveTargetUserId(rawInput: string): Promise<number | null> {
  const { api } = useServices()
  let input = rawInput.trim()

  if (!input) {
    return null
  }

  try {
    const url = new URL(input.includes('://') ? input : `https://${input}`)

    if (/(^|\.)vk\.(com|ru)$/i.test(url.hostname)) {
      input = url.pathname.replace(/^\/+/, '').split('/')[0] ?? ''
    }
  } catch {
    // Не ссылка, разбираем как есть
  }

  input = input.replace(/^@/, '')

  if (/^\d+$/.test(input)) {
    return Number(input)
  }

  const idMatch = /^id(\d+)$/i.exec(input)
  if (idMatch) {
    return Number(idMatch[1])
  }

  if (!/^[a-z0-9_.]+$/i.test(input)) {
    return null
  }

  const result = await api.fetch('utils.resolveScreenName', { screen_name: input })

  if (Array.isArray(result) || result.type !== 'user') {
    return null
  }

  return result.object_id
}
