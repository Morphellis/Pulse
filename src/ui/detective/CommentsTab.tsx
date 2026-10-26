import { computed, defineComponent, onMounted, shallowRef, watch } from 'vue'
import { CommentsScanSourceKind, useDetectiveStore } from 'store/detective'
import {
  cancelCommentsScan,
  clearFoundComments,
  commentLink,
  FoundComment,
  loadFoundComments,
  pauseCommentsScan,
  resumeCommentsScan,
  startCommentsScan
} from 'actions/detective/commentsScan'
import { describeError, stripMentions } from 'actions/detective/common'
import { resolveTargetUserId } from 'actions/detective/resolveTarget'
import { formatDate, Progress, Section } from 'ui/detective/parts'
import { Button } from 'ui/ui/Button/Button'
import { Checkbox } from 'ui/ui/Checkbox/Checkbox'
import { Input } from 'ui/ui/Input/Input'
import { Link } from 'ui/ui/Link/Link'

const STATUS_LABELS = {
  idle: 'не запущен',
  collecting: 'собираем список стен',
  running: 'идёт скан',
  paused: 'на паузе',
  done: 'завершён',
  error: 'ошибка'
}

export const CommentsTab = defineComponent(() => {
  const store = useDetectiveStore()
  const scan = computed(() => store.commentsScan)

  const input = shallowRef('')
  const scanOwn = shallowRef(true)
  const scanFriends = shallowRef(true)
  const scanGroups = shallowRef(false)
  const friendLimit = shallowRef('300')
  const groupLimit = shallowRef('500')
  const error = shallowRef('')
  const starting = shallowRef(false)
  const results = shallowRef<FoundComment[]>([])

  const sourceTitles = computed(() => (
    new Map(scan.value.sources.map((source) => [source.ownerId, source.title]))
  ))

  async function reload() {
    const { config } = scan.value
    results.value = config ? await loadFoundComments(config.targetId) : []
  }

  async function start() {
    starting.value = true
    error.value = ''

    try {
      const targetId = await resolveTargetUserId(input.value)
      if (!targetId) {
        throw new Error('Не удалось распознать пользователя')
      }

      const sourceKinds: CommentsScanSourceKind[] = []
      if (scanOwn.value) {
        sourceKinds.push('own')
      }
      if (scanFriends.value) {
        sourceKinds.push('friends')
      }
      if (scanGroups.value) {
        sourceKinds.push('groups')
      }
      if (sourceKinds.length === 0) {
        throw new Error('Выберите хотя бы один источник')
      }

      await clearFoundComments(targetId)
      results.value = []

      startCommentsScan({
        targetId,
        sourceKinds,
        friendPostsLimit: Math.max(0, Number(friendLimit.value) || 0),
        groupPostsLimit: Math.max(0, Number(groupLimit.value) || 0)
      })
    } catch (err) {
      error.value = describeError(err)
    } finally {
      starting.value = false
    }
  }

  function exportJson() {
    const { config } = scan.value
    const payload = results.value.map((comment) => ({ ...comment, link: commentLink(comment) }))
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = `comments-${config?.targetId ?? 'unknown'}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  onMounted(reload)
  watch(() => [scan.value.foundCount, scan.value.status], reload)

  return () => {
    const state = scan.value
    const doneSources = state.sources.filter((source) => source.done).length
    const current = state.sources[state.currentSource]
    const isActive = state.status === 'running' || state.status === 'collecting'

    return (
      <div>
        <div class="DtForm">
          <Input
            placeholder="Чьи комментарии искать: ссылка, id или короткое имя"
            value={input.value}
            onInput={(event: Event) => {
              input.value = (event.target as HTMLInputElement).value
            }}
          />
          <Button onClick={start} loading={starting.value} disabled={isActive}>
            Начать поиск
          </Button>
        </div>

        <div class="DtInline DtSection">
          <Checkbox label="Своя стена" checked={scanOwn.value} onChange={(v) => (scanOwn.value = v)} />
          <Checkbox
            label="Стены друзей"
            checked={scanFriends.value}
            onChange={(v) => (scanFriends.value = v)}
          />
          <span class="DtMuted">постов на друга:</span>
          <Input
            class="DtNumberInput"
            type="number"
            value={friendLimit.value}
            onInput={(event: Event) => {
              friendLimit.value = (event.target as HTMLInputElement).value
            }}
          />
          <Checkbox
            label="Стены сообществ"
            checked={scanGroups.value}
            onChange={(v) => (scanGroups.value = v)}
          />
          <span class="DtMuted">постов на сообщество:</span>
          <Input
            class="DtNumberInput"
            type="number"
            value={groupLimit.value}
            onInput={(event: Event) => {
              groupLimit.value = (event.target as HTMLInputElement).value
            }}
          />
          <span class="DtMuted">0 — без ограничения</span>
        </div>

        {error.value && <div class="DtError DtSection">{error.value}</div>}

        {state.config && (
          <Section title="Прогресс" hint={STATUS_LABELS[state.status]}>
            <Progress value={doneSources} max={state.sources.length} />
            <div class="DtMuted">
              Стен: {doneSources} из {state.sources.length}
              {current && !current.done && ` · сейчас: ${current.title}`}
              {current?.total !== null && current?.total !== undefined && !current.done && (
                ` (${current.offset} из ${current.total} постов)`
              )}
            </div>
            <div class="DtMuted">
              Просмотрено постов: {state.scannedPosts}, комментариев: {state.scannedComments},
              найдено: {state.foundCount}
              {state.startedAt && `, запущен ${formatDate(state.startedAt, true)}`}
            </div>
            {state.error && <div class="DtError">{state.error}</div>}
            <div class="DtInline" style={{ marginTop: '8px' }}>
              {isActive && (
                <Button size="small" mode="secondary" onClick={pauseCommentsScan}>Пауза</Button>
              )}
              {(state.status === 'paused' || state.status === 'error') && (
                <Button size="small" onClick={resumeCommentsScan}>Продолжить</Button>
              )}
              {state.status !== 'idle' && (
                <Button size="small" mode="destructive" onClick={() => cancelCommentsScan()}>
                  Сбросить
                </Button>
              )}
              {results.value.length > 0 && (
                <Button size="small" mode="tertiary" onClick={exportJson}>Экспорт в JSON</Button>
              )}
            </div>
          </Section>
        )}

        {state.config && (
          <Section title="Найденные комментарии" hint={String(results.value.length)}>
            {results.value.length === 0 && (
              <span class="DtMuted">
                {isActive ? 'пока ничего не найдено, скан продолжается' : 'ничего не найдено'}
              </span>
            )}
            {results.value.map((comment) => (
              <div class="DtComment" key={comment.key}>
                <div class="DtComment__meta">
                  <span>{formatDate(comment.date, true)}</span>
                  <span>
                    {sourceTitles.value.get(comment.ownerId) ?? `стена ${comment.ownerId}`}
                  </span>
                  {comment.threadRootId && <span>ответ в ветке</span>}
                  <Link href={commentLink(comment)}>открыть</Link>
                </div>
                <div class="DtComment__text">{comment.text ? stripMentions(comment.text) : '(без текста, вложение)'}</div>
              </div>
            ))}
          </Section>
        )}
      </div>
    )
  }
})
