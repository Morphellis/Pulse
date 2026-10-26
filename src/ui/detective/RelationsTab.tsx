import { defineComponent, shallowRef } from 'vue'
import { describeError } from 'actions/detective/common'
import { CloseFriend, loadRelations, Relations, RelativeKind } from 'actions/detective/loadRelations'
import { resolveTargetUserId } from 'actions/detective/resolveTarget'
import { Section, UserRow } from 'ui/detective/parts'
import { Button } from 'ui/ui/Button/Button'
import { Input } from 'ui/ui/Input/Input'

const RELATIVE_LABELS: Record<RelativeKind, string> = {
  partner: 'партнёр',
  parent: 'родитель',
  child: 'ребёнок',
  sibling: 'брат или сестра',
  grandparent: 'бабушка или дедушка',
  grandchild: 'внук или внучка',
  relative: 'родственник'
}

export const RelationsTab = defineComponent(() => {
  const query = shallowRef('')
  const status = shallowRef<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const error = shallowRef('')
  const relations = shallowRef<Relations | null>(null)

  async function search() {
    status.value = 'loading'
    error.value = ''
    relations.value = null

    try {
      const targetId = await resolveTargetUserId(query.value)
      if (!targetId) {
        throw new Error('Не удалось распознать пользователя')
      }

      relations.value = await loadRelations(targetId)
      status.value = 'loaded'
    } catch (err) {
      error.value = describeError(err)
      status.value = 'error'
    }
  }

  return () => (
    <div>
      <div class="DtSection DtNote">
        Родня берётся из указанных в профиле родственников и из друзей с той же фамилией.
        Близкие друзья определяются по силе пересечения: у близких людей много общих друзей
        с целью. Это подсказки, а не точные факты.
      </div>

      <div class="DtForm">
        <Input
          placeholder="Ссылка, id или короткое имя"
          value={query.value}
          onInput={(event: Event) => {
            query.value = (event.target as HTMLInputElement).value
          }}
          onKeydown={(event) => event.key === 'Enter' && search()}
        />
        <Button onClick={search} loading={status.value === 'loading'}>Найти связи</Button>
      </div>

      {error.value && <div class="DtError DtSection">{error.value}</div>}

      {relations.value && renderRelations(relations.value)}
    </div>
  )
})

function renderRelations(relations: Relations) {
  return (
    <>
      <Section title="Родня и партнёр" hint={String(relations.relatives.length)}>
        {relations.relatives.length === 0 && (
          <span class="DtMuted">не указана и однофамильцев среди друзей нет</span>
        )}
        {relations.relatives.map((relative, index) => (
          <div class="DtUser" key={index}>
            {relative.user
              ? <UserRow user={relative.user} note={relativeNote(relative.kind, relative.note)} />
              : (
                <span>
                  {relative.name}
                  <span class="DtMuted"> · {relativeNote(relative.kind, relative.note)}</span>
                </span>
              )}
          </div>
        ))}
      </Section>

      <Section
        title="Близкие друзья"
        hint={`по пересечению, проверено ${relations.analyzedFriends}`}
      >
        {relations.closeFriends.length === 0 && (
          <span class="DtMuted">список друзей закрыт или пуст</span>
        )}
        <div class="DtUserList">
          {relations.closeFriends.map((close) => (
            <UserRow key={close.user.id} user={close.user} note={closeNote(close)} />
          ))}
        </div>
      </Section>
    </>
  )
}

function relativeNote(kind: RelativeKind, note: string | undefined) {
  return note ? `${RELATIVE_LABELS[kind]}, ${note}` : RELATIVE_LABELS[kind]
}

function closeNote(close: CloseFriend) {
  return `${close.mutualCount} общих друзей`
}
