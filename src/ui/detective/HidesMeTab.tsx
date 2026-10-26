import { defineComponent, shallowRef } from 'vue'
import { describeError } from 'actions/detective/common'
import { findWhoHidesMe, HidesMeProgress, HidesMeResult } from 'actions/detective/findWhoHidesMe'
import { Progress, Section, UserRow } from 'ui/detective/parts'
import { Button } from 'ui/ui/Button/Button'

export const HidesMeTab = defineComponent(() => {
  const running = shallowRef(false)
  const progress = shallowRef<HidesMeProgress | null>(null)
  const result = shallowRef<HidesMeResult | null>(null)
  const error = shallowRef('')

  async function run() {
    running.value = true
    error.value = ''
    result.value = null

    try {
      result.value = await findWhoHidesMe((value) => {
        progress.value = value
      })
    } catch (err) {
      error.value = describeError(err)
    } finally {
      running.value = false
    }
  }

  return () => (
    <div>
      <div class="DtSection">
        Проверяет каждого вашего друга: есть ли вы в его открытом списке друзей.
        Если нет, он скрыл вас из друзей. Закрытые профили проверить нельзя.
      </div>

      <div class="DtSection DtNote">
        Важно: настройку «скрыть из друзей» VK применяет только к показу списка на сайте
        для чужих. Метод API возвращает реальный список целиком и всегда показывает вас
        самому себе. Поэтому с одного аккаунта этот способ ловит лишь редкие случаи, а
        надёжно проверить, что вас скрыли, можно только с чужого аккаунта. Это одна из
        немногих функций, которой действительно нужна вторая страница.
      </div>

      <div class="DtForm">
        <Button onClick={run} loading={running.value}>Проверить друзей</Button>
        {progress.value && (
          <span class="DtMuted">{progress.value.checked} из {progress.value.total}</span>
        )}
      </div>

      {progress.value && running.value && (
        <Progress value={progress.value.checked} max={progress.value.total} />
      )}

      {error.value && <div class="DtError DtSection">{error.value}</div>}

      {result.value && (
        <>
          <Section title="Скрывают вас" hint={String(result.value.hiding.length)}>
            {result.value.hiding.length === 0 && <span class="DtMuted">никто</span>}
            <div class="DtUserList">
              {result.value.hiding.map((user) => <UserRow key={user.id} user={user} />)}
            </div>
          </Section>

          <Section title="Не удалось проверить" hint={String(result.value.unknown.length)}>
            {result.value.unknown.length === 0 && <span class="DtMuted">никого</span>}
            <div class="DtUserList">
              {result.value.unknown.map((user) => <UserRow key={user.id} user={user} />)}
            </div>
          </Section>
        </>
      )}
    </div>
  )
})
