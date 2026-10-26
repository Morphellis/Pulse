import * as IApi from 'services/contracts/IApi'
import * as Peer from 'model/Peer'

type UploadPhotoToServerResponse = {
  server: number
  photo: string
  hash: string
}

/**
 * Собирает часть заголовка с именем файла.
 *
 * Сервер загрузки отвечает no_file, если положить имя с кириллицей прямо в filename,
 * поэтому туда идёт ascii-заглушка, а настоящее имя - в filename* по RFC 5987.
 * Отображаемое имя всё равно приходит из title в docs.save
 */
function encodeFileName(name: string): string {
  const asciiFallback = name.replace(/[^ -~]/g, '_').replace(/["\\]/g, '_')

  return `filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

export class Uploader {
  constructor(private api: IApi.Api) {}

  async uploadPhoto(
    file: File,
    peerId: Peer.Id,
    onProgress: (progress: number) => void,
    signal?: AbortSignal
  ) {
    const uploadServer = await this.api.fetch('photos.getMessagesUploadServer', {
      peer_id: peerId
    }, { signal })

    const uploadResponse = await this.uploadWithProgress<UploadPhotoToServerResponse>(
      uploadServer.upload_url,
      file,
      onProgress,
      signal
    )

    const [photo] = await this.api.fetch('photos.saveMessagesPhoto', uploadResponse, { signal })
    if (!photo) {
      throw new Error('photo save failed')
    }
    return photo
  }

  /**
   * Загружает произвольный файл как документ.
   *
   * Отличается от фото двумя шагами вместо трёх: сервер загрузки возвращает
   * одну строку file, которую docs.save превращает в готовый документ
   */
  async uploadDoc(
    file: File,
    peerId: Peer.Id,
    onProgress: (progress: number) => void,
    signal?: AbortSignal
  ) {
    const { upload_url: uploadUrl } = await this.api.fetch('docs.getMessagesUploadServer', {
      type: 'doc',
      peer_id: peerId
    }, { signal })

    const uploaded = await this.uploadWithProgress<{ file?: string }>(
      uploadUrl,
      file,
      onProgress,
      signal
    )

    if (!uploaded.file) {
      throw new Error('doc upload failed')
    }

    const saved = await this.api.fetch('docs.save', {
      file: uploaded.file,
      title: file.name
    }, { signal })

    if (!saved.doc) {
      throw new Error('doc save failed')
    }

    return saved.doc
  }

  /**
   * Загружает голосовое сообщение — тот же путь, что и uploadDoc, только с
   * type: audio_message. Именно от этого типа сервер загрузки считает форму
   * волны и распознаёт речь, обычный doc остался бы просто прикреплённым файлом
   */
  async uploadVoice(
    file: File,
    peerId: Peer.Id,
    onProgress: (progress: number) => void,
    signal?: AbortSignal
  ) {
    const { upload_url: uploadUrl } = await this.api.fetch('docs.getMessagesUploadServer', {
      type: 'audio_message',
      peer_id: peerId
    }, { signal })

    const uploaded = await this.uploadWithProgress<{ file?: string }>(
      uploadUrl,
      file,
      onProgress,
      signal
    )

    if (!uploaded.file) {
      throw new Error('voice upload failed')
    }

    const saved = await this.api.fetch('docs.save', {
      file: uploaded.file
    }, { signal })

    if (!saved.audio_message) {
      throw new Error('voice save failed')
    }

    return saved.audio_message
  }

  private uploadWithProgress<T>(
    url: string,
    file: File,
    onProgress: (progress: number) => void,
    signal?: AbortSignal
  ) {
    const BOUNDARY = 'chikibamboni'
    const encoder = new TextEncoder()

    const headerChunk = encoder.encode(
      `--${BOUNDARY}\r\n` +
      `Content-Disposition: form-data; name="file"; ${encodeFileName(file.name)}\r\n` +
      `Content-Type: ${file.type}\r\n\r\n`
    )
    const footerChunk = encoder.encode(`\r\n--${BOUNDARY}--\r\n`)

    const bodySize = headerChunk.byteLength + file.size + footerChunk.byteLength
    let bytesConsumed = 0

    const multipartTransform = new TransformStream<Uint8Array, Uint8Array>({
      start(controller) {
        controller.enqueue(headerChunk)
        bytesConsumed += headerChunk.byteLength
        onProgress(bytesConsumed / bodySize)
      },
      transform(chunk, controller) {
        controller.enqueue(chunk)
        bytesConsumed += chunk.byteLength
        onProgress(bytesConsumed / bodySize)
      },
      flush(controller) {
        controller.enqueue(footerChunk)
        bytesConsumed += footerChunk.byteLength
        onProgress(bytesConsumed / bodySize)
      }
    })

    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${BOUNDARY}` },
      body: file.stream().pipeThrough(multipartTransform, { signal }),
      // @ts-expect-error поле duplex пока не завезли в тс
      duplex: 'half',
      signal
    }).then<T>((res) => res.json())
  }
}
