import { defineStore } from 'pinia'
import * as Peer from 'model/Peer'

/**
 * Что пользователь видит прямо сейчас. Нужно, чтобы не уведомлять о сообщении
 * в переписке, которая и так открыта перед глазами
 */
export const useNotificationsStore = defineStore('notifications', {
  state: () => ({
    activePeerId: null as Peer.Id | null,
    isWindowFocused: true
  })
})
