/** Одна позиция стикера в наборе, избранном или подборке по слову */
export type StoreSticker = {
  sticker_id: number
  is_allowed?: boolean
  animation_url?: string
}

export type StoreProduct = {
  id: number
  type: 'stickers'
  title: string
  purchased?: number
  active?: number
  /** Иконки набора разных размеров для боковой ленты */
  previews?: Array<{
    url: string
    width: number
    height: number
  }>
  stickers?: StoreSticker[]
}

// store.getProducts
export type StoreGetProductsParams = {
  type: 'stickers'
  filters?: 'active' | 'purchased'
  extended?: 0 | 1
}

export type StoreGetProductsResponse = {
  count: number
  items: StoreProduct[]
}

// store.getFavoriteStickers
export type StoreGetFavoriteStickersParams = Record<string, never>

export type StoreGetFavoriteStickersResponse = {
  count: number
  items: StoreSticker[]
}

// store.getStickersKeywords
export type StoreGetStickersKeywordsParams = {
  aliases?: 0 | 1
  all_products?: 0 | 1
}

export type StoreGetStickersKeywordsResponse = {
  count: number
  dictionary: Array<{
    words: string[]
    user_stickers?: StoreSticker[]
    promoted_stickers?: StoreSticker[]
  }>
}
