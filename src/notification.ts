// eslint-disable-next-line simple-import-sort/imports
import './assets/schemes/vkcom-light.css'
import './assets/schemes/vkcom-dark.css'
import './assets/schemes/vkui-light.css'
import './assets/schemes/vkui-dark.css'
import './styles.css'
import 'vue/jsx'
// eslint-disable-next-line import-x/extensions
import './vue-jsx-events.d.ts'
import { createApp } from 'vue'
import { NotificationsApp } from 'ui/notifications/NotificationsApp/NotificationsApp'

/*
  Отдельная точка сборки для окна всплывающих уведомлений.
  Здесь нет ни роутера, ни хранилищ, ни лонгпола: окно только показывает то,
  что присылает основное окно, иначе получилось бы второе подключение к ВК
*/
createApp(NotificationsApp).mount('body')
