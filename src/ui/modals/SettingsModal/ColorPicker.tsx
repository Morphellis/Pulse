import { defineComponent, shallowRef, watch } from 'vue'
import { useServices } from 'services'
import { parseHex } from 'misc/color'
import { ButtonText } from 'ui/ui/ButtonText/ButtonText'
import { Input } from 'ui/ui/Input/Input'
import { Icon16CheckOutline } from 'assets/icons'
import './ColorPicker.css'

type Props = {
  label: string
  presets: string[]
  /** null означает «цвет темы по умолчанию» */
  value: string | null
  onChange: (value: string | null) => void
}

export const ColorPicker = defineComponent<Props>((props) => {
  const { lang } = useServices()
  const draft = shallowRef(props.value ?? '')

  // Поле ввода не перетирает то, что пользователь печатает, но следует за палитрой
  watch(() => props.value, (value) => {
    draft.value = value ?? ''
  })

  const applyDraft = (raw: string) => {
    draft.value = raw
    const parsed = parseHex(raw)

    if (parsed) {
      props.onChange(raw.startsWith('#') ? raw.toLowerCase() : `#${raw.toLowerCase()}`)
    }
  }

  return () => (
    <div class="ColorPicker">
      <div class="ColorPicker__head">
        <span class="ColorPicker__label">{props.label}</span>
        {props.value && (
          <ButtonText class="ColorPicker__reset" onClick={() => props.onChange(null)}>
            {lang.use('settings_color_reset')}
          </ButtonText>
        )}
      </div>

      <div class="ColorPicker__swatches">
        {props.presets.map((preset) => (
          <button
            type="button"
            key={preset}
            class={['ColorSwatch', props.value === preset && 'ColorSwatch--selected']}
            style={{ background: preset }}
            title={preset}
            onClick={() => props.onChange(preset)}
          >
            {props.value === preset && <Icon16CheckOutline class="ColorSwatch__check" />}
          </button>
        ))}
      </div>

      <div class="ColorPicker__custom">
        {/*
          Нативный input type=color открывает системную палитру, а текстовое поле
          рядом позволяет вставить конкретный код цвета
        */}
        <input
          type="color"
          class="ColorPicker__native"
          value={props.value ?? '#2688eb'}
          onInput={(event) => applyDraft((event.target).value)}
          title={lang.use('settings_color_custom')}
        />
        <Input
          class="ColorPicker__hex"
          placeholder="#2688eb"
          value={draft.value}
          onInput={(event) => applyDraft(event.target.value)}
          inLayer
        />
      </div>
    </div>
  )
}, {
  props: ['label', 'presets', 'value', 'onChange']
})
