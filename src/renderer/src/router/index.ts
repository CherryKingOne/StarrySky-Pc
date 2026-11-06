import { createRouter, createWebHashHistory } from 'vue-router'
import { useAppStore } from '@renderer/stores/app'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/login' },
    {
      path: '/login',
      name: 'login',
      component: () => import('@renderer/views/LoginView.vue')
    },
    {
      path: '/',
      component: () => import('@renderer/layouts/MainLayout.vue'),
      redirect: '/chats',
      children: [
        {
          path: 'chats',
          name: 'chats',
          component: () => import('@renderer/views/ChatView.vue')
        },
        {
          path: 'contacts',
          name: 'contacts',
          component: () => import('@renderer/views/ContactsView.vue')
        },
        {
          path: 'favorites',
          name: 'favorites',
          component: () => import('@renderer/views/FavoritesView.vue')
        },
        {
          path: 'ai',
          name: 'ai',
          component: () => import('@renderer/views/AiView.vue')
        }
      ]
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@renderer/views/SettingsView.vue')
    }
  ]
})

router.beforeEach((to) => {
  const app = useAppStore()
  if (!app.authenticated && to.name !== 'login') return { name: 'login' }
  if (app.authenticated && to.name === 'login') return { name: 'chats' }
  return true
})

router.afterEach((to) => {
  document.title = to.name === 'login' ? '野火IM · 登录' : '野火IM'
})

export default router
