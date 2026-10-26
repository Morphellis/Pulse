import { MessagesMessage } from 'services/contracts/api/objects/MessagesMessage'
import { MessagesReactionCounter } from 'services/contracts/api/objects/MessagesReactionCounter'

export type MessagesGetDiffContentItem = {
  peer_id: number
  messages?: MessagesMessage[]
  requested_messages?: MessagesMessage[]
  range_messages?: MessagesMessage[][]
  reactions?: Array<{
    cmid: number
    counters: MessagesReactionCounter[]
  }>
}
