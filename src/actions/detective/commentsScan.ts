import { useServices } from 'services'
import { WallComment } from 'services/contracts/api/objects/WallWallpost'
import * as IApi from 'services/contracts/IApi'
import {
  CommentsScanConfig,
  CommentsScanSource,
  emptyCommentsScan,
  useDetectiveStore
} from 'store/detective'
import { describeError, fullName, isRecord, isUserObject } from 'actions/detective/common'
import { loadUserGroups } from 'actions/detective/loadOwners'
import { COMMENTS_STORE, idbDeleteByIndex, idbGetAllByIndex, idbPutMany } from 'misc/idb'

/**
 * Поиск всех комментариев человека.
 *
 * Глобального поиска по комментариям в API нет, поэтому перебираем стены его окружения:
 * свою, друзей и сообществ, в которых он состоит. Для каждого поста с комментариями
 * запрашиваем комментарии и ветки ответов и оставляем те, что написал искомый человек.
 * Прогресс хранится в сторе и переживает перезапуск: скан можно поставить на паузу
 * и продолжить с того же места
 */

export type FoundComment = {
  key: string
  targetId: number
  ownerId: number
  postId: number
  commentId: number
  threadRootId: number | null
  date: number
  text: string
  replyToUser: number | null
}

type CommentsCall = {
  ownerId: number
  postId: number
  commentId?: number
  offset: number
}

const POSTS_PER_PAGE = 100
const COMMENTS_PER_PAGE = 100
const THREAD_PREVIEW = 10
const CALLS_PER_EXECUTE = 25

let runPromise: Promise<void> | null = null
let stopRequested = false

function isStopRequested() {
  return stopRequested
}

export function startCommentsScan(config: CommentsScanConfig) {
  const store = useDetectiveStore()

  store.commentsScan = {
    ...emptyCommentsScan(),
    status: 'collecting',
    config,
    startedAt: Date.now()
  }

  run()
}

export function pauseCommentsScan() {
  stopRequested = true
}

export function resumeCommentsScan() {
  const { commentsScan } = useDetectiveStore()

  if (commentsScan.status === 'paused' || commentsScan.status === 'error') {
    commentsScan.error = null
    run()
  }
}

export async function cancelCommentsScan() {
  const store = useDetectiveStore()

  stopRequested = true
  await runPromise
  store.commentsScan = emptyCommentsScan()
}

/** Возобновляет скан после перезапуска приложения, если он был прерван на середине */
export function resumeCommentsScanAfterRestart() {
  const { commentsScan } = useDetectiveStore()

  if (commentsScan.status === 'running' || commentsScan.status === 'collecting') {
    run()
  }
}

export async function loadFoundComments(targetId: number): Promise<FoundComment[]> {
  const comments = await idbGetAllByIndex<FoundComment>(COMMENTS_STORE, 'targetId', targetId)
  return comments.sort((a, b) => b.date - a.date)
}

export function clearFoundComments(targetId: number) {
  return idbDeleteByIndex(COMMENTS_STORE, 'targetId', targetId)
}

export function commentLink(comment: FoundComment) {
  const thread = comment.threadRootId ? `&thread=${comment.threadRootId}` : ''
  return `https://vk.com/wall${comment.ownerId}_${comment.postId}?reply=${comment.commentId}${thread}`
}

function run() {
  if (runPromise) {
    return
  }

  stopRequested = false
  runPromise = loop().finally(() => {
    runPromise = null
  })
}

async function loop() {
  const store = useDetectiveStore()
  const scan = store.commentsScan

  try {
    if (scan.status === 'collecting' || scan.sources.length === 0) {
      scan.status = 'collecting'
      scan.sources = await collectSources()
      scan.currentSource = 0
    }

    scan.status = 'running'

    while (!isStopRequested()) {
      const source = scan.sources[scan.currentSource]

      if (!source) {
        scan.status = 'done'
        scan.updatedAt = Date.now()
        return
      }

      if (source.done) {
        scan.currentSource++
        continue
      }

      await scanSourcePage(source)
      scan.updatedAt = Date.now()
    }

    scan.status = 'paused'
  } catch (error) {
    console.warn('[commentsScan] failed', error)
    scan.status = 'error'
    scan.error = describeError(error)
  }
}

async function collectSources(): Promise<CommentsScanSource[]> {
  const { api } = useServices()
  const { config } = useDetectiveStore().commentsScan

  if (!config) {
    throw new Error('Скан не настроен')
  }

  const { targetId, sourceKinds } = config
  const sources: CommentsScanSource[] = []
  const makeSource = (
    ownerId: number,
    title: string,
    kind: CommentsScanSource['kind']
  ): CommentsScanSource => ({ ownerId, title, kind, offset: 0, total: null, done: false })

  if (sourceKinds.includes('own')) {
    sources.push(makeSource(targetId, 'Своя стена', 'own'))
  }

  if (sourceKinds.includes('friends')) {
    try {
      const { items } = await api.fetch('friends.get', {
        user_id: targetId,
        count: 5000,
        fields: 'first_name,last_name'
      }, { retries: 1 })

      for (const friend of items.filter(isUserObject)) {
        sources.push(makeSource(friend.id, fullName(friend), 'friends'))
      }
    } catch (error) {
      console.warn('[commentsScan] friends are unavailable', error)
    }
  }

  if (sourceKinds.includes('groups')) {
    try {
      // Чужие сообщества приходят только идентификаторами, см. loadOwners
      const groups = await loadUserGroups(targetId)

      for (const group of groups?.items ?? []) {
        sources.push(makeSource(-group.id, group.name, 'groups'))
      }
    } catch (error) {
      console.warn('[commentsScan] groups are unavailable', error)
    }
  }

  return sources
}

async function scanSourcePage(source: CommentsScanSource) {
  const { api } = useServices()
  const scan = useDetectiveStore().commentsScan
  const { config } = scan

  if (!config) {
    throw new Error('Скан не настроен')
  }

  const limit = source.kind === 'groups'
    ? config.groupPostsLimit
    : source.kind === 'friends'
      ? config.friendPostsLimit
      : 0
  const count = limit > 0 ? Math.min(POSTS_PER_PAGE, limit - source.offset) : POSTS_PER_PAGE

  if (count <= 0) {
    source.done = true
    return
  }

  let page
  try {
    page = await api.fetch('wall.get', {
      owner_id: source.ownerId,
      offset: source.offset,
      count
    }, { retries: 1 })
  } catch (error) {
    // Закрытый профиль, забаненная страница и прочие ошибки конкретной стены
    if (error instanceof IApi.MethodError) {
      source.done = true
      source.error = error.message
      return
    }
    throw error
  }

  source.total = page.count
  scan.scannedPosts += page.items.length

  const calls: CommentsCall[] = page.items
    .filter((post) => (post.comments?.count ?? 0) > 0)
    .map((post) => ({ ownerId: source.ownerId, postId: post.id, offset: 0 }))

  await processCommentCalls(calls, config.targetId)

  if (stopRequested) {
    // Страница не досканирована, при возобновлении пройдём её заново
    return
  }

  source.offset += page.items.length

  if (
    page.items.length < count ||
    source.offset >= page.count ||
    (limit > 0 && source.offset >= limit)
  ) {
    source.done = true
  }
}

async function processCommentCalls(queue: CommentsCall[], targetId: number) {
  const { api } = useServices()
  const scan = useDetectiveStore().commentsScan

  while (queue.length > 0 && !isStopRequested()) {
    const batch = queue.splice(0, CALLS_PER_EXECUTE)
    const results: unknown[] = await api.fetchMany(
      batch.map((call) => api.buildMethod('wall.getComments', {
        owner_id: call.ownerId,
        post_id: call.postId,
        comment_id: call.commentId,
        offset: call.offset,
        count: COMMENTS_PER_PAGE,
        thread_items_count: call.commentId ? 0 : THREAD_PREVIEW,
        need_likes: 0
      })),
      { tolerateExecuteErrors: true, retries: 1 }
    )

    const found: FoundComment[] = []

    const inspect = (comment: WallComment, call: CommentsCall, threadRootId: number | null) => {
      if (comment.from_id === targetId && !comment.deleted) {
        found.push({
          key: `${targetId}_${call.ownerId}_${call.postId}_${comment.id}`,
          targetId,
          ownerId: call.ownerId,
          postId: call.postId,
          commentId: comment.id,
          threadRootId,
          date: comment.date * 1000,
          text: comment.text ?? '',
          replyToUser: comment.reply_to_user ?? null
        })
      }
    }

    batch.forEach((call, index) => {
      const result = results[index]

      if (!isRecord(result) || !Array.isArray(result.items)) {
        return
      }

      const items = result.items as WallComment[]
      scan.scannedComments += items.length

      for (const comment of items) {
        inspect(comment, call, call.commentId ?? null)

        const threadItems = comment.thread?.items ?? []
        for (const reply of threadItems) {
          inspect(reply, call, comment.id)
        }

        if (comment.thread && comment.thread.count > threadItems.length) {
          queue.push({
            ownerId: call.ownerId,
            postId: call.postId,
            commentId: comment.id,
            offset: threadItems.length
          })
        }
      }

      const total = typeof result.count === 'number' ? result.count : 0
      if (items.length > 0 && call.offset + items.length < total) {
        queue.push({ ...call, offset: call.offset + items.length })
      }
    })

    if (found.length > 0) {
      await idbPutMany(COMMENTS_STORE, found)
      scan.foundCount += found.length
    }
  }
}
