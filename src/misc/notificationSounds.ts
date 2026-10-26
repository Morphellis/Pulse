import bellUrl from 'assets/sounds/bell.wav'
import bubbleUrl from 'assets/sounds/bubble.wav'
import chimeUrl from 'assets/sounds/chime.wav'
import dropUrl from 'assets/sounds/drop.wav'
import glassUrl from 'assets/sounds/glass.wav'
import marimbaUrl from 'assets/sounds/marimba.wav'
import popUrl from 'assets/sounds/pop.wav'
import triadUrl from 'assets/sounds/triad.wav'

/*
  Звуки синтезированы скриптом scripts/generateNotificationSound.mjs,
  выровнены по громкости и отличаются только характером. Порядок здесь —
  порядок в списке настроек: от самых спокойных к заметным
*/
export const NOTIFICATION_SOUNDS = [
  { id: 'chime', url: chimeUrl },
  { id: 'drop', url: dropUrl },
  { id: 'marimba', url: marimbaUrl },
  { id: 'pop', url: popUrl },
  { id: 'bubble', url: bubbleUrl },
  { id: 'triad', url: triadUrl },
  { id: 'bell', url: bellUrl },
  { id: 'glass', url: glassUrl }
] as const

export type NotificationSoundId = typeof NOTIFICATION_SOUNDS[number]['id']

export const DEFAULT_NOTIFICATION_SOUND: NotificationSoundId = 'chime'

export function notificationSoundUrl(id: NotificationSoundId): string {
  const sound = NOTIFICATION_SOUNDS.find((sound) => sound.id === id)

  // Звук могли переименовать между версиями, тогда откатываемся на стандартный
  return sound?.url ?? NOTIFICATION_SOUNDS[0].url
}
