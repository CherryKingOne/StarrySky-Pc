import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { addCollection } from '@iconify/vue'
import ion from '@iconify-json/ion/icons.json'

import App from './App.vue'
import router from './router'
import { useAppStore } from '@renderer/stores/app'
import { tooltip } from './directives/tooltip'
import { agentWindowId, isAgentWindow } from '@renderer/utils/window'

addCollection(ion)

const pinia = createPinia()
const app = createApp(App).use(pinia).use(router).directive('tooltip', tooltip)

/**
 * Agent 独立窗口在挂载前完成身份初始化：
 * URL 上只携带 agentId，用户 Token 从共享会话读取，换取 Agent Token 后仅保存在本窗口内存，
 * 不会覆盖用户主窗口的登录态。
 */
async function bootstrap(): Promise<void> {
  if (isAgentWindow()) {
    const agentId = agentWindowId()
    if (agentId) {
      const ready = await useAppStore(pinia).enterAgentWindow(agentId)
      if (!ready) console.warn('[agent-window] Agent 身份初始化失败，退回用户身份', agentId)
    }
  }
  app.mount('#app')
}

void bootstrap()
