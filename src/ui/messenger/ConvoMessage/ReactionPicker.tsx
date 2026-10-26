import { defineComponent, onMounted } from 'vue'
import { useServices } from 'services'
import * as Message from 'model/Message'
import { useReactionsStore } from 'store/reactions'
import { loadReactionAssets, toggleMessageReaction } from 'actions'
import { ButtonIcon } from 'ui/ui/ButtonIcon/ButtonIcon'
import { Popper } from 'ui/ui/Popper/Popper'
import { Icon24AddCircleOutline } from 'assets/icons'
import './ReactionPicker.css'

type Props = {
  message: Message.Normal
  /** Даёт меню закрыться сразу после выбора */
  onPick?: () => void
}

/**
 * Быстрый выбор реакции в меню сообщения.
 *
 * Первые несколько реакций показываем сразу — ими пользуются в подавляющем
 * большинстве случаев, а остальные прячем под кнопку с полной сеткой
 */
export const ReactionPicker = defineComponent<Props>((props) => {
  const { lang } = useServices()
  const reactions = useReactionsStore()

  onMounted(() => void loadReactionAssets())

  const pick = (reactionId: number) => {
    void toggleMessageReaction(props.message, reactionId)
    props.onPick?.()
  }

  const reactionButton = (reactionId: number, inGrid: boolean) => {
    const assetUrl = reactions.assetUrl(reactionId)

    if (!assetUrl) {
      return null
    }

    return (
      <button
        type="button"
        key={reactionId}
        class={['ReactionPicker__reaction', {
          'ReactionPicker__reaction--inGrid': inGrid,
          'ReactionPicker__reaction--mine': props.message.myReactionId === reactionId
        }]}
        onClick={() => pick(reactionId)}
      >
        <img class="ReactionPicker__image" src={assetUrl} alt="" />
      </button>
    )
  }

  return () => (
    <div class="ReactionPicker">
      {reactions.quickIds.map((reactionId) => reactionButton(reactionId, false))}

      <Popper
        placement="top-end"
        closeOnContentClick
        content={
          <div class="ReactionPicker__grid">
            {reactions.order.map((reactionId) => reactionButton(reactionId, true))}
          </div>
        }
      >
        <ButtonIcon
          class="ReactionPicker__more"
          icon={<Icon24AddCircleOutline width="20" height="20" />}
          title={lang.use('me_reactions_all')}
        />
      </Popper>
    </div>
  )
}, {
  props: ['message', 'onPick']
})
