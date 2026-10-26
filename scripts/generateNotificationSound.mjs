import fs from 'fs'
import path from 'path'

/*
  Синтезирует набор звуков уведомления, чтобы не тащить в проект чужие файлы
  с неясной лицензией. Все сигналы мягкие: атака сглажена, верхние частоты срезаны,
  громкость выровнена и по пику, и по среднему — чтобы выбор в настройках
  не прыгал от тихого к оглушительному.

  Запуск: node scripts/generateNotificationSound.mjs
*/

const SAMPLE_RATE = 44100
const PEAK_LIMIT = 0.35
const RMS_LIMIT = 0.075

/** Обертоны по умолчанию: тон получается колокольчиковым, но без звона будильника */
const SOFT_HARMONICS = [
  { multiple: 1, gain: 1 },
  { multiple: 2, gain: 0.18 },
  { multiple: 3, gain: 0.05 }
]

/** Неточные кратности дают металлический призвук настоящего колокольчика */
const BELL_HARMONICS = [
  { multiple: 1, gain: 1 },
  { multiple: 2.76, gain: 0.22 },
  { multiple: 5.4, gain: 0.08 }
]

const WOOD_HARMONICS = [
  { multiple: 1, gain: 1 },
  { multiple: 3.9, gain: 0.12 }
]

const GLASS_HARMONICS = [
  { multiple: 1, gain: 1 },
  { multiple: 2, gain: 0.3 },
  { multiple: 4, gain: 0.12 },
  { multiple: 6.1, gain: 0.05 }
]

const PRESETS = [
  {
    id: 'chime',
    duration: 0.9,
    cutoff: 5200,
    notes: [
      { frequency: 783.99, startsAt: 0, decay: 0.16, gain: 0.85 },
      { frequency: 1046.5, startsAt: 0.105, decay: 0.3, gain: 1 }
    ]
  },
  {
    id: 'drop',
    duration: 0.7,
    cutoff: 4200,
    notes: [
      // Скольжение вниз читается как «кап», без второй ноты
      { frequency: 1150, endFrequency: 620, startsAt: 0, decay: 0.16, gain: 1 }
    ]
  },
  {
    id: 'bell',
    duration: 1.4,
    cutoff: 6000,
    notes: [
      { frequency: 880, startsAt: 0, decay: 0.45, gain: 1, harmonics: BELL_HARMONICS }
    ]
  },
  {
    id: 'bubble',
    duration: 0.45,
    cutoff: 4000,
    notes: [
      { frequency: 520, endFrequency: 1180, startsAt: 0, decay: 0.07, gain: 1 }
    ]
  },
  {
    id: 'marimba',
    duration: 0.6,
    cutoff: 3800,
    notes: [
      { frequency: 659.25, startsAt: 0, decay: 0.12, gain: 1, harmonics: WOOD_HARMONICS }
    ]
  },
  {
    id: 'triad',
    duration: 1.1,
    cutoff: 5200,
    notes: [
      { frequency: 523.25, startsAt: 0, decay: 0.13, gain: 0.7 },
      { frequency: 659.25, startsAt: 0.085, decay: 0.15, gain: 0.85 },
      { frequency: 783.99, startsAt: 0.17, decay: 0.32, gain: 1 }
    ]
  },
  {
    id: 'pop',
    duration: 0.5,
    cutoff: 3200,
    notes: [
      // Низкий толчок плюс короткий щелчок сверху: спокойный, ненавязчивый сигнал
      { frequency: 320, endFrequency: 250, startsAt: 0, decay: 0.09, gain: 1 },
      { frequency: 1320, startsAt: 0.01, decay: 0.035, gain: 0.35 }
    ]
  },
  {
    id: 'glass',
    duration: 1.6,
    cutoff: 7000,
    notes: [
      { frequency: 1174.66, startsAt: 0, decay: 0.5, gain: 1, harmonics: GLASS_HARMONICS }
    ]
  }
]

function renderPreset(preset) {
  const length = Math.round(SAMPLE_RATE * preset.duration)
  const samples = new Float64Array(length)

  for (const note of preset.notes) {
    const harmonics = note.harmonics ?? SOFT_HARMONICS
    const startSample = Math.round(note.startsAt * SAMPLE_RATE)
    const noteLength = length - startSample

    /*
      Фазу накапливаем, а не считаем как sin(2πft): при скольжении частоты
      формула по времени дала бы разрывы и щелчки
    */
    const phases = harmonics.map(() => 0)

    for (let i = startSample; i < length; i++) {
      const time = (i - startSample) / SAMPLE_RATE
      const progress = (i - startSample) / noteLength
      const frequency = note.endFrequency
        ? note.frequency + (note.endFrequency - note.frequency) * Math.min(1, progress * 3)
        : note.frequency

      // Атака в 18 мс убирает щелчок, спад экспоненциальный — нота гаснет естественно
      const attack = Math.min(1, time / 0.018)
      const envelope = attack * attack * Math.exp(-time / note.decay)

      let value = 0
      for (let h = 0; h < harmonics.length; h++) {
        const { multiple, gain } = harmonics[h]
        phases[h] += (2 * Math.PI * frequency * multiple) / SAMPLE_RATE
        value += gain * Math.sin(phases[h])
      }

      samples[i] += value * envelope * note.gain
    }
  }

  smooth(samples, preset.cutoff)
  fadeOutTail(samples)
  normalize(samples)

  return samples
}

/** Однополюсный фильтр нижних частот: скругляет верх, звук перестает быть колким */
function smooth(samples, cutoff) {
  const alpha = 1 - Math.exp((-2 * Math.PI * cutoff) / SAMPLE_RATE)
  let previous = 0

  for (let i = 0; i < samples.length; i++) {
    previous += alpha * (samples[i] - previous)
    samples[i] = previous
  }
}

/** Хвост в тишину, иначе на обрыве появляется щелчок */
function fadeOutTail(samples) {
  const tail = Math.round(0.05 * SAMPLE_RATE)
  const start = samples.length - tail

  for (let i = start; i < samples.length; i++) {
    samples[i] *= (samples.length - i) / tail
  }
}

/**
 * Выравниваем и по пику, и по среднему уровню: короткий щелчок и долгий колокольчик
 * с одинаковым пиком слышатся по-разному громко
 */
function normalize(samples) {
  let peak = 0
  let sumOfSquares = 0

  for (const sample of samples) {
    peak = Math.max(peak, Math.abs(sample))
    sumOfSquares += sample * sample
  }

  if (peak === 0) {
    return
  }

  const rms = Math.sqrt(sumOfSquares / samples.length)
  const scale = Math.min(PEAK_LIMIT / peak, RMS_LIMIT / rms)

  for (let i = 0; i < samples.length; i++) {
    samples[i] *= scale
  }
}

function toWav(samples) {
  const dataSize = samples.length * 2
  const buffer = Buffer.alloc(44 + dataSize)

  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20) // PCM
  buffer.writeUInt16LE(1, 22) // моно
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2)
  }

  return buffer
}

const outputDir = path.join('src', 'assets', 'sounds')
fs.mkdirSync(outputDir, { recursive: true })

for (const preset of PRESETS) {
  const outputPath = path.join(outputDir, `${preset.id}.wav`)
  fs.writeFileSync(outputPath, toWav(renderPreset(preset)))
  console.log(`Готово: ${outputPath}`)
}
