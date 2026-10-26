import { defineComponent } from 'vue'
import { ClassName } from 'misc/utils'
import './Skeleton.css'

type Props = {
  /** Ширина: число трактуется как пиксели, строка подставляется как есть */
  width?: number | string
  height?: number | string
  /** Круглая заглушка под аватар */
  circle?: boolean
  class?: ClassName
}

export const Skeleton = defineComponent<Props>((props) => {
  return () => {
    const toSize = (value: number | string | undefined) => (
      typeof value === 'number' ? `${value}px` : value
    )

    return (
      <span
        class={['Skeleton', props.circle && 'Skeleton--circle', props.class]}
        style={{
          width: toSize(props.width),
          height: toSize(props.height)
        }}
      />
    )
  }
}, {
  props: ['width', 'height', 'circle', 'class']
})
