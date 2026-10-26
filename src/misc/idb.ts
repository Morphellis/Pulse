/**
 * Минимальная обертка над IndexedDB для данных модуля «Детектив»:
 * события онлайна и найденные комментарии могут занимать десятки мегабайт,
 * поэтому localStorage для них не подходит
 */

const DB_NAME = 'vk-desktop-detective'
const DB_VERSION = 1

export const ONLINE_EVENTS_STORE = 'onlineEvents'
export const COMMENTS_STORE = 'comments'

type StoreName = typeof ONLINE_EVENTS_STORE | typeof COMMENTS_STORE

let dbPromise: Promise<IDBDatabase> | undefined

function toPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(ONLINE_EVENTS_STORE)) {
        const events = db.createObjectStore(ONLINE_EVENTS_STORE, {
          keyPath: 'id',
          autoIncrement: true
        })
        events.createIndex('userId', 'userId')
        events.createIndex('userIdTs', ['userId', 'ts'])
      }

      if (!db.objectStoreNames.contains(COMMENTS_STORE)) {
        const comments = db.createObjectStore(COMMENTS_STORE, { keyPath: 'key' })
        comments.createIndex('targetId', 'targetId')
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
  })

  return dbPromise
}

async function transaction(store: StoreName, mode: IDBTransactionMode) {
  const db = await openDatabase()
  return db.transaction(store, mode).objectStore(store)
}

export async function idbPutMany(store: StoreName, values: unknown[]) {
  if (values.length === 0) {
    return
  }

  const objectStore = await transaction(store, 'readwrite')

  await Promise.all(values.map((value) => toPromise(objectStore.put(value))))
}

export async function idbGetAllByIndex<T>(
  store: StoreName,
  index: string,
  query: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  const objectStore = await transaction(store, 'readonly')
  return toPromise(objectStore.index(index).getAll(query) as IDBRequest<T[]>)
}

export async function idbCountByIndex(
  store: StoreName,
  index: string,
  query: IDBValidKey | IDBKeyRange
): Promise<number> {
  const objectStore = await transaction(store, 'readonly')
  return toPromise(objectStore.index(index).count(query))
}

export async function idbDeleteByIndex(
  store: StoreName,
  index: string,
  query: IDBValidKey | IDBKeyRange
) {
  const objectStore = await transaction(store, 'readwrite')
  const keys = await toPromise(objectStore.index(index).getAllKeys(query))

  await Promise.all(keys.map((key) => toPromise(objectStore.delete(key))))
}
