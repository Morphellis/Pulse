import { defineComponent, shallowRef } from 'vue'
import { CommentsTab } from 'ui/detective/CommentsTab'
import { DossierTab } from 'ui/detective/DossierTab'
import { HidesMeTab } from 'ui/detective/HidesMeTab'
import { OnlineTab } from 'ui/detective/OnlineTab'
import { RelationsTab } from 'ui/detective/RelationsTab'
import { Tabs } from 'ui/ui/Tabs/Tabs'
import { TabsItem } from 'ui/ui/TabsItem/TabsItem'
import './Detective.css'

type Tab = 'dossier' | 'online' | 'comments' | 'relations' | 'hides'

const TABS: Array<{ id: Tab, title: string }> = [
  { id: 'dossier', title: 'Досье' },
  { id: 'online', title: 'Онлайн' },
  { id: 'comments', title: 'Комментарии' },
  { id: 'relations', title: 'Связи' },
  { id: 'hides', title: 'Кто скрывает меня' }
]

export const Detective = defineComponent(() => {
  const tab = shallowRef<Tab>('dossier')

  return () => (
    <div class="Detective">
      <div class="Detective__header">Детектив</div>

      <Tabs class="Detective__tabs">
        {TABS.map((item) => (
          <TabsItem active={tab.value === item.id} onClick={() => (tab.value = item.id)}>
            {item.title}
          </TabsItem>
        ))}
      </Tabs>

      <div class="Detective__content">
        {tab.value === 'dossier' && <DossierTab />}
        {tab.value === 'online' && <OnlineTab />}
        {tab.value === 'comments' && <CommentsTab />}
        {tab.value === 'relations' && <RelationsTab />}
        {tab.value === 'hides' && <HidesMeTab />}
      </div>
    </div>
  )
})
