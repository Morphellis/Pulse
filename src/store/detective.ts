import { defineStore } from 'pinia'
import { RendererStorage } from 'store/Storage'

export type WatchedUser = {
  id: number
  addedAt: number
}

/** Текущее состояние наблюдаемого пользователя, не сохраняется между запусками */
export type OnlineStatus = {
  online: boolean
  /** 1 mobile, 2 iphone, 3 ipad, 4 android, 5 wphone, 6 windows, 7 web, 0 неизвестно */
  platform: number
  lastSeen?: number
  sampledAt: number
}

export type CommentsScanSourceKind = 'own' | 'friends' | 'groups'

export type CommentsScanConfig = {
  targetId: number
  sourceKinds: CommentsScanSourceKind[]
  /** 0 — без ограничения */
  friendPostsLimit: number
  /** 0 — без ограничения */
  groupPostsLimit: number
}

export type CommentsScanSource = {
  ownerId: number
  title: string
  kind: CommentsScanSourceKind
  /** Сколько постов уже просмотрено */
  offset: number
  /** Всего постов на стене, null до первого запроса */
  total: number | null
  done: boolean
  error?: string
}

export type CommentsScanStatus = 'idle' | 'collecting' | 'running' | 'paused' | 'done' | 'error'

export type CommentsScanState = {
  status: CommentsScanStatus
  config: CommentsScanConfig | null
  sources: CommentsScanSource[]
  currentSource: number
  scannedPosts: number
  scannedComments: number
  foundCount: number
  startedAt: number | null
  updatedAt: number | null
  error: string | null
}

type PersistedDetective = {
  watched: WatchedUser[]
  /** Интервал опроса онлайна, мс */
  pollInterval: number
  /** Запускать ли трекер автоматически при старте приложения */
  trackerEnabled: boolean
  commentsScan: CommentsScanState
}

type Detective = PersistedDetective & {
  onlineStatuses: Map<number, OnlineStatus>
  trackerActive: boolean
  trackerError: string | null
}

export function emptyCommentsScan(): CommentsScanState {
  return {
    status: 'idle',
    config: null,
    sources: [],
    currentSource: 0,
    scannedPosts: 0,
    scannedComments: 0,
    foundCount: 0,
    startedAt: null,
    updatedAt: null,
    error: null
  }
}

const detectiveStorage = new RendererStorage<PersistedDetective>('detective', {
  watched: [],
  pollInterval: 30000,
  trackerEnabled: true,
  commentsScan: emptyCommentsScan()
})

export const useDetectiveStore = defineStore('detective', {
  state: (): Detective => ({
    ...detectiveStorage.data,
    onlineStatuses: new Map(),
    trackerActive: false,
    trackerError: null
  }),
  actions: {
    addWatched(id: number) {
      if (!this.watched.some((user) => user.id === id)) {
        this.watched.push({ id, addedAt: Date.now() })
      }
    },
    removeWatched(id: number) {
      this.watched = this.watched.filter((user) => user.id !== id)
      this.onlineStatuses.delete(id)
    }
  }
})

export function init() {
  useDetectiveStore().$subscribe((mutation, state) => {
    detectiveStorage.update({
      watched: state.watched,
      pollInterval: state.pollInterval,
      trackerEnabled: state.trackerEnabled,
      commentsScan: state.commentsScan
    })
  })
}

declare module '@vue/reactivity' {
  interface RefUnwrapBailTypes {
    Detective: Detective
  }
}
