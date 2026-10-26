import {
  MessagesMessageAttachmentAudioMessage,
  MessagesMessageAttachmentDoc
} from 'services/contracts/api/objects/MessagesMessageAttachment'

// docs.getMessagesUploadServer
export type DocsGetMessagesUploadServerParams = {
  /** doc - обычный файл, audio_message - голосовое */
  type: 'doc' | 'audio_message'
  peer_id: number
}

export type DocsGetMessagesUploadServerResponse = {
  upload_url: string
}

// docs.save
export type DocsSaveParams = {
  /** Строка из ответа сервера загрузки */
  file: string
  title?: string
}

export type DocsSaveResponse = {
  type: string
  doc?: MessagesMessageAttachmentDoc
  /** Присутствует вместо doc, если файл был загружен как audio_message */
  audio_message?: MessagesMessageAttachmentAudioMessage
}
