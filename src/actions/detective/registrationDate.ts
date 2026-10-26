/**
 * Оценка даты регистрации по номеру страницы.
 *
 * Точную дату ВК через API не отдаёт. Раньше её можно было прочитать из foaf.php,
 * но сейчас эта страница отвечает пустым телом всем, кто не залогинен в вебе,
 * а веб-сессии у приложения нет — оно работает на токенах.
 *
 * Зато идентификаторы выдаются строго по возрастанию, поэтому дату можно прикинуть
 * интерполяцией между опорными точками. Это именно оценка: погрешность у свежих
 * страниц measured в месяцах, поэтому в интерфейсе она так и подписана
 */

/** Опорные точки: [id, время регистрации] */
const ANCHORS: Array<[number, number]> = [
  [1, Date.UTC(2006, 8, 1)],
  [100_000, Date.UTC(2006, 10, 1)],
  [1_000_000, Date.UTC(2007, 2, 1)],
  [5_000_000, Date.UTC(2007, 8, 1)],
  [10_000_000, Date.UTC(2008, 0, 1)],
  [20_000_000, Date.UTC(2008, 5, 1)],
  [50_000_000, Date.UTC(2009, 5, 1)],
  [100_000_000, Date.UTC(2010, 9, 1)],
  [150_000_000, Date.UTC(2012, 0, 1)],
  [200_000_000, Date.UTC(2013, 3, 1)],
  [250_000_000, Date.UTC(2014, 4, 1)],
  [300_000_000, Date.UTC(2015, 6, 1)],
  [350_000_000, Date.UTC(2016, 5, 1)],
  [400_000_000, Date.UTC(2017, 2, 1)],
  [450_000_000, Date.UTC(2017, 10, 1)],
  [500_000_000, Date.UTC(2018, 7, 1)],
  [550_000_000, Date.UTC(2019, 5, 1)],
  [600_000_000, Date.UTC(2020, 3, 1)],
  [650_000_000, Date.UTC(2021, 2, 1)],
  [700_000_000, Date.UTC(2022, 1, 1)],
  [750_000_000, Date.UTC(2023, 0, 1)],
  [800_000_000, Date.UTC(2024, 0, 1)]
]

export type RegistrationEstimate = {
  at: number
  /** Насколько грубая оценка: внутри размеченного диапазона или уже за его пределами */
  precision: 'approximate' | 'rough'
}

export function estimateRegistrationDate(userId: number): RegistrationEstimate | null {
  if (!Number.isFinite(userId) || userId <= 0) {
    return null
  }

  const first = ANCHORS[0]
  const last = ANCHORS[ANCHORS.length - 1]

  if (!first || !last) {
    return null
  }

  if (userId <= first[0]) {
    return { at: first[1], precision: 'approximate' }
  }

  for (let index = 1; index < ANCHORS.length; index++) {
    const previous = ANCHORS[index - 1]
    const current = ANCHORS[index]

    if (!previous || !current || userId > current[0]) {
      continue
    }

    const [previousId, previousAt] = previous
    const [currentId, currentAt] = current
    const ratio = (userId - previousId) / (currentId - previousId)

    return {
      at: Math.round(previousAt + ratio * (currentAt - previousAt)),
      precision: 'approximate'
    }
  }

  /*
    Дальше последней опорной точки продолжаем последним известным темпом выдачи id.
    Свежие страницы попадают именно сюда, поэтому отмечаем оценку как грубую
  */
  const previous = ANCHORS[ANCHORS.length - 2]

  if (!previous) {
    return { at: last[1], precision: 'rough' }
  }

  const idsPerMs = (last[0] - previous[0]) / (last[1] - previous[1])

  return {
    at: Math.round(last[1] + (userId - last[0]) / idsPerMs),
    precision: 'rough'
  }
}
