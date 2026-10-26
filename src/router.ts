import { createRouter, createWebHashHistory, RouteRecordInfo } from 'vue-router'
import * as Peer from 'model/Peer'
import { useViewerStore } from 'store/viewer'
import { AppShell } from 'ui/app/AppShell/AppShell'
import { Auth } from 'ui/Auth/Auth'
import { Detective } from 'ui/detective/Detective'
import { Feed } from 'ui/feed/Feed/Feed'
import { ConvoWrapper } from 'ui/messenger/ConvoView/ConvoView'
import { NoConvo } from 'ui/messenger/NoConvo/NoConvo'
import { ProfileView } from 'ui/profile/ProfileView/ProfileView'
import { WallView } from 'ui/wall/WallView/WallView'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: AppShell,
      beforeEnter() {
        const viewer = useViewerStore()
        if (viewer.id === 0) {
          return { path: '/auth' }
        }
      },
      children: [
        {
          name: 'NoConvo',
          path: '',
          component: NoConvo
        },
        {
          name: 'Convo',
          path: 'convo/:peerId',
          component: ConvoWrapper
        },
        {
          name: 'Feed',
          path: 'feed',
          component: Feed
        },
        {
          name: 'Wall',
          path: 'wall/:ownerId',
          component: WallView
        },
        {
          // Без параметра открывается своя страница, с ним — чужая
          name: 'Profile',
          path: 'profile/:userId?',
          component: ProfileView
        },
        {
          name: 'Detective',
          path: 'detective',
          component: Detective
        }
      ]
    },
    {
      name: 'Auth',
      path: '/auth',
      component: Auth
    }
  ]
})

interface RouteNamedMap {
  NoConvo: RouteRecordInfo<
    'NoConvo',
    '/',
    Record<never, never>,
    Record<never, never>
  >
  Convo: RouteRecordInfo<
    'Convo',
    '/convo/:peerId',
    { peerId: Peer.Id },
    { peerId: string }
  >
  Feed: RouteRecordInfo<
    'Feed',
    '/feed',
    Record<never, never>,
    Record<never, never>
  >
  Wall: RouteRecordInfo<
    'Wall',
    '/wall/:ownerId',
    { ownerId: Peer.OwnerId },
    { ownerId: string }
  >
  Profile: RouteRecordInfo<
    'Profile',
    '/profile/:userId?',
    { userId?: Peer.UserId },
    { userId?: string }
  >
  Detective: RouteRecordInfo<
    'Detective',
    '/detective',
    Record<never, never>,
    Record<never, never>
  >
  Auth: RouteRecordInfo<
    'Auth',
    '/auth',
    Record<never, never>,
    Record<never, never>
  >
}

declare module 'vue-router' {
  interface TypesConfig {
    RouteNamedMap: RouteNamedMap
  }
}
