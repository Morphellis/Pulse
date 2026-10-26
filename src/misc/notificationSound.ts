import { NotificationSoundId, notificationSoundUrl } from 'misc/notificationSounds'

/*
  Один элемент на все уведомления намеренно: при пачке сообщений сигнал
  начинается заново, а не накладывается сам на себя
*/
let audio: HTMLAudioElement | null = null

export function playNotificationSound(id: NotificationSoundId, volume: number) {
  const url = notificationSoundUrl(id)

  audio ??= new Audio()
  if (audio.src !== url) {
    audio.src = url
  }

  audio.volume = Math.min(1, Math.max(0, volume))
  audio.currentTime = 0

  audio.play().catch((error: unknown) => {
    console.warn('[notificationSound] не удалось проиграть звук', error)
  })
}
