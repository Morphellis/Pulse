import { defineComponent } from 'vue'
import { Skeleton } from 'ui/ui/Skeleton/Skeleton'
import './PostSkeleton.css'

type Props = {
  /** Сколько заглушек показать подряд */
  count?: number
}

/**
 * Повторяет раскладку FeedPost, чтобы при загрузке лента не прыгала.
 *
 * Возвращает ровно один корневой элемент: компонент попадает внутрь
 * IntersectionWrapper, который умеет вешать ref только на единственный корень
 */
export const PostSkeleton = defineComponent<Props>((props) => {
  return () => (
    <div class="PostSkeletonGroup">
      {Array.from({ length: props.count ?? 3 }, (_, index) => (
        <div class="PostSkeleton" key={index}>
          <div class="PostSkeleton__header">
            <Skeleton circle width={48} height={48} />
            <div class="PostSkeleton__headerText">
              <Skeleton width={160} height={14} />
              <Skeleton width={96} height={12} />
            </div>
          </div>

          <div class="PostSkeleton__text">
            <Skeleton width="100%" height={12} />
            <Skeleton width="92%" height={12} />
            <Skeleton width="64%" height={12} />
          </div>

          <Skeleton class="PostSkeleton__attach" width="100%" height={220} />

          <div class="PostSkeleton__footer">
            <Skeleton width={48} height={16} />
            <Skeleton width={48} height={16} />
            <Skeleton width={48} height={16} />
          </div>
        </div>
      ))}
    </div>
  )
}, {
  props: ['count']
})
