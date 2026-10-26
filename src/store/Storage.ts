import { electronBridge } from 'misc/electronBridge'
import { deserializeJson, serializeJson } from 'misc/jsonSerializer'

/**
 * Настройки, которые нужны main-процессу до загрузки окна.
 * Хранятся в storage-v1.json, читаются и пишутся через preload-мост
 */
export class MainStorage<T extends Record<string, unknown>> {
  data: T

  constructor(defaults: T) {
    let storageData: Partial<T> = {}
    try {
      storageData = deserializeJson<Partial<T>>(electronBridge.mainSettings.read())
    } catch {
      // Файл криво записался и перезапишется при следующем сохранении
      // или при запуске приложения в main процессе
    }

    this.data = {
      ...defaults,
      ...storageData
    }
  }

  update(data: T) {
    this.data = data
    this.save()
  }

  save() {
    electronBridge.mainSettings.write(serializeJson(this.data))
  }
}

type RendererStorageOptions = {
  /**
   * Шифровать содержимое через safeStorage (DPAPI на Windows, Keychain на macOS,
   * libsecret на Linux). Используется для хранилищ с токенами, чтобы их нельзя было
   * прочитать из файлов профиля приложения
   */
  encrypted?: boolean
}

export class RendererStorage<T extends Record<string, unknown>> {
  name: string
  /** Ключ для зашифрованной копии данных, живет отдельно от незашифрованного name */
  encryptedName: string
  data: T
  version = 1
  encrypted: boolean

  constructor(name: string, defaults: T | (() => T), options: RendererStorageOptions = {}) {
    this.name = `${name}-v${this.version}`
    this.encryptedName = `${this.name}-encrypted`
    this.encrypted = options.encrypted ?? false

    const defaultValue = typeof defaults === 'function' ? defaults() : defaults

    this.data = {
      ...defaultValue,
      ...this.load()
    }

    // Пересохраняем сразу: так незашифрованные данные старых версий
    // шифруются при первом запуске, а открытая копия удаляется
    this.save()
  }

  update(data: T) {
    this.data = data
    this.save()
  }

  set<K extends keyof T>(key: K, value: T[K]) {
    this.data[key] = value
    this.save()
  }

  save() {
    const json = serializeJson(this.data)

    if (this.encrypted && electronBridge.secureStorage.isAvailable()) {
      localStorage.setItem(this.encryptedName, electronBridge.secureStorage.encrypt(json))
      localStorage.removeItem(this.name)
    } else {
      localStorage.setItem(this.name, json)
    }
  }

  private load(): Partial<T> {
    const encryptedRaw = this.encrypted ? localStorage.getItem(this.encryptedName) : null
    const raw = localStorage.getItem(this.name)

    try {
      if (encryptedRaw !== null) {
        return deserializeJson<Partial<T>>(electronBridge.secureStorage.decrypt(encryptedRaw))
      }

      if (raw !== null) {
        return deserializeJson<Partial<T>>(raw)
      }

      return {}
    } catch (error) {
      // Не затираем данные, которые не смогли прочитать: оставляем копию
      // для ручного восстановления
      console.warn(`[RendererStorage] failed to read "${this.name}", keeping a backup`, error)
      localStorage.setItem(`${this.name}.backup-${Date.now()}`, encryptedRaw ?? raw ?? '')
      return {}
    }
  }
}
