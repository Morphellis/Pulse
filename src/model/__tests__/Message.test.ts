import { describe, expect, test } from 'vitest'
import * as Message from 'model/Message'

const reaction = (id: number, count: number): Message.Reaction => ({ id, count })

describe(Message.withOwnReaction.name, () => {
  test('ставит первую реакцию на сообщение', () => {
    expect(Message.withOwnReaction(undefined, undefined, 5)).toEqual([reaction(5, 1)])
  })

  test('присоединяется к уже поставленной другими реакции', () => {
    expect(Message.withOwnReaction([reaction(5, 2)], undefined, 5)).toEqual([reaction(5, 3)])
  })

  test('снимает свою реакцию и убирает счётчик, когда он опустел', () => {
    expect(Message.withOwnReaction([reaction(5, 1)], 5, undefined)).toBeUndefined()
  })

  test('замена реакции переносит голос, а не добавляет второй', () => {
    expect(Message.withOwnReaction([reaction(5, 1), reaction(7, 1)], 5, 7)).toEqual([
      reaction(7, 2)
    ])
  })

  test('сортирует по популярности', () => {
    expect(Message.withOwnReaction([reaction(5, 3), reaction(7, 3)], undefined, 7)).toEqual([
      reaction(7, 4),
      reaction(5, 3)
    ])
  })

  test('не трогает исходный список', () => {
    const before: Message.Reaction[] = [reaction(5, 1)]

    Message.withOwnReaction([reaction(5, 1)], undefined, 5)

    expect(before).toEqual([reaction(5, 1)])
  })
})
