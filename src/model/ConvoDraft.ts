import * as Attach from 'model/Attach'
import * as Message from 'model/Message'
import * as Peer from 'model/Peer'
import { getMapValueWithDefaults } from 'misc/utils'

export type ConvoDraft = {
  text: string
  attaches: Attach.Attaches
  uploadingAttaches: UploadingAttach[]
  /** Сообщение, на которое отвечаем. Живёт в драфте, чтобы пережить уход из беседы */
  replyTo: Message.Foreign | undefined
  /** Правим своё сообщение: отправка заменит его текст вместо создания нового */
  editing: { cmid: Message.Cmid, originalText: string } | undefined
}

export type UploadingAttach = UploadingPhoto | UploadingDoc | UploadingVoice
export type UploadingPhoto = GenericUploadingAttach<'Photo'>
export type UploadingDoc = GenericUploadingAttach<'Doc'>
export type UploadingVoice = GenericUploadingAttach<'Voice'>

type GenericUploadingAttach<Kind extends Attach.SingleAttach['kind']> = {
  kind: Kind
  id: number
  file: File
  progress: number
  failed: boolean
  abortController: AbortController
}

const emptyDraft = (): ConvoDraft => ({
  text: '',
  attaches: {},
  uploadingAttaches: [],
  replyTo: undefined,
  editing: undefined
})

/**
 * Возвращает драфт сообщения в беседе.
 * Гарантируется, что всегда будет возвращаться один и тот же объект, и все изменения
 * будут происходить через его мутацию. Это позволяет избегать создание рефов в компонентах
 */
export function safeGet(drafts: Map<Peer.Id, ConvoDraft>, peerId: Peer.Id): ConvoDraft {
  return getMapValueWithDefaults(drafts, peerId, emptyDraft())
}

export function isEmpty(draft: ConvoDraft) {
  return draft.text.trim() === '' && Attach.kindsCount(draft.attaches) === 0
}

/** Пустой ответ отправлять можно: сам факт ответа уже содержателен */
export function isSendable(draft: ConvoDraft) {
  return !isEmpty(draft) || !!draft.replyTo
}

export function reset(draft: ConvoDraft) {
  for (const attach of draft.uploadingAttaches) {
    attach.abortController.abort()
  }
  Object.assign(draft, emptyDraft())
}

let uploadingAttachId = 0

export function getNewUploadingAttachId() {
  return uploadingAttachId++
}

/**
 * Добавляет загружаемый аттач в драфт и возвращает его реактивную копию
 */
export function addUploadingAttach(draft: ConvoDraft, uploadingAttach: UploadingAttach) {
  const index = draft.uploadingAttaches.push(uploadingAttach) - 1
  return draft.uploadingAttaches[index]!
}

export function removeUploadingAttach(draft: ConvoDraft, uploadingAttach: UploadingAttach) {
  const index = draft.uploadingAttaches.indexOf(uploadingAttach)
  if (index !== -1) {
    draft.uploadingAttaches.splice(index, 1)
    uploadingAttach.abortController.abort()
  }
}
