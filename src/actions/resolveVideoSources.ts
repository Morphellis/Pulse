import { useServices } from 'services'
import * as Attach from 'model/Attach'
import { fromApiVideoFiles } from 'converters/AttachConverter'

/**
 * Резолвит прямые ссылки на файлы видео.
 *
 * В сообщениях они приходят вместе с вложением, а в ленте и на стене — нет:
 * там их приходится запрашивать отдельно. Причём именно через execute
 * и мессенджерным токеном: video.get обычным токеном отвечает без files,
 * а напрямую мессенджерному токену этот метод недоступен вовсе
 */

/**
 * Храним не готовые ссылки, а сам запрос: по одному видео можно кликнуть дважды
 * подряд — из переписки и из модалки, — и обе попытки должны ждать один ответ.
 *
 * Запись живёт ограниченное время: ссылки ВК подписаны и протухают, а другой
 * объект Video того же самого ролика (репост, пересылка, повторная загрузка
 * истории) не видит per-объектный кеш в video.sources и без TTL мог бы
 * десятилетиями получать один и тот же, уже протухший, результат.
 *
 * Точный срок жизни ссылок ВК нигде не документирован (комментарий в VideoModal
 * называет «несколько дней»), поэтому окно взято заведомо с запасом маленьким:
 * задача этого кеша — только схлопнуть повторные клики за секунды, а не быть
 * источником истины по свежести ссылки. Если окно всё же слишком большое,
 * подстраховывает ignoreCache при повторной попытке после ошибки плеера
 */
const CACHE_TTL_MS = 5 * 60 * 1000

type CacheEntry = {
  request: Promise<Attach.VideoSource[]>
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

export async function resolveVideoSources(
  video: Attach.Video,
  { ignoreCache = false } = {}
): Promise<Attach.VideoSource[]> {
  if (video.sources?.length && !ignoreCache) {
    return video.sources
  }

  const key = Attach.id(video)
  const cached = cache.get(key)

  if (cached && !ignoreCache && Date.now() < cached.expiresAt) {
    return cached.request
  }

  const request = load(video).then((sources) => {
    // Кладём и в саму модель, чтобы повторное открытие этого же объекта Video
    // обошлось без запроса вовсе
    video.sources = sources
    return sources
  })

  const entry: CacheEntry = { request, expiresAt: Date.now() + CACHE_TTL_MS }
  cache.set(key, entry)

  /*
    Иначе запись остаётся в мапе навсегда: TTL решал только вопрос свежести,
    но не выкидывал протухшее, и за долгую сессию просмотров кеш рос без предела.
    Сверяем сам объект: за это время по тому же ключу могла появиться новая запись
  */
  window.setTimeout(() => {
    if (cache.get(key) === entry) {
      cache.delete(key)
    }
  }, CACHE_TTL_MS)

  try {
    return await request
  } catch (error) {
    // Неудачную попытку не запоминаем: следующий клик должен попробовать заново
    cache.delete(key)
    throw error
  }
}

async function load(video: Attach.Video): Promise<Attach.VideoSource[]> {
  const { api } = useServices()
  const [response] = await api.fetchMany([
    api.buildMethod('video.get', {
      videos: `${video.ownerId}_${video.id}${video.accessKey ? `_${video.accessKey}` : ''}`
    })
  ], { messengerToken: true })

  return fromApiVideoFiles(response?.items[0]?.files) ?? []
}
