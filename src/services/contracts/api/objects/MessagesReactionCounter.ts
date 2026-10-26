/**
 * Сколько людей поставило конкретную реакцию.
 *
 * user_ids ВК присылает не целиком, а обрезанным списком, поэтому на количество
 * ориентируемся по count, а полный список берём отдельным запросом
 */
export type MessagesReactionCounter = {
  reaction_id: number
  count: number
  user_ids: number[]
}
