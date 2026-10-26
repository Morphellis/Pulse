import { computed, defineComponent, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UsersUser } from 'services/contracts/api/objects/UsersUser'
import * as Peer from 'model/Peer'
import { useDetectiveStore } from 'store/detective'
import { describeError, fullName, userLink } from 'actions/detective/common'
import { BirthDateEstimate, estimateBirthDate } from 'actions/detective/estimateBirthDate'
import { Dossier, loadDossier } from 'actions/detective/loadDossier'
import { platformName, startOnlineTracker } from 'actions/detective/onlineTracker'
import { resolveTargetUserId } from 'actions/detective/resolveTarget'
import { formatDate, GroupRow, Row, Section, UserRow } from 'ui/detective/parts'
import { Button } from 'ui/ui/Button/Button'
import { Input } from 'ui/ui/Input/Input'
import { Link } from 'ui/ui/Link/Link'

const RELATIONS: Record<number, string> = {
  1: 'не женат / не замужем',
  2: 'встречается',
  3: 'помолвлен(а)',
  4: 'женат / замужем',
  5: 'всё сложно',
  6: 'в активном поиске',
  7: 'влюблён(а)',
  8: 'в гражданском браке'
}

const FRIEND_STATUSES: Record<number, string> = {
  0: 'не в друзьях',
  1: 'вы отправили заявку',
  2: 'входящая заявка от него',
  3: 'в друзьях'
}

const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря'
]

export const DossierTab = defineComponent(() => {
  const detective = useDetectiveStore()
  const route = useRoute('Detective')
  const router = useRouter()
  const query = shallowRef('')
  const status = shallowRef<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const error = shallowRef('')
  const dossier = shallowRef<Dossier | null>(null)
  const birth = shallowRef<BirthDateEstimate | null>(null)
  const birthLoading = shallowRef(false)
  const showAllFriends = shallowRef(false)

  async function open() {
    status.value = 'loading'
    error.value = ''
    dossier.value = null
    birth.value = null
    showAllFriends.value = false

    try {
      const targetId = await resolveTargetUserId(query.value)
      if (!targetId) {
        throw new Error('Не удалось распознать пользователя. Вставьте ссылку, id или короткое имя')
      }

      dossier.value = await loadDossier(targetId)
      status.value = 'loaded'
    } catch (err) {
      error.value = describeError(err)
      status.value = 'error'
    }
  }

  // Со страницы человека сюда приходят с уже выбранной целью
  watch(() => route.query.target, (target) => {
    if (typeof target === 'string' && target && target !== query.value) {
      query.value = target
      open()
    }
  }, { immediate: true })

  const isWatched = computed(() => (
    !!dossier.value && detective.watched.some((item) => item.id === dossier.value!.user.id)
  ))

  function toggleWatch() {
    const target = dossier.value
    if (!target) {
      return
    }

    if (isWatched.value) {
      detective.removeWatched(target.user.id)
      return
    }

    detective.addWatched(target.user.id)

    if (detective.trackerEnabled) {
      startOnlineTracker()
    }
  }

  async function estimate() {
    if (!dossier.value) {
      return
    }

    birthLoading.value = true
    try {
      birth.value = await estimateBirthDate(dossier.value.user)
    } catch (err) {
      error.value = describeError(err)
    } finally {
      birthLoading.value = false
    }
  }

  return () => (
    <div>
      <div class="DtForm">
        <Input
          placeholder="Ссылка, id или короткое имя"
          value={query.value}
          onInput={(event: Event) => {
            query.value = (event.target as HTMLInputElement).value
          }}
          onKeydown={(event) => event.key === 'Enter' && open()}
        />
        <Button onClick={open} loading={status.value === 'loading'}>
          Открыть досье
        </Button>
      </div>

      {error.value && <div class="DtError DtSection">{error.value}</div>}

      {dossier.value && (
        <>
          <div class="DtInline DtSection">
            <Button
              size="small"
              mode="secondary"
              onClick={() => router.push({
                name: 'Profile',
                params: { userId: Peer.resolveRealId(dossier.value!.user.id, 'User') }
              })}
            >
              Открыть страницу
            </Button>
            <Button size="small" mode={isWatched.value ? 'destructive' : 'secondary'} onClick={toggleWatch}>
              {isWatched.value ? 'Не следить за онлайном' : 'Следить за онлайном'}
            </Button>
          </div>

          {renderProfile(dossier.value, birth.value, birthLoading.value, estimate)}
          {renderMutualFriends(dossier.value)}
          {renderFriends(dossier.value, showAllFriends)}
          {renderSubscriptions(dossier.value)}
          {renderGroups(dossier.value)}
        </>
      )}
    </div>
  )
})

function renderProfile(
  dossier: Dossier,
  birth: BirthDateEstimate | null,
  birthLoading: boolean,
  estimate: () => void
) {
  const { user, registeredAt } = dossier
  const lastSeenPlatform = platformName(user.last_seen?.platform ?? 0)
  const lastSeen = user.last_seen?.time
    ? `${formatDate(user.last_seen.time * 1000, true)}, ${lastSeenPlatform}`
    : 'скрыто'

  return (
    <Section title="Профиль">
      <div class="DtUser DtSection">
        <UserRow user={user} />
        {user.verified === 1 && <span class="DtBadge">верифицирован</span>}
        {user.deactivated && <span class="DtBadge DtBadge--negative">{user.deactivated}</span>}
        {user.blacklisted === 1 && (
          <span class="DtBadge DtBadge--negative">вы у него в чёрном списке</span>
        )}
        {user.blacklisted_by_me === 1 && <span class="DtBadge">в вашем чёрном списке</span>}
        {user.online === 1 && <span class="DtBadge DtBadge--positive">онлайн</span>}
      </div>

      <Row label="ID" value={`${user.id}${user.domain ? ` (${user.domain})` : ''}`} />
      <Row label="Дружба" value={FRIEND_STATUSES[user.friend_status ?? 0]} />
      <Row label="Дата рождения">
        {user.bdate ?? 'скрыта'}
        {birth ? (
          <span class="DtMuted"> · {describeBirth(birth)}</span>
        ) : (
          <>
            {' '}
            <Button size="small" mode="secondary" onClick={estimate} loading={birthLoading}>
              Определить через поиск
            </Button>
          </>
        )}
      </Row>
      <Row label="Город" value={[user.city?.title, user.country?.title].filter(Boolean).join(', ') || '—'} />
      {user.home_town && <Row label="Родной город" value={user.home_town} />}
      {user.relation !== undefined && user.relation !== 0 && (
        <Row label="Семейное положение">
          {RELATIONS[user.relation] ?? user.relation}
          {user.relation_partner && (
            <>
              {' с '}
              <Link href={`https://vk.com/id${user.relation_partner.id}`}>
                {user.relation_partner.first_name} {user.relation_partner.last_name}
              </Link>
            </>
          )}
        </Row>
      )}
      <Row label="Последний визит" value={lastSeen} />
      <Row label="Регистрация" value={describeRegistration(registeredAt)} />
      <Row label="Профиль" value={user.is_closed ? 'закрытый' : 'открытый'} />
      {user.status && <Row label="Статус" value={user.status} />}
      {user.site && <Row label="Сайт" value={<Link href={user.site}>{user.site}</Link>} />}
      {(user.mobile_phone ?? user.home_phone) && (
        <Row label="Телефоны" value={[user.mobile_phone, user.home_phone].filter(Boolean).join(', ')} />
      )}
      {renderContacts(user)}
      {renderCounters(user)}
      {user.occupation?.name && (
        <Row label="Занятие" value={`${user.occupation.name} (${user.occupation.type ?? ''})`} />
      )}
      {user.schools && user.schools.length > 0 && (
        <Row label="Школы">
          {user.schools.map((school) => (
            <div>
              {school.name ?? 'школа'}
              {school.year_graduated ? `, выпуск ${school.year_graduated}` : ''}
              {school.class ? `, класс ${school.class}` : ''}
            </div>
          ))}
        </Row>
      )}
      {user.universities && user.universities.length > 0 && (
        <Row label="Вузы">
          {user.universities.map((university) => (
            <div>
              {university.name ?? 'вуз'}
              {university.faculty_name ? `, ${university.faculty_name}` : ''}
              {university.graduation ? `, выпуск ${university.graduation}` : ''}
            </div>
          ))}
        </Row>
      )}
      {user.career && user.career.length > 0 && (
        <Row label="Карьера">
          {user.career.map((job) => (
            <div>
              {[job.company, job.position, job.city_name].filter(Boolean).join(', ')}
              {job.from || job.until ? ` (${job.from ?? '…'} – ${job.until ?? 'н. в.'})` : ''}
            </div>
          ))}
        </Row>
      )}
      {user.relatives && user.relatives.length > 0 && (
        <Row label="Родственники">
          {user.relatives.map((relative) => (
            <div>
              {relative.type}:{' '}
              {relative.id ? (
                <Link href={`https://vk.com/id${relative.id}`}>{relative.name ?? `id${relative.id}`}</Link>
              ) : (
                relative.name
              )}
            </div>
          ))}
        </Row>
      )}
      {user.about && <Row label="О себе" value={user.about} />}
      {user.interests && <Row label="Интересы" value={user.interests} />}
      {user.activities && <Row label="Деятельность" value={user.activities} />}
    </Section>
  )
}

/**
 * Точную дату регистрации ВК не отдаёт, поэтому показываем оценку по номеру страницы
 * и честно подписываем её точность
 */
function describeRegistration(registration: Dossier['registeredAt']) {
  if (!registration) {
    return 'неизвестно'
  }

  const month = new Date(registration.at).toLocaleString('ru', {
    month: 'long',
    year: 'numeric'
  })
  const note = registration.precision === 'rough'
    ? 'оценка по номеру страницы, погрешность до полугода'
    : 'оценка по номеру страницы, погрешность до пары месяцев'

  return `примерно ${month} (${note})`
}

function renderContacts(user: UsersUser) {
  const contacts = [
    user.skype && `Skype: ${user.skype}`,
    user.instagram && `Instagram: ${user.instagram}`,
    user.twitter && `Twitter: ${user.twitter}`,
    user.facebook && `Facebook: ${user.facebook}`
  ].filter(Boolean)

  return contacts.length > 0 && <Row label="Контакты" value={contacts.join(', ')} />
}

function renderCounters(user: UsersUser) {
  const { counters } = user
  const items = [
    ['друзей', counters?.friends],
    ['подписчиков', counters?.followers ?? user.followers_count],
    ['подписок', counters?.subscriptions],
    ['сообществ', counters?.pages ?? counters?.groups],
    ['фото', counters?.photos],
    ['фото с ним', counters?.user_photos],
    ['видео', counters?.videos],
    ['общих друзей', counters?.mutual_friends ?? user.common_count]
  ].filter((item): item is [string, number] => typeof item[1] === 'number')

  return items.length > 0 && (
    <Row label="Счётчики" value={items.map(([label, count]) => `${label}: ${count}`).join(' · ')} />
  )
}

function describeBirth(birth: BirthDateEstimate) {
  switch (birth.kind) {
    case 'known':
      return 'дата открыта в профиле'
    case 'found': {
      const day = birth.day && birth.month ? `${birth.day} ${MONTHS[birth.month - 1]} ` : ''
      const age = new Date().getFullYear() - birth.year
      return `по поиску: ${day}${birth.year} г., примерно ${age} лет (${birth.checks} проверок)`
    }
    case 'not_searchable':
      return 'человека нет в выдаче поиска по имени, определить нельзя'
    case 'not_found':
      return `год не нашёлся в диапазоне 13–90 лет (${birth.checks} проверок)`
  }
}

function renderMutualFriends(dossier: Dossier) {
  return (
    <Section title="Общие друзья" hint={String(dossier.mutualFriends.length)}>
      {dossier.mutualFriends.length === 0 && <span class="DtMuted">нет</span>}
      <div class="DtUserList">
        {dossier.mutualFriends.map((user) => <UserRow key={user.id} user={user} />)}
      </div>
    </Section>
  )
}

function renderFriends(dossier: Dossier, showAll: { value: boolean }) {
  const { friends } = dossier

  if (!friends) {
    return (
      <Section title="Друзья">
        <span class="DtMuted">список друзей закрыт</span>
      </Section>
    )
  }

  const visible = showAll.value ? friends.friends : friends.friends.slice(0, 30)

  return (
    <Section title="Друзья" hint={`${friends.total}, закрытых профилей ${friends.closed}`}>
      {friends.averageAge !== null && (
        <Row
          label="Средний возраст друзей"
          value={`${friends.averageAge} лет (год известен у ${friends.agesKnown})`}
        />
      )}
      {friends.cities.length > 0 && (
        <Row
          label="Города друзей"
          value={friends.cities.map((city) => `${city.title} (${city.count})`).join(', ')}
        />
      )}
      <div class="DtUserList">
        {visible.map((user) => (
          <UserRow
            key={user.id}
            user={user}
            note={user.city?.title}
          />
        ))}
      </div>
      {friends.friends.length > visible.length && (
        <Button size="small" mode="tertiary" onClick={() => (showAll.value = true)}>
          Показать всех ({friends.friends.length})
        </Button>
      )}
    </Section>
  )
}

function renderSubscriptions(dossier: Dossier) {
  const { subscriptions } = dossier

  if (!subscriptions) {
    return null
  }

  return (
    <Section title="Подписки" hint={String(subscriptions.count)}>
      <div class="DtUserList">
        {subscriptions.users.map((user) => (
          <div class="DtUser" key={user.id}>
            <Link href={userLink(user)}>{fullName(user)}</Link>
          </div>
        ))}
        {subscriptions.groups.map((group) => <GroupRow key={group.id} group={group} />)}
      </div>
    </Section>
  )
}

function renderGroups(dossier: Dossier) {
  const { groups, commonGroups } = dossier

  return (
    <>
      <Section title="Общие сообщества" hint={String(commonGroups.length)}>
        {commonGroups.length === 0 && <span class="DtMuted">нет</span>}
        <div class="DtUserList">
          {commonGroups.map((group) => <GroupRow key={group.id} group={group} />)}
        </div>
      </Section>

      <Section title="Сообщества" hint={groups ? String(groups.count) : undefined}>
        {!groups && <span class="DtMuted">список сообществ закрыт</span>}
        {groups && (
          <div class="DtUserList">
            {groups.items.map((group) => <GroupRow key={group.id} group={group} />)}
          </div>
        )}
      </Section>
    </>
  )
}
