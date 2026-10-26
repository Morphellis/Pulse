import { defineComponent, onMounted } from 'vue'
import { useServices } from 'services'
import * as Message from 'model/Message'
import { useReactionsStore } from 'store/reactions'
import { loadReactionAssets, toggleMessageReaction } from 'actions'
import { ReactedPeers } from 'ui/messenger/ConvoMessage/ReactedPeers'
import { Popper } from 'ui/ui/Popper/Popper'
import './MessageReactions.css'

type Props = {
  message: Message.Normal
}

/**
 * Плашка с реакциями под сообщением.
 *
 * Своя реакция подсвечена: по ней же её и снимают. Кто поставил — показываем
 * по наведению, чтобы не занимать место и не требовать лишнего клика
 */
export const MessageReactions = defineComponent<Props>((props) => {
  const { lang } = useServices()
  const reactions = useReactionsStore()

  // Картинки могли не успеть загрузиться к первому сообщению с реакцией
  onMounted(() => void loadReactionAssets())

  return () => {
    if (!props.message.reactions) {
      return null
    }

    return (
      <div class="MessageReactions">
        {props.message.reactions.map((reaction) => {
          const isMine = props.message.myReactionId === reaction.id
          const assetUrl = reactions.assetUrl(reaction.id)

          return (
            <Popper
              key={reaction.id}
              showOnHover
              placement="top-start"
              content={<ReactedPeers message={props.message} reactionId={reaction.id} />}
            >
              {/*
                Обёртка нужна, чтобы Popper вешал свои обработчики на неё, а не на кнопку:
                клик по самой реакции должен только переключать её, а список
                поставивших показывается наведением
              */}
              <span class="MessageReactions__slot">
                <button
                  type="button"
                  class={['MessageReactions__item', {
                    'MessageReactions__item--mine': isMine
                  }]}
                  title={lang.use(isMine ? 'me_reaction_remove' : 'me_reaction_add')}
                  onClick={(event) => {
                    event.stopPropagation()
                    void toggleMessageReaction(props.message, reaction.id)
                  }}
                >
                  {assetUrl && (
                    <img class="MessageReactions__image" src={assetUrl} alt="" />
                  )}
                  <span class="MessageReactions__count">{reaction.count}</span>
                </button>
              </span>
            </Popper>
          )
        })}
      </div>
    )
  }
}, {
  props: ['message']
})
