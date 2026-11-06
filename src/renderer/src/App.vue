<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { RouterView } from 'vue-router'
import { useAppStore } from '@renderer/stores/app'
import { useConversationsStore } from '@renderer/stores/conversations'
import { wsClient } from '@renderer/api/ws'
import { setTokenRefresher } from '@renderer/api/http'
import { isLoginWindow } from '@renderer/utils/window'

const app = useAppStore()
const conversations = useConversationsStore()
const compact = isLoginWindow()

// 登录小窗需要透明背景，才能露出圆角与阴影
if (compact) document.documentElement.classList.add('login-window')

watch(
  () => app.theme,
  (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  },
  { immediate: true }
)

let unbindRealtime: (() => void) | undefined
let unbindStatus: (() => void) | undefined

watch(
  () => app.accessToken,
  (token) => {
    unbindRealtime?.()
    unbindRealtime = undefined
    unbindStatus?.()
    unbindStatus = undefined

    setTokenRefresher(token ? () => app.refreshAccessToken() : null)

    if (!token) {
      wsClient.disconnect()
      conversations.reset()
      return
    }

    unbindRealtime = conversations.bindRealtime()
    unbindStatus = wsClient.onStatus((status) => {
      if (status === 'connected') void conversations.refresh().catch(() => undefined)
    })
    void conversations.load(true).catch(() => undefined)
    wsClient.connect(token)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  unbindRealtime?.()
  unbindStatus?.()
})
</script>

<template>
  <!-- 主窗口直接铺满整个可视区，页面切换不做过渡，避免动画卡住导致点击无响应 -->
  <div class="app-window flex h-full w-full" :class="compact ? 'login-shell' : ''">
    <RouterView />
  </div>
</template>
