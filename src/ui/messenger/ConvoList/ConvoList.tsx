import { defineComponent } from 'vue'
import { useServices } from 'services'
import * as Lists from 'model/Lists'
import { useConvosStore } from 'store/convos'
import { loadMoreConvos } from 'actions'
import { ClassName } from 'misc/utils'
import { useConvoList } from 'ui/messenger/ConvoList/useConvoList'
import { ConvoListItem } from 'ui/messenger/ConvoListItem/ConvoListItem'
import { IntersectionWrapper } from 'ui/ui/IntersectionWrapper/IntersectionWrapper'
import { LoadError } from 'ui/ui/LoadError/LoadError'
import { Spinner } from 'ui/ui/Spinner/Spinner'
import { Tabs } from 'ui/ui/Tabs/Tabs'
import { TabsItem } from 'ui/ui/TabsItem/TabsItem'
import { Icon28MessageOutline } from 'assets/icons'
import './ConvoList.css'

type Props = {
  class?: ClassName
  compact?: boolean
}

export const ConvoList = defineComponent<Props>((props) => {
  const { lang } = useServices()
  const { lists } = useConvosStore()
  const computedConvoList = useConvoList()

  const tabLabel = (list: Lists.List) => {
    switch (list.name) {
      case 'unread':
      case 'unreadFolder':
        return lang.use('convo_list_tab_unread')
      case 'archive':
        return lang.use('convo_list_tab_archive')
      default:
        return lang.use('convo_list_tab_main')
    }
  }

  return () => {
    const { convoList, list, selectList } = computedConvoList.value

    return (
      <div class={['ConvoList', { 'ConvoList--compact': props.compact }]}>
        {/* Аватар и меню аккаунта живут в панели разделов, тут остаётся только заголовок */}
        <div class="ConvoList__header">
          {props.compact
            ? <Icon28MessageOutline class="ConvoList__headerIcon" />
            : <span class="ConvoList__headerTitle">{lang.use('nav_messenger')}</span>}
        </div>

        {!props.compact && (
          <Tabs class="ConvoList__folders">
            {[lists.main, lists.unread, lists.archive].map((listItem) => (
              <TabsItem
                active={list.name === listItem.name}
                onClick={() => selectList({ name: listItem.name })}
              >
                {tabLabel(listItem)}
              </TabsItem>
            ))}
          </Tabs>
        )}

        <div class="ConvoList__list">
          {convoList.map((convo) => (
            <ConvoListItem key={convo.id} convo={convo} compact={props.compact} />
          ))}

          {convoList.length === 0 && list.status === 'complete' && (
            <div class="ConvoList__empty">
              {lang.use('me_convo_list_empty')}
            </div>
          )}

          {list.status === 'error' && <LoadError onRetry={() => loadMoreConvos(list)} />}

          {(list.status === 'loading' || list.status === 'hasMore') && (
            <IntersectionWrapper
              onIntersect={() => loadMoreConvos(list)}
              key={convoList.length}
            >
              <Spinner size="regular" class="ConvoList__spinner" />
            </IntersectionWrapper>
          )}
        </div>
      </div>
    )
  }
}, {
  props: ['compact']
})
