import { computed, defineComponent, onMounted, shallowRef } from 'vue'
import { useServices } from 'services'
import { useStickersStore } from 'store/stickers'
import { loadStickers } from 'actions'
import { Input } from 'ui/ui/Input/Input'
import { Spinner } from 'ui/ui/Spinner/Spinner'
import { Icon24ClockOutline, Icon24StarOutline } from 'assets/icons'
import './StickerPicker.css'

/** Размер картинки: берем с запасом под плотные экраны, показываем мельче */
const STICKER_IMAGE_SIZE = 128

type Section =
  | { kind: 'favorites' }
  | { kind: 'recent' }
  | { kind: 'pack', packId: number }

type Props = {
  onPick: (stickerId: number) => void
}

export const StickerPicker = defineComponent<Props>((props) => {
  const { lang } = useServices()
  const stickers = useStickersStore()

  const section = shallowRef<Section>({ kind: 'recent' })
  const query = shallowRef('')

  onMounted(() => {
    void loadStickers()
  })

  const shownStickers = computed(() => {
    if (query.value.trim()) {
      return stickers.search(query.value)
    }

    switch (section.value.kind) {
      case 'favorites':
        return stickers.favorites
      case 'recent':
        return stickers.recent
      case 'pack': {
        const { packId } = section.value
        return stickers.packs.find((pack) => pack.id === packId)?.stickerIds ?? []
      }
    }
  })

  const title = computed(() => {
    if (query.value.trim()) {
      return lang.use('me_stickers_search_results')
    }

    switch (section.value.kind) {
      case 'favorites':
        return lang.use('me_stickers_favorites')
      case 'recent':
        return lang.use('me_stickers_recent')
      case 'pack': {
        const { packId } = section.value
        return stickers.packs.find((pack) => pack.id === packId)?.title ?? ''
      }
    }
  })

  const isActive = (candidate: Section) => (
    !query.value.trim() &&
    section.value.kind === candidate.kind &&
    (candidate.kind !== 'pack' ||
      (section.value.kind === 'pack' && section.value.packId === candidate.packId))
  )

  const selectSection = (next: Section) => {
    query.value = ''
    section.value = next
  }

  const renderContent = () => {
    if (stickers.status === 'loading' || stickers.status === 'idle') {
      return <Spinner class="StickerPicker__spinner" size="regular" />
    }

    if (stickers.status === 'error') {
      return <div class="StickerPicker__empty">{lang.use('me_stickers_load_error')}</div>
    }

    if (shownStickers.value.length === 0) {
      return (
        <div class="StickerPicker__empty">
          {query.value.trim()
            ? lang.use('me_stickers_nothing_found')
            : lang.use('me_stickers_section_empty')}
        </div>
      )
    }

    return (
      <div class="StickerPicker__grid">
        {shownStickers.value.map((stickerId) => (
          <button
            class="StickerPicker__sticker"
            key={stickerId}
            onClick={() => props.onPick(stickerId)}
          >
            <img
              class="StickerPicker__image"
              src={`https://vk.com/sticker/1-${stickerId}-${STICKER_IMAGE_SIZE}b`}
              loading="lazy"
            />
          </button>
        ))}
      </div>
    )
  }

  return () => (
    <div class="StickerPicker">
      <div class="StickerPicker__search">
        <Input
          value={query.value}
          onInput={(event) => (query.value = event.target.value)}
          placeholder={lang.use('me_stickers_search_placeholder')}
        />
      </div>

      <div class="StickerPicker__title">{title.value}</div>

      <div class="StickerPicker__content">{renderContent()}</div>

      <div class="StickerPicker__packs">
        <button
          class={['StickerPicker__pack', isActive({ kind: 'recent' }) && 'StickerPicker__pack--active']}
          title={lang.use('me_stickers_recent')}
          onClick={() => selectSection({ kind: 'recent' })}
        >
          <Icon24ClockOutline width="20" height="20" />
        </button>

        <button
          class={['StickerPicker__pack', isActive({ kind: 'favorites' }) && 'StickerPicker__pack--active']}
          title={lang.use('me_stickers_favorites')}
          onClick={() => selectSection({ kind: 'favorites' })}
        >
          <Icon24StarOutline width="20" height="20" />
        </button>

        <div class="StickerPicker__packsDivider" />

        {stickers.packs.map((pack) => (
          <button
            class={[
              'StickerPicker__pack',
              isActive({ kind: 'pack', packId: pack.id }) && 'StickerPicker__pack--active'
            ]}
            key={pack.id}
            title={pack.title}
            onClick={() => selectSection({ kind: 'pack', packId: pack.id })}
          >
            <img class="StickerPicker__packIcon" src={pack.icon} loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  )
}, {
  props: ['onPick']
})
