import { MessagesLongpollCredentials } from 'services/contracts/api/objects/MessagesLongpollCredentials'
import * as IApi from 'services/contracts/IApi'
import * as IEngine from 'services/contracts/IEngine'
import { useConvosStore } from 'store/convos'
import { handleEngineResync, handleEngineUpdates } from 'actions'
import { sleep, toUrlParams } from 'misc/utils'

const ENGINE_MAX_CONNECTION_DURATION_SEC = 20
const ENGINE_FETCH_TIMEOUT = (ENGINE_MAX_CONNECTION_DURATION_SEC + 5) * 1000
const ENGINE_MODE =
  (1 << 1) | // возвращать кладжи
  (1 << 3) | // возвращать расширенную информацию в некоторых событиях
  (1 << 5) | // возвращать pts
  (1 << 7) | // возвращать random_id
  (1 << 9) | // возвращать события о бизнес-уведомлениях
  (1 << 10) // поддержка @online в marked_users

/*
  Пауза между попытками после сбоя. Растёт до потолка, чтобы при долгом обрыве
  не молотить запросами, но и не ждать слишком долго, когда связь вернётся
*/
const ENGINE_MIN_RETRY_DELAY = 2500
const ENGINE_MAX_RETRY_DELAY = 15000

export class Engine {
  active = false
  credentials: MessagesLongpollCredentials | null = null

  constructor(private api: IApi.Api) {}

  async start(
    credentials: MessagesLongpollCredentials,
    onFail: (reason: IEngine.FailReason) => void
  ) {
    const { connection } = useConvosStore()

    if (this.active) {
      throw new Error('[engine] The engine is already active')
    }

    this.active = true
    this.credentials = credentials

    let retryDelay = ENGINE_MIN_RETRY_DELAY

    /** Останавливает движок насовсем: продолжать бессмысленно, нужно вмешательство */
    const giveUp = (reason: IEngine.FailReason, error?: unknown) => {
      if (error) {
        console.error('[engine]', error)
      }

      this.active = false
      connection.status = 'syncing'
      onFail(reason)
    }

    while (this.active) {
      try {
        const { server, key, ts, pts } = this.credentials
        const timeoutSignal = AbortSignal.timeout(ENGINE_FETCH_TIMEOUT)

        const result = await fetch(`https://${server}?act=a_check`, {
          method: 'POST',
          body: toUrlParams({
            key,
            ts,
            version: IEngine.VERSION,
            mode: ENGINE_MODE,
            wait: ENGINE_MAX_CONNECTION_DURATION_SEC
          }),
          signal: timeoutSignal
        })
          .then<IEngine.Response>((response) => response.json())
          .catch(() => null)

        if (!result) {
          // Получили ошибку сети, просто делаем запрос еще раз
          connection.status = 'syncing'
          await sleep(retryDelay)
          retryDelay = Math.min(retryDelay * 2, ENGINE_MAX_RETRY_DELAY)
          continue
        }

        if ('failed' in result) {
          connection.status = 'syncing'

          switch (result.failed) {
            /*
              1 — отстал ts, 3 — сервер потерял историю событий целиком.
              В обоих случаях лечение одно: пересинхронизироваться и получить
              свежие ключи вместе с пропущенными изменениями
            */
            case 1:
            case 3:
              try {
                this.credentials = await handleEngineResync(IEngine.VERSION, pts)
                connection.status = 'connected'
                retryDelay = ENGINE_MIN_RETRY_DELAY
                continue
              } catch (error) {
                if (error instanceof IEngine.ResyncInvalidateCacheError) {
                  giveUp(IEngine.FailReason.INVALIDATE_CACHE, error)
                  return
                }

                /*
                  Ресинк мог не пройти из-за той же неустойчивой связи,
                  поэтому пробуем ещё раз, а не бросаем переписки без обновлений
                */
                console.error('[engine] resync failed', error)
                await sleep(retryDelay)
                retryDelay = Math.min(retryDelay * 2, ENGINE_MAX_RETRY_DELAY)
                continue
              }

            case 2: {
              try {
                const { key } = await this.api.fetch('messages.getLongPollServer', {
                  lp_version: IEngine.VERSION,
                  need_pts: 0
                }, { retries: Infinity })

                this.credentials.key = key
                connection.status = 'connected'
                retryDelay = ENGINE_MIN_RETRY_DELAY
                continue
              } catch (error) {
                console.error('[engine] couldn\'t obtain a new key', error)
                await sleep(retryDelay)
                retryDelay = Math.min(retryDelay * 2, ENGINE_MAX_RETRY_DELAY)
                continue
              }
            }

            // Версия протокола больше не поддерживается — сами мы это не починим
            case 4:
            default:
              giveUp(
                IEngine.FailReason.OTHER,
                new Error('[engine] Failed: ' + JSON.stringify(result))
              )
              return
          }
        }

        connection.status = 'connected'
        retryDelay = ENGINE_MIN_RETRY_DELAY

        /*
          Сдвигаем ts до разбора событий намеренно: если на каком-то событии
          обработчик спотыкается, повторная выдача той же пачки заклинила бы
          движок навсегда
        */
        this.credentials.ts = result.ts
        this.credentials.pts = result.pts

        await handleEngineUpdates(result.updates)
      } catch (error) {
        /*
          Любая неожиданная ошибка внутри итерации раньше убивала цикл молча:
          приложение оставалось с надписью «подключено» и переставало получать
          сообщения до перезапуска. Поэтому просто ждём и пробуем снова
        */
        console.error('[engine] iteration failed', error)
        connection.status = 'syncing'
        await sleep(retryDelay)
        retryDelay = Math.min(retryDelay * 2, ENGINE_MAX_RETRY_DELAY)
      }
    }
  }

  stop() {
    this.active = false
  }
}
