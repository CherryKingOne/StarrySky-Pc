import { createRouter, createWebHashHistory } from 'vue-router'
import { useAppStore } from '@renderer/stores/app'
import { isLoginWindow } from '@renderer/utils/window'

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
      path: '/lock',
      name: 'lock',
      component: () => import('@renderer/views/LockView.vue')
    },
    {
      path: '/popout/:id',
      name: 'popout',
      component: () => import('@renderer/views/PopoutChatView.vue')
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
        },
        {
          path: 'files',
          name: 'files',
          component: () => import('@renderer/views/FilesView.vue')
        },
        {
          path: 'workbench',
          name: 'workbench',
          component: () => import('@renderer/views/WorkbenchView.vue')
        },
        {
          path: 'search',
          name: 'search',
          component: () => import('@renderer/views/SearchView.vue')
        },
        {
          path: 'history',
          name: 'history',
          component: () => import('@renderer/views/HistoryView.vue')
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

const TITLES: Record<string, string> = {
  login: '野火IM · 登录',
  lock: '野火IM · 已锁定',
  chats: '野火IM · 会话',
  contacts: '野火IM · 通讯录',
  favorites: '野火IM · 收藏',
  ai: '野火IM · AI 助手',
  files: '野火IM · 文件记录',
  workbench: '野火IM · 工作台',
  search: '野火IM · 聊天记录搜索',
  history: '野火IM · 消息历史',
  popout: '野火IM · 独立聊天窗',
  settings: '野火IM · 设置'
}

router.beforeEach((to) => {
  // 登录小窗只渲染登录卡片，不参与主应用路由
  if (isLoginWindow()) {
    return to.name === 'login' ? true : { name: 'login' }
  }

  const app = useAppStore()

  if (app.locked) {
    if (to.name === 'lock' || to.name === 'login') return true
    return { name: 'lock' }
  }

  if (!app.authenticated && to.name !== 'login') return { name: 'login' }
  if (app.authenticated && to.name === 'login') return { name: 'chats' }
  if (to.name === 'lock') return { name: 'chats' }
  return true
})

router.afterEach((to) => {
  document.title = TITLES[String(to.name ?? '')] ?? '野火IM'
})

export default router
