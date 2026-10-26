import { version } from '../../package.json'

export const appVersion = version
export const isMacOS = __IS_MACOS__

export const appUserAgent = `VKDesktop/${version}`

export const PEER_FIELDS = [
  'first_name_acc',
  'last_name_acc',
  'photo_50',
  'photo_100',
  'sex',
  'members_count',
  'online_info'
].join(',')

/*
  Счётчик пользователей.

  Посчитать пользователей всех копий приложения без сервера невозможно, поэтому
  клиент шлёт на указанный адрес анонимный идентификатор установки. Пока адрес
  пустой, никаких запросов не уходит и приложение остаётся полностью автономным
*/
export const USAGE_COUNTER_ENDPOINT = ''
/** Чей VK id видит число в настройках. 0 - показывать всем */
export const USAGE_COUNTER_OWNER_ID = 0

export const CONVOS_PER_PAGE = 20
export const NEWSFEED_PER_PAGE = 20
/** Сколько страниц подписок собрать, прежде чем ранжировать их между собой */
export const INTERESTING_PAGES_PER_BATCH = 2

/*
  Пороги для раздела «Открытия».

  Поиск ВК отдаёт самые свежие записи по слову, а не популярные: у девяти из десяти
  результатов ноль лайков, поэтому отбирать по отклику бессмысленно. Единственный
  надёжный признак качества здесь - размер сообщества: он же отсеивает записи
  районных пабликов и детских садов, которых в выдаче большинство
*/
export const DISCOVER_SEARCH_COUNT = 100
export const DISCOVER_MIN_MEMBERS = 20000
export const DISCOVER_MIN_TEXT_LENGTH = 40
/** Сколько записей стараемся набрать в одну порцию открытий */
export const DISCOVER_MIN_BATCH_SIZE = 12
/** И сколько тем ради этого готовы перебрать */
export const DISCOVER_TOPICS_PER_BATCH = 3

/**
 * Крупные, но неинтересные в ленте сообщества: доски объявлений, вакансии, барахолки.
 * По размеру аудитории они проходят, поэтому отсеиваем по названию
 */
export const DISCOVER_NAME_BLOCKLIST = [
  'авторынок',
  'аренда',
  'сниму',
  'сдам',
  'куплю',
  'продам',
  'объявлен',
  'барахолка',
  'вакансии',
  'работа в',
  'подработка',
  'знакомства',
  'такси',
  'доставка',
  'ставки',
  'казино',
  'кредит',
  'займ'
]
/** Сколько записей из открытий подмешивать в «Интересное» на одну порцию */
export const INTERESTING_DISCOVER_SHARE = 6
/**
 * Темы для раздела «Открытия».
 *
 * Своих рекомендаций ВК через этот API не отдаёт, поэтому новое содержимое ищем
 * через newsfeed.search по случайной теме из списка
 */
export const DISCOVER_TOPICS = [
  'мемы',
  'юмор',
  'наука',
  'технологии',
  'космос',
  'история',
  'музыка',
  'кино',
  'игры',
  'фотография',
  'искусство',
  'путешествия',
  'еда',
  'спорт',
  'книги',
  'природа',
  'дизайн',
  'программирование',
  'автомобили',
  'животные'
]
export const WALL_PER_PAGE = 20
export const COMMENTS_PER_PAGE = 20
/** Сколько ответов в ветке комментария подгружать сразу */
export const COMMENTS_THREAD_PREVIEW = 3
/** Друзья грузятся одним запросом для выбора получателей при отправке записи */
export const FRIENDS_PER_PAGE = 500
export const INTEGER_BOUNDARY = (2 ** 31) - 1
/** Сколько записей хранит журнал удалённых и отредактированных сообщений */
export const MESSAGE_JOURNAL_LIMIT = 500
/** Сколько отметок о прочтении храним на одну беседу */
export const READ_RECEIPTS_PER_PEER = 200
