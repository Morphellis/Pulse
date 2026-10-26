// utils.resolveScreenName
export type UtilsResolveScreenNameParams = {
  screen_name: string
}

/** Если короткое имя не найдено, приходит пустой массив */
export type UtilsResolveScreenNameResponse =
  | { type: 'user' | 'group' | 'application' | 'page' | 'vk_app', object_id: number }
  | []
