import { init as initConvoDrafts } from 'store/convoDrafts'
import { init as initDetective } from 'store/detective'
import { init as initMainSettings } from 'store/mainSettings'
import { init as initMessageJournal } from 'store/messageJournal'
import { init as initReadReceipts } from 'store/readReceipts'
import { init as initSettings } from 'store/settings'
import { init as initUsage } from 'store/usage'
import { init as initViewer } from 'store/viewer'

/** Синхронизирует обновления сторов с localStorage */
export function initStores() {
  initConvoDrafts()
  initDetective()
  initMainSettings()
  initMessageJournal()
  initReadReceipts()
  initSettings()
  initUsage()
  initViewer()
}
