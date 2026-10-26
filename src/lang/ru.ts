export type RuPluralRules = 'one' | 'few' | 'many'

export const ru = {
  vk_desktop_label: 'VK Desktop',

  date_today: 'сегодня',
  date_yesterday: 'вчера',
  date_today_at_time: 'сегодня в {time}',
  date_yesterday_at_time: 'вчера в {time}',

  date_at_time: '{date} в {time}',
  date_at_time_with_year: '{date} {year} в {time}',
  date_a_moment_ago: 'только что',

  date_minutes_ago: {
    single: 'минуту назад',
    one: '{0} минуту назад',
    few: '{0} минуты назад',
    many: '{0} минут назад'
  },

  date_hours_ago: {
    single: 'час назад',
    one: '{0} час назад',
    few: '{0} часа назад',
    many: '{0} часов назад'
  },

  date_days_ago: {
    single: 'день назад',
    one: '{0} день назад',
    few: '{0} дня назад',
    many: '{0} дней назад'
  },

  select_not_selected: 'Не выбрано',
  load_error: 'Ошибка загрузки',
  retry_loading: 'Повторить',

  auth_login_placeholder: 'Телефон или почта',
  auth_password_placeholder: 'Пароль',
  auth_submit: 'Войти',
  auth_cancel: 'Отмена',
  auth_show_password: 'Показать пароль',
  auth_hide_password: 'Скрыть пароль',
  auth_by_qr_code: 'Войти по QR-коду',
  auth_by_qr_code_title: 'Вход по QR-коду',
  auth_by_qr_code_description: 'Отсканируйте QR-код, либо перейдите по ссылке с мобильного устройства',
  auth_register: 'Зарегистрироваться',
  auth_forgot_password: 'Забыли пароль?',
  auth_account_delete: 'Удалить',
  auth_error_modal_title: 'Ошибка авторизации',

  auth_confirm_login: 'Подтвердите вход',
  auth_sms_with_code_sent: 'SMS с кодом отправлен на номер {phone}',
  auth_enter_incoming_call_digits: 'Введите последние 4 цифры из входящего звонка',
  auth_enter_code_from_code_gen_app: 'Введите код из приложения генератора кодов',
  auth_enter_code: 'Введите код',
  auth_sms_is_sending: 'SMS отправляется',
  auth_resend_sms_at: 'Повторить через {time}',
  auth_resend_sms: 'Повторить отправку SMS',
  auth_send_sms: 'Отправить SMS',

  auth_profile_with_hanging_signup: 'Завершите регистрацию на сайте и повторите попытку',
  auth_incorrect_profile_type: 'Невозможно авторизовать профиль с таким типом ({type})',
  auth_get_app_token_error: 'Ошибка получения токена приложения: {description}',
  auth_user_load_error: 'Ошибка получения данных о пользователе',
  auth_network_error: 'Ошибка сети',
  auth_unknown_error: 'Неизвестная ошибка',
  auth_qr_code_declined: 'Запрос на авторизацию отклонен',
  auth_qr_code_expired: 'Время действия QR-кода истекло',

  me_convo_list_author: '{author}:',
  me_convo_list_author_you: 'Вы',
  me_convo_list_date_mins: '{mins}м',
  me_convo_list_date_hours: '{hours}ч',
  me_convo_list_date_days: '{days}д',
  me_convo_list_date_weeks: '{weeks}н',
  me_convo_list_empty_convo: 'Пустой диалог',
  me_convo_list_empty: 'Список сообщений пуст',
  me_convo_disable_notifications: 'Отключить уведомления',
  me_convo_enable_notifications: 'Включить уведомления',
  me_convo_menu_pin: 'Закрепить',
  me_convo_menu_unpin: 'Открепить',
  me_convo_menu_archive: 'Архивировать',
  me_convo_menu_unarchive: 'Вернуть из архива',
  me_convo_menu_mark_unread: 'Отметить непрочитанным',
  me_convo_menu_mark_read: 'Отметить прочитанным',
  me_convo_menu_clear_history: 'Очистить историю',
  me_convo_menu_block: 'Заблокировать',

  me_messages_disappeared: {
    single: 'Сообщение исчезло',
    one: '{0} сообщение исчезло',
    few: '{0} сообщения исчезло',
    many: '{0} сообщений исчезло'
  },
  me_message_attaches: {
    one: '{0} вложение',
    few: '{0} вложения',
    many: '{0} вложений'
  },
  me_messages: {
    single: 'Сообщение',
    one: '{0} сообщение',
    few: '{0} сообщения',
    many: '{0} сообщений'
  },
  me_in_reply_to_message: 'В ответ на сообщение',
  me_empty_message: 'Пустое сообщение',
  me_notification_hidden_text: 'Новое сообщение',
  me_unknown_attach: 'Неизвестное вложение',
  me_unsupported_service_message: 'Сервисное сообщение не поддерживается',
  me_convo_composer_placeholder: 'Напишите сообщение...',
  me_composer_stickers: 'Стикеры',
  me_stickers_favorites: 'Избранные',
  me_stickers_recent: 'Недавние',
  me_stickers_search_placeholder: 'Поиск стикеров',
  me_stickers_search_results: 'Найденные',
  me_stickers_nothing_found: 'По этому слову ничего не нашлось',
  me_stickers_section_empty: 'Здесь пока пусто',
  me_stickers_load_error: 'Не удалось загрузить стикеры',
  me_choose_chat_to_write: 'Выберите, кому хотели бы написать',
  me_convo_empty_placeholder: 'История переписки пуста',
  me_convo_unread_messages: 'Новые сообщения',
  me_edited_label: 'ред.',
  me_user_online: 'online',
  me_user_was_online_a_long_time_ago: 'заходил давно',
  me_attach_wall_empty: 'Пустая запись',
  me_attach_wall_open_button: 'Открыть запись',
  me_chat_leaved_status: 'Вы вышли из чата',
  me_chat_kicked_status: 'Вы были исключены из чата',

  nav_messenger: 'Сообщения',
  nav_feed: 'Лента',
  nav_profile: 'Моя страница',
  nav_detective: 'Детектив',
  nav_account: 'Аккаунт',
  nav_settings: 'Настройки',
  nav_logout: 'Выход',
  nav_connecting: 'Нет связи с ВК, переподключаемся',
  convo_list_resize_hint: 'Потяните, чтобы изменить ширину. Двойной клик - скрыть или показать',
  convo_list_tab_main: 'Все',
  convo_list_tab_unread: 'Непрочитанные',
  convo_list_tab_archive: 'Архив',

  feed_title: 'Лента',
  feed_mode_interesting: 'Интересное',
  feed_mode_recent: 'Новое',
  feed_mode_discover: 'Открытия',
  feed_discover_note: 'Популярные записи крупных сообществ, на которые вы не подписаны. Тема меняется по мере прокрутки',
  feed_refresh: 'Обновить ленту',
  feed_empty: 'В ленте пока пусто',
  feed_end: 'Вы просмотрели всю ленту',
  feed_post_ad: 'Реклама',
  feed_post_pinned: 'Закреплено',
  feed_post_deleted_repost: 'Запись недоступна',
  feed_post_show_more: 'Показать полностью',
  feed_post_show_less: 'Свернуть',
  feed_post_open_in_vk: 'Открыть в VK',
  feed_post_like: 'Нравится',
  feed_post_unlike: 'Убрать отметку «Нравится»',
  feed_post_comments: 'Комментарии',
  feed_post_repost: 'Поделиться на своей стене',
  feed_post_share: 'Отправить сообщением',

  share_title: 'Отправить запись',
  share_search_placeholder: 'Поиск по диалогам и друзьям',
  share_message_placeholder: 'Добавить сообщение (необязательно)',
  share_nothing_found: 'Никого не нашлось',
  share_submit: 'Отправить',
  share_submit_count: 'Отправить ({count})',
  share_error_count: {
    one: 'Не удалось отправить {0} получателю',
    few: 'Не удалось отправить {0} получателям',
    many: 'Не удалось отправить {0} получателям'
  },

  settings_section_appearance: 'Оформление',
  settings_section_notifications: 'Уведомления',
  settings_section_window: 'Окно',
  settings_section_privacy: 'Приватность и перехват',
  settings_section_usage: 'Статистика сборки',
  settings_usage_disclosure: 'При запуске приложение отправляет автору сборки анонимный идентификатор установки — чтобы он видел, сколькие пользуются. Ни имя, ни id ВКонтакте, ни переписка не передаются.',
  settings_usage_users: 'установок',
  settings_usage_logins: 'запусков',
  settings_usage_error: 'Сервер счётчика недоступен',
  settings_keep_deleted: 'Оставлять удалённые сообщения',
  settings_keep_edits: 'Показывать прежние версии исправленных сообщений',
  settings_stealth_read: 'Не отмечать сообщения прочитанными',
  settings_stealth_read_hint: 'Собеседник не увидит, что вы прочитали. Счётчик непрочитанных при этом сбрасываться не будет',
  settings_intercept_warning: 'Перехват работает только пока приложение запущено. Удалённое или исправленное, пока оно было закрыто, восстановить неоткуда — ВК таких данных не отдаёт.',
  settings_journal_open: 'Журнал перехвата',
  settings_journal_count: {
    one: '{0} запись',
    few: '{0} записи',
    many: '{0} записей'
  },

  settings_notifications_popup: 'Показывать всплывающие уведомления',
  settings_notifications_show_text: 'Показывать текст сообщения',
  settings_notifications_sound: 'Звук нового сообщения',
  settings_notifications_melody: 'Сигнал:',
  settings_notifications_volume: 'Громкость',
  settings_notifications_play: 'Прослушать',
  settings_sound_chime: 'Перезвон',
  settings_sound_drop: 'Капля',
  settings_sound_marimba: 'Маримба',
  settings_sound_pop: 'Тук',
  settings_sound_bubble: 'Пузырёк',
  settings_sound_triad: 'Тройка',
  settings_sound_bell: 'Колокольчик',
  settings_sound_glass: 'Стекло',
  settings_close_to_tray: 'Прятать в трей вместо закрытия',
  settings_close_to_tray_hint: 'По крестику окно скроется, а приложение продолжит работать и принимать сообщения. Вернуть окно можно по значку в трее, выйти — через меню по правой кнопке',
  settings_quit: 'Выйти из приложения',

  journal_title: 'Журнал перехвата',
  journal_empty: 'Пока ничего не перехвачено',
  journal_clear: 'Очистить журнал',
  journal_deleted: 'Удалено',
  journal_edited: 'Исправлено',
  journal_was: 'Было',
  journal_became: 'Стало',

  me_message_deleted: 'Удалено в {time}',
  me_edited_history_hint: 'Показать прежние версии',
  me_message_actions: 'Действия с сообщением',
  me_message_forward: 'Переслать',
  me_message_mark_important: 'Отметить как важное',
  me_message_unmark_important: 'Убрать из важных',
  me_reaction_add: 'Поставить реакцию',
  me_reaction_remove: 'Убрать реакцию',
  me_reactions_all: 'Все реакции',
  me_reactions_peers_error: 'Не удалось узнать, кто поставил',
  me_reactions_peers_empty: 'Никто не поставил эту реакцию',
  me_message_reply: 'Ответить',
  me_message_reply_cancel: 'Отменить ответ',
  me_message_copy: 'Скопировать текст',
  me_message_not_sent: 'Не отправлено',
  me_message_retry: 'Повторить',
  me_message_discard: 'Удалить',
  me_voice_transcript_show: 'Расшифровка',
  me_message_select: 'Выбрать',
  me_composer_attach_photo: 'Фото',
  me_composer_attach_file: 'Файл',
  me_composer_record_voice: 'Записать голосовое',
  me_composer_record_cancel: 'Удалить запись',
  me_composer_record_pause: 'Приостановить запись',
  me_composer_record_resume: 'Продолжить запись',
  me_composer_record_stop: 'Остановить запись',
  me_composer_record_play: 'Прослушать запись',
  me_composer_record_send: 'Отправить',
  me_attach_doc_unsafe: 'ВК считает файл небезопасным',
  me_attach_upload_failed: 'Не удалось загрузить. Нажмите, чтобы повторить',

  me_message_edit: 'Редактировать',
  me_message_edit_cancel: 'Отменить правку',
  me_message_editing: 'Редактирование сообщения',
  me_message_edit_failed: 'Не удалось изменить. ВК разрешает править только недавние свои сообщения',
  me_message_delete: 'Удалить',

  selection_cancel: 'Снять выделение',
  selection_forward: 'Переслать',
  selection_delete: 'Удалить',

  delete_messages_title: {
    one: 'Удалить {0} сообщение',
    few: 'Удалить {0} сообщения',
    many: 'Удалить {0} сообщений'
  },
  delete_messages_description: {
    one: 'Сообщение исчезнет из переписки. Отменить это нельзя.',
    few: 'Сообщения исчезнут из переписки. Отменить это нельзя.',
    many: 'Сообщения исчезнут из переписки. Отменить это нельзя.'
  },
  delete_messages_for_everyone: 'Удалить у всех участников',
  delete_messages_only_for_me: 'Чужие сообщения удаляются только у вас — собеседник их сохранит',
  delete_messages_submit: 'Удалить',
  delete_messages_failed: 'Не удалось удалить',
  confirm_modal_failed: 'Не удалось выполнить действие',
  clear_convo_history_title: 'Очистить историю?',
  clear_convo_history_description: 'Все сообщения этой беседы будут удалены без возможности восстановления.',
  clear_convo_history_submit: 'Очистить',
  block_convo_owner_title: 'Заблокировать {name}?',
  block_convo_owner_description: 'Вы больше не будете видеть сообщения и записи друг друга. Это можно отменить в любой момент.',
  block_convo_owner_submit: 'Заблокировать',
  selection_count: {
    one: 'Выбрано {0} сообщение',
    few: 'Выбрано {0} сообщения',
    many: 'Выбрано {0} сообщений'
  },
  forward_title: {
    one: 'Переслать {0} сообщение',
    few: 'Переслать {0} сообщения',
    many: 'Переслать {0} сообщений'
  },
  me_read_status_unread: 'Ещё не прочитано',
  me_read_status_at: 'Прочитано в {time}',
  me_read_status_no_time: 'Прочитано до запуска приложения, время неизвестно',
  me_read_status_chat_at: 'Прочитано всеми в {time}',
  me_read_status_chat_no_time: 'Прочитано всеми, время неизвестно',
  me_edited_versions: {
    one: 'изменено, {0} версия',
    few: 'изменено, {0} версии',
    many: 'изменено, {0} версий'
  },
  settings_color_accent: 'Акцентный цвет',
  settings_color_outgoing: 'Цвет своих сообщений',
  settings_color_custom: 'Выбрать свой цвет',
  settings_color_reset: 'Сбросить',
  settings_color_reset_all: 'Вернуть цвета темы',

  video_live: 'Эфир',
  video_untitled: 'Видео без названия',
  video_open_in_vk: 'Открыть в VK',
  video_message_title: 'Видеосообщение',
  video_only_in_vk: 'ВК не отдал файл этого видео. Его можно посмотреть на сайте',
  video_message_only_in_vk: 'Видеосообщения ВК не отдаёт напрямую — это считается ' +
    'внешним доступом. Посмотреть его можно в переписке на сайте или в приложении ВК',
  video_live_only_in_vk: 'Прямые эфиры идут в формате, который здесь не проиграть. Откройте эфир в ВК',
  video_play: 'Смотреть',
  video_pause: 'Пауза',
  video_mute: 'Выключить звук',
  video_unmute: 'Включить звук',
  video_fullscreen: 'Во весь экран',
  video_fullscreen_exit: 'Выйти из полноэкранного режима',

  profile_online: 'В сети',
  profile_offline: 'Не в сети',
  profile_open_in_vk: 'Открыть в VK',
  profile_friends: 'Друзья',
  profile_posts: 'Записи',
  profile_my_posts: 'Мои записи',
  profile_no_friends: 'Друзей пока нет',
  profile_no_posts: 'Вы ещё ничего не публиковали',
  profile_not_found: 'Страница не найдена или недоступна',
  profile_id: 'ID страницы',
  profile_id_copy: 'Скопировать',
  profile_id_copied: 'Скопировано',
  profile_write: 'Написать',
  profile_open_dossier: 'Досье',
  profile_watch: 'Следить за онлайном',
  profile_unwatch: 'Не следить',
  profile_friends_hidden: 'Список друзей скрыт',

  peer_info_title: 'Информация',
  peer_info_open_hint: 'Открыть карточку собеседника',
  peer_info_open_page: 'Открыть страницу',
  peer_info_open_in_vk: 'Открыть в VK',
  peer_info_id: 'ID страницы',
  peer_info_domain: 'Короткое имя',
  peer_info_bdate: 'Дата рождения',
  peer_info_city: 'Город',
  peer_info_phone: 'Телефон',
  peer_info_status: 'Статус',
  peer_info_last_seen: 'Последний визит',
  peer_info_registered: 'Регистрация',
  peer_info_registered_value: 'примерно {date}, оценка по номеру страницы',
  peer_info_counters: 'Счётчики',
  peer_info_members: 'Участников',
  peer_info_blacklisted: 'Вы у этого человека в чёрном списке',
  peer_info_dossier: 'Досье',

  wall_back: 'Назад',
  wall_empty: 'Записей нет',
  wall_open_in_vk: 'Открыть в VK',
  wall_posts_count: {
    one: '{0} запись',
    few: '{0} записи',
    many: '{0} записей'
  },

  comments_title: 'Комментарии',
  comments_empty: 'Комментариев пока нет',
  comments_load_more: 'Показать предыдущие',
  comments_placeholder: 'Написать комментарий...',
  comments_send: 'Отправить',
  comments_send_error: 'Не удалось отправить комментарий',
  comments_likes_count: {
    one: '{0} лайк',
    few: '{0} лайка',
    many: '{0} лайков'
  },
  comments_hidden_replies: {
    one: 'Еще {0} ответ',
    few: 'Еще {0} ответа',
    many: 'Еще {0} ответов'
  },

  repost_title: 'Поделиться записью',
  repost_description: 'Запись {author} будет опубликована на вашей стене',
  repost_comment_placeholder: 'Ваш комментарий (необязательно)',
  repost_submit: 'Поделиться',
  repost_error: 'Не удалось поделиться записью',

  me_voice_transcription_error: 'Ошибка составления транскрипции',
  me_voice_transcription_in_progress: 'Расшифровка...',
  me_voice_transcript_empty: 'Слова не распознаны',

  me_chat_members_count: {
    one: '{count} участник',
    few: '{count} участника',
    many: '{count} участников'
  },
  me_group_members_count: {
    one: '{count} подписчик',
    few: '{count} подписчика',
    many: '{count} подписчиков'
  },

  me_convo_typing_text: {
    one: 'печатает',
    few: 'печатают',
    many: 'печатают'
  },
  me_convo_typing_voice: {
    one: 'записывает аудио',
    few: 'записывают аудио',
    many: 'записывают аудио'
  },
  me_convo_typing_photo: {
    one: 'отправляет фото',
    few: 'отправляют фото',
    many: 'отправляют фото'
  },
  me_convo_typing_video: {
    one: 'отправляет видео',
    few: 'отправляют видео',
    many: 'отправляют видео'
  },
  me_convo_typing_file: {
    one: 'отправляет файл',
    few: 'отправляют файл',
    many: 'отправляют файл'
  },
  me_convo_typing_videomessage: {
    one: 'записывает видеосообщение',
    few: 'записывают видеосообщение',
    many: 'записывают видеосообщение'
  },
  me_convo_typing_names_separator: ', ',
  me_convo_typing_last_name_separator: ' и ',
  me_convo_typing_rest_count: 'еще {count}',

  // region service messages
  me_service_chat_create: {
    male: '{author} создал чат «{title}»',
    female: '{author} создала чат «{title}»'
  },
  me_service_chat_title_update: {
    male: '{author} изменил название чата с «{oldTitle}» на «{title}»',
    female: '{author} изменила название чата с «{oldTitle}» на «{title}»'
  },
  me_service_chat_photo_update: {
    male: '{author} обновил фотографию чата',
    female: '{author} обновила фотографию чата'
  },
  me_service_chat_photo_remove: {
    male: '{author} удалил фотографию чата',
    female: '{author} удалила фотографию чата'
  },
  me_service_chat_kick_don: 'Вы исключены из чата, так как перестали поддерживать сообщество через VK Donut',
  me_service_call_transcription_failed: 'Не удалось создать расшифровку звонка',
  me_service_chat_invite_user_by_link: {
    male: '{author} присоединился к чату по ссылке',
    female: '{author} присоединилась к чату по ссылке'
  },
  me_service_chat_screenshot: {
    male: '{author} сделал скриншот чата',
    female: '{author} сделала скриншот чата'
  },
  me_service_chat_group_call_started: {
    male: '{author} начал групповой звонок',
    female: '{author} начала групповой звонок'
  },
  me_service_chat_invite_user_by_call_join_link: {
    male: '{author} присоединился к звонку по ссылке',
    female: '{author} присоединилась к звонку по ссылке'
  },
  me_service_chat_invite_user: {
    male: '{author} пригласил {target}',
    female: '{author} пригласила {target}'
  },
  me_service_chat_invite_user_self: {
    male: '{author} вернулся в чат',
    female: '{author} вернулась в чат'
  },
  me_service_chat_kick_user: {
    male: '{author} исключил {target}',
    female: '{author} исключила {target}'
  },
  me_service_chat_kick_user_self: {
    male: '{author} вышел из чата',
    female: '{author} вышла из чата'
  },
  me_service_accepted_message_request: 'Это {target} из вашего списка контактов',
  me_service_chat_invite_user_by_message_request: {
    male: '{author} пригласил {target} в чат',
    female: '{author} пригласила {target} в чат'
  },
  me_service_chat_invite_user_by_call: {
    male: '{author} пригласил {target} в звонок',
    female: '{author} пригласила {target} в звонок'
  },
  me_service_chat_kick_user_call_block: {
    male: '{target} исключён из чата',
    female: '{target} исключена из чата'
  },
  me_service_chat_pin_message: {
    male: '{author} закрепил сообщение «{message}»',
    female: '{author} закрепила сообщение «{message}»'
  },
  me_service_chat_unpin_message: {
    male: '{author} открепил сообщение «{message}»',
    female: '{author} открепила сообщение «{message}»'
  },
  me_service_conversation_style_update: {
    male: '{author} изменил оформление чата на «{style}»',
    female: '{author} изменила оформление чата на «{style}»'
  },
  me_service_conversation_style_reset: {
    male: '{author} сбросил оформление чата',
    female: '{author} сбросила оформление чата'
  },
  // endregion

  // region message attaches
  me_message_attach_photo: {
    single: 'Фотография',
    one: '{0} фотография',
    few: '{0} фотографии',
    many: '{0} фотографий'
  },
  me_message_attach_audio: {
    single: 'Аудиозапись',
    one: '{0} аудиозапись',
    few: '{0} аудиозаписи',
    many: '{0} аудиозаписей'
  },
  me_message_attach_video: {
    single: 'Видео',
    one: '{0} видео',
    few: '{0} видео',
    many: '{0} видео'
  },
  me_message_attach_doc: {
    single: 'Файл',
    one: '{0} файл',
    few: '{0} файла',
    many: '{0} файлов'
  },
  me_message_attach_link: {
    single: 'Ссылка',
    one: '{0} ссылка',
    few: '{0} ссылки',
    many: '{0} ссылок'
  },
  me_message_attach_gift: 'Подарок',
  me_message_attach_sticker: 'Стикер',
  me_message_attach_ugc_sticker: 'Стикер',
  me_message_attach_wall: 'Запись',
  me_message_attach_wall_reply: 'Комментарий',
  me_message_attach_event: 'Мероприятие',
  me_message_attach_voice: 'Аудиосообщение',
  me_message_attach_audio_playlist: 'Плейлист',
  me_message_attach_artist: 'Исполнитель',
  me_message_attach_curator: 'Куратор',
  me_message_attach_article: 'Статья',
  me_message_attach_poll: 'Опрос',
  me_message_attach_story: 'История',
  me_message_attach_narrative: 'Сюжет',
  me_message_attach_graffiti: 'Граффити',
  me_message_attach_market: 'Товар',
  me_message_attach_podcast: 'Подкаст',
  me_message_attach_money_request: 'Денежный запрос',
  me_message_attach_money_transfer: 'Денежный перевод',
  me_message_attach_geo: 'Карта',
  me_message_attach_call: 'Звонок',
  me_message_attach_group_call_in_progress: 'Звонок',
  me_message_attach_mini_app: 'Мини-приложение',
  me_message_attach_app_action: 'Сервис',
  me_message_attach_video_message: 'Видеосообщение',
  me_message_attach_widget: 'Виджет',
  me_message_attach_question: 'Вопрос',
  me_message_attach_donut_link: 'Сообщество с VK Donut',
  me_message_attach_story_reaction: 'Реакция на историю',
  // endregion

  me_convo_styles: {
    unknown: 'Неизвестное',
    default: 'Основное',
    candy: 'Розовое',
    crimson: 'Красное',
    disco: 'Диско',
    easter_egg: 'Красивое',
    emerald: 'Зелёное',
    frost: 'Ледяное',
    gamer: 'Геймерское',
    gifts: 'Подарки',
    halloween_orange: 'Тыквенное',
    halloween_violet: 'Мистическое',
    lagoon: 'Голубое',
    mable: 'Стандартное',
    marine: 'Морское',
    midnight: 'Синее',
    new_year: 'Новогоднее',
    retrowave: 'Ретровейв',
    sberkot: 'СберКот',
    sunset: 'Оранжевое',
    twilight: 'Сумерки',
    unicorn: 'Нежное',
    valentine: 'Романтичное',
    vk17: 'Праздничное',
    warm_valentine: 'Амурное',
    womens_day: 'Весеннее'
  },

  modal_cancel_label: 'Отмена',
  modal_close_label: 'Закрыть',
  modal_send_label: 'Отправить',
  modal_delete_label: 'Удалить',

  messagePreviewModal_title: 'Просмотр сообщения',
  messagePreviewModal_unavailable: 'Сообщение недоступно',

  captchaModal_title: 'Введите капчу',
  captchaModal_enter_code: 'Введите код',

  initErrorModal_title: 'Ошибка инициализации',
  initErrorModal_text: 'Не удалось загрузить начальные данные для старта приложения',
  initErrorModal_retry: 'Повторить попытку',

  engineFailModal_title: 'Ошибка движка',
  engineFailModal_reload: 'Перезагрузить',
  engineFailModal_description_retrieve_key: 'Произошла ошибка при обновлении ключа.',
  engineFailModal_description_resync: 'Произошла ошибка во время синхронизации.',
  engineFailModal_description_invalidate_cache: 'При синхронизации пришел запрос на сброс кеша.',
  engineFailModal_description_other: 'Произошла ошибка в работе движка.',
  engineFailModal_reload_note: 'Чтобы получать новые сообщения в реальном времени нужно перезагрузить приложение',

  confirmAccountDelete_title: 'Удаление аккаунта',
  confirmAccountDelete_confirm: 'Вы действительно хотите удалить аккаунт {userName}?',

  settings_title: 'Настройки',
  settings_theme_description: 'Тема:',
  settings_theme_system: 'Системная',
  settings_theme_light: 'Светлая',
  settings_theme_dark: 'Темная',
  settings_alwaysOnTop_description: 'Показывать окно поверх остальных окон',
  settings_useCustomTitlebar_description: 'Отключить рамку окна и заменить заголовок окна',

  settings_changeWindowSetting_title: 'Изменение настройки окна',
  settings_changeWindowSetting_description: 'Изменение вступит в силу после перезагрузки приложения',

  app_menu_labels: {
    appMenuTitle: 'VK Desktop',
    about: 'О программе',
    settings: 'Настройки',
    services: 'Сервисы',
    hideApp: 'Скрыть VK Desktop',
    hideOthers: 'Скрыть остальные',
    showAllApps: 'Показать все',
    quit: 'Выйти из VK Desktop',

    editMenuTitle: 'Правка',
    undo: 'Отменить',
    redo: 'Повторить',
    cut: 'Вырезать',
    copy: 'Скопировать',
    paste: 'Вставить',
    selectAll: 'Выбрать все',

    viewMenuTitle: 'Вид',
    reload: 'Перезагрузить',
    resetZoom: 'Сбросить размер',
    zoomIn: 'Увеличить',
    zoomOut: 'Уменьшить',

    windowMenuTitle: 'Окно',
    minimize: 'Свернуть',
    close: 'Закрыть',

    helpMenuTitle: 'Справка',
    vkPage: 'Страница в VK',
    githubPage: 'Страница на GitHub'
  }
} as const
