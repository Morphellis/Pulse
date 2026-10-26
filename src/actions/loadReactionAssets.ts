import { useServices } from 'services'
import { useReactionsStore } from 'store/reactions'

/**
 * Загружает картинки реакций один раз за сессию.
 *
 * Берём только статичные svg: анимации ВК отдаёт в формате Lottie,
 * который без отдельной библиотеки не проиграть
 */
export async function loadReactionAssets() {
  const { api } = useServices()
  const reactions = useReactionsStore()

  if (reactions.status === 'loading' || reactions.status === 'loaded') {
    return
  }

  try {
    reactions.status = 'loading'

    const response = await api.fetch('messages.getReactionsAssets', {}, { retries: 1 })

    reactions.assets = new Map(
      response.assets.map((asset) => [asset.reaction_id, asset.links.static])
    )
    // Порядок берём из reaction_ids: assets отсортированы по идентификатору,
    // а показывать реакции надо так, как их показывает сам ВК
    reactions.order = response.reaction_ids.filter((id) => reactions.assets.has(id))
    reactions.status = 'loaded'
  } catch (error) {
    console.warn('[loadReactionAssets] loading error', error)
    reactions.status = 'error'
  }
}
