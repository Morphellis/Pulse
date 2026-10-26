import { computed } from 'vue'
import { useServices } from 'services'
import * as Attach from 'model/Attach'
import * as Convo from 'model/Convo'
import * as ConvoDraft from 'model/ConvoDraft'
import { fromApiAttachDoc, fromApiAttachPhoto, fromApiAttachVoice } from 'converters/AttachConverter'

export type AttachPreview =
  | { kind: 'Attach', attach: Attach.SingleAttach }
  | { kind: 'UploadingAttach', attach: ConvoDraft.UploadingAttach }

export function useComposerAttaches(convo: Convo.Convo, draft: ConvoDraft.ConvoDraft) {
  const { uploader } = useServices()

  const attachPreviews = computed(() => {
    const attaches: AttachPreview[] = []
    const draftAttachesValues = Object.values(draft.attaches)

    for (const attach of draftAttachesValues) {
      const attachesArray = Array.isArray(attach) ? attach : [attach]
      const uploadingAttaches = draft.uploadingAttaches.filter((uploadingAttach) => (
        uploadingAttach.kind === attachesArray[0].kind
      ))

      attaches.push(
        ...attachesArray.map((attach) => ({ kind: 'Attach' as const, attach })),
        ...uploadingAttaches.map((attach) => ({ kind: 'UploadingAttach' as const, attach }))
      )
    }

    const restUploadingAttaches = draft.uploadingAttaches
      .filter((uploadingAttach) => !attaches.some(({ attach }) => attach === uploadingAttach))
      .map((attach) => ({ kind: 'UploadingAttach' as const, attach }))

    attaches.push(...restUploadingAttaches)

    return attaches
  })

  const removeAttachPreview = (attachPreview: AttachPreview) => {
    if (attachPreview.kind === 'UploadingAttach') {
      ConvoDraft.removeUploadingAttach(draft, attachPreview.attach)
    } else {
      Attach.remove(draft.attaches, attachPreview.attach)
    }
  }

  const uploadPhoto = (uploadingPhoto: ConvoDraft.UploadingPhoto) => {
    uploader
      .uploadPhoto(uploadingPhoto.file, convo.id, (progress: number) => {
        uploadingPhoto.progress = progress
      }, uploadingPhoto.abortController.signal)
      .then((apiPhoto) => {
        const photo = fromApiAttachPhoto(apiPhoto)
        if (photo) {
          Attach.add(draft.attaches, photo)
          ConvoDraft.removeUploadingAttach(draft, uploadingPhoto)
        } else {
          uploadingPhoto.failed = true
        }
      })
      .catch(() => {
        uploadingPhoto.failed = true
      })
  }

  const uploadDoc = (uploadingDoc: ConvoDraft.UploadingDoc) => {
    uploader
      .uploadDoc(uploadingDoc.file, convo.id, (progress: number) => {
        uploadingDoc.progress = progress
      }, uploadingDoc.abortController.signal)
      .then((apiDoc) => {
        Attach.add(draft.attaches, fromApiAttachDoc(apiDoc))
        ConvoDraft.removeUploadingAttach(draft, uploadingDoc)
      })
      .catch((err: unknown) => {
        // Молча проглоченная ошибка загрузки выглядит как вечный прогресс
        console.warn('[useComposerAttaches] doc upload failed', err)
        uploadingDoc.failed = true
      })
  }

  const uploadVoice = (uploadingVoice: ConvoDraft.UploadingVoice) => {
    uploader
      .uploadVoice(uploadingVoice.file, convo.id, (progress: number) => {
        uploadingVoice.progress = progress
      }, uploadingVoice.abortController.signal)
      .then((apiVoice) => {
        Attach.add(draft.attaches, fromApiAttachVoice(apiVoice, true))
        ConvoDraft.removeUploadingAttach(draft, uploadingVoice)
      })
      .catch((err: unknown) => {
        console.warn('[useComposerAttaches] voice upload failed', err)
        uploadingVoice.failed = true
      })
  }

  const uploadAttach = (kind: ConvoDraft.UploadingAttach['kind'], file: File) => {
    const uploadingAttach = ConvoDraft.addUploadingAttach(draft, {
      kind,
      id: ConvoDraft.getNewUploadingAttachId(),
      file,
      progress: 0,
      failed: false,
      abortController: new AbortController()
    })

    // Разбираем по kind самого вложения, а не по аргументу: только так сужается тип
    switch (uploadingAttach.kind) {
      case 'Photo':
        uploadPhoto(uploadingAttach)
        break
      case 'Doc':
        uploadDoc(uploadingAttach)
        break
      case 'Voice':
        uploadVoice(uploadingAttach)
        break
    }
  }

  const retryUploadingAttach = (uploadingAttach: ConvoDraft.UploadingAttach) => {
    if (!uploadingAttach.failed) {
      throw new Error('Tried to retry not failed attach')
    }

    uploadingAttach.progress = 0
    uploadingAttach.failed = false
    uploadingAttach.abortController = new AbortController()

    switch (uploadingAttach.kind) {
      case 'Photo':
        uploadPhoto(uploadingAttach)
        break
      case 'Doc':
        uploadDoc(uploadingAttach)
        break
      case 'Voice':
        uploadVoice(uploadingAttach)
        break
    }
  }

  const abortUploadingAttach = (uploadingAttach: ConvoDraft.UploadingAttach) => {
    uploadingAttach.abortController.abort()
  }

  return {
    attachPreviews,
    removeAttachPreview,
    uploadAttach,
    retryUploadingAttach,
    abortUploadingAttach
  }
}
