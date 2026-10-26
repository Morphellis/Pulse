import { defineComponent } from 'vue'
import { useServices } from 'services'
import * as Peer from 'model/Peer'
import { useMessageJournalStore } from 'store/messageJournal'
import { usePeersStore } from 'store/peers'
import { useGlobalModal } from 'hooks'
import { Modal } from 'ui/modals/parts'
import { Button } from 'ui/ui/Button/Button'
import './JournalModal.css'

export const JournalModal = defineComponent(() => {
  const { lang } = useServices()
  const { journalModal } = useGlobalModal()
  const journal = useMessageJournalStore()
  const { peers } = usePeersStore()

  const formatTime = (at: number) => lang
    .dateTimeFormatter({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    .format(at)

  return () => (
    <Modal
      title={lang.use('journal_title')}
      opened={journalModal.opened}
      onClose={journalModal.close}
      onVisibilityChange={journalModal.onVisibilityChange}
      class="JournalModal"
      buttons={
        journal.entries.length > 0
          ? (
            <Button mode="destructive" onClick={() => journal.clear()}>
              {lang.use('journal_clear')}
            </Button>
          )
          : undefined
      }
    >
      {journal.entries.length === 0 && (
        <div class="JournalModal__empty">{lang.use('journal_empty')}</div>
      )}

      {journal.entries.map((entry) => (
        <div class="JournalEntry" key={`${entry.peerId}_${entry.cmid}_${entry.at}`}>
          <div class="JournalEntry__head">
            <span
              class={[
                'JournalEntry__kind',
                entry.kind === 'deleted' && 'JournalEntry__kind--deleted'
              ]}
            >
              {lang.use(entry.kind === 'deleted' ? 'journal_deleted' : 'journal_edited')}
            </span>
            <span class="JournalEntry__author">
              {Peer.name(Peer.safeGet(peers, entry.authorId))}
            </span>
            <span class="JournalEntry__time">{formatTime(entry.at)}</span>
          </div>

          <div class="JournalEntry__text">
            {entry.kind === 'edited' && (
              <span class="JournalEntry__label">{lang.use('journal_was')}: </span>
            )}
            {entry.text || '—'}
          </div>

          {entry.newText !== undefined && (
            <div class="JournalEntry__text">
              <span class="JournalEntry__label">{lang.use('journal_became')}: </span>
              {entry.newText || '—'}
            </div>
          )}
        </div>
      ))}
    </Modal>
  )
})
