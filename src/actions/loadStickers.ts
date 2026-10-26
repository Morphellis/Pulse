import { useServices } from 'services'
import { useStickersStore } from 'store/stickers'

/**
 * Загружает стикеры один раз за сессию: наборы меняются редко, а тянуть
 * несколько сотен килобайт при каждом открытии панели незачем
 */
export async function loadStickers() {
  const { api } = useServices()
  const stickers = useStickersStore()

  if (stickers.status === 'loading' || stickers.status === 'loaded') {
    return
  }

  try {
    stickers.status = 'loading'

    const [products, favorites, recent, keywords] = await api.fetchParallel([
      api.buildMethod('store.getProducts', {
        type: 'stickers',
        filters: 'active',
        extended: 1
      }),
      api.buildMethod('store.getFavoriteStickers', {}),
      api.buildMethod('messages.getRecentStickers', {}),
      api.buildMethod('store.getStickersKeywords', {
        aliases: 1,
        all_products: 0
      })
    ], { retries: 1 })

    stickers.packs = (products?.items ?? [])
      .map((product) => ({
        id: product.id,
        title: product.title,
        icon: packIcon(product.previews),
        stickerIds: (product.stickers ?? [])
          .filter((sticker) => sticker.is_allowed !== false)
          .map((sticker) => sticker.sticker_id)
      }))
      .filter((pack) => pack.stickerIds.length > 0)

    stickers.favorites = (favorites?.items ?? []).map((sticker) => sticker.sticker_id)
    stickers.recent = (recent?.items ?? []).map((sticker) => sticker.sticker_id)

    stickers.keywords = (keywords?.dictionary ?? [])
      .map((entry) => ({
        words: entry.words.map((word) => word.toLowerCase()),
        stickerIds: (entry.user_stickers ?? []).map((sticker) => sticker.sticker_id)
      }))
      .filter((entry) => entry.stickerIds.length > 0)

    stickers.status = 'loaded'
  } catch (err) {
    console.warn('[loadStickers] loading error', err)
    stickers.status = 'error'
  }
}

/** Иконка набора: берем самую крупную, мельче 44px в ленте выглядит мылом */
function packIcon(previews: Array<{ url: string, width: number }> | undefined): string {
  if (!previews?.length) {
    return ''
  }

  return previews.reduce(
    (largest, preview) => (preview.width > largest.width ? preview : largest)
  ).url
}
