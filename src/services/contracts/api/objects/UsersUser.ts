export type UsersUser = {
  id: number
  first_name: string
  first_name_acc: string
  last_name: string
  last_name_acc: string
  is_closed: boolean
  can_access_closed: boolean
  deactivated?: 'deleted' | 'banned'
  photo_50?: string
  photo_100?: string
  photo_200?: string
  photo_base?: string
  online_info?: {
    visible: boolean
    last_seen?: number
    is_online?: boolean
    is_mobile?: boolean
    status?: 'recently' | 'last_week' | 'last_month' | 'long_ago' | 'not_show'
    app_id?: number
  }
  /** 0 — unknown, 1 — female, 2 — male */
  sex: 0 | 1 | 2

  // Поля ниже приходят только при явном запросе через fields (см. actions/detective)
  /** Формат "D.M.YYYY" или "D.M", если год скрыт */
  bdate?: string
  city?: { id: number, title: string }
  country?: { id: number, title: string }
  home_town?: string
  maiden_name?: string
  domain?: string
  screen_name?: string
  status?: string
  site?: string
  followers_count?: number
  /** 1 — текущий пользователь находится в чёрном списке у этого пользователя */
  blacklisted?: 0 | 1
  /** 1 — этот пользователь находится в чёрном списке у текущего пользователя */
  blacklisted_by_me?: 0 | 1
  /** 0 — не друг, 1 — отправлена заявка, 2 — входящая заявка, 3 — друг */
  friend_status?: 0 | 1 | 2 | 3
  is_friend?: 0 | 1
  common_count?: number
  relation?: number
  relation_partner?: { id: number, first_name: string, last_name: string }
  online?: 0 | 1
  online_mobile?: 0 | 1
  /** platform: 1 mobile, 2 iphone, 3 ipad, 4 android, 5 wphone, 6 windows, 7 web */
  last_seen?: { time?: number, platform?: number }
  verified?: 0 | 1
  can_write_private_message?: 0 | 1
  can_send_friend_request?: 0 | 1
  has_mobile?: 0 | 1
  mobile_phone?: string
  home_phone?: string
  skype?: string
  instagram?: string
  twitter?: string
  facebook?: string
  about?: string
  interests?: string
  activities?: string
  occupation?: { type?: string, name?: string, id?: number }
  schools?: Array<{
    name?: string
    year_graduated?: number
    year_from?: number
    year_to?: number
    class?: string
  }>
  universities?: Array<{
    name?: string
    graduation?: number
    faculty_name?: string
    chair_name?: string
  }>
  career?: Array<{
    company?: string
    position?: string
    from?: number
    until?: number
    city_name?: string
    group_id?: number
  }>
  relatives?: Array<{ id?: number, name?: string, type: string }>
  counters?: {
    friends?: number
    followers?: number
    photos?: number
    subscriptions?: number
    pages?: number
    groups?: number
    videos?: number
    user_photos?: number
    mutual_friends?: number
    gifts?: number
  }
}
