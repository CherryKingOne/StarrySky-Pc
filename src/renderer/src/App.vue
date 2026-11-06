<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { RouterView } from 'vue-router'
import { useAppStore } from '@renderer/stores/app'
import { useConversationsStore } from '@renderer/stores/conversations'
import { wsClient } from '@renderer/api/ws'
import { setTokenRefresher } from '@renderer/api/http'
import type { MessageItem } from '@renderer/api/contracts'
import { isLoginWindow, isPopoutWindow } from '@renderer/utils/window'

const REALTIME_CHANNEL = 'starrysky-realtime'
const app = useAppStore()
const conversations = useConversationsStore()
const compact = isLoginWindow()
const popoutWindow = isPopoutWindow()

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
let broadcastChannel: BroadcastChannel | undefined

function closeBroadcast(): void {
  broadcastChannel?.close()
  broadcastChannel = undefined
}

function openBroadcast(): BroadcastChannel | undefined {
  if (typeof BroadcastChannel === 'undefined') return undefined
  broadcastChannel = new BroadcastChannel(REALTIME_CHANNEL)
  return broadcastChannel
}

watch(
  () => app.accessToken,
  (token) => {
    unbindRealtime?.()
    unbindRealtime = undefined
    unbindStatus?.()
    unbindStatus = undefined
    closeBroadcast()

    // 独立会话窗口不刷新 Token，避免与主窗口轮换 Token 发生冲突
    setTokenRefresher(!popoutWindow && token ? () => app.refreshAccessToken() : null)

    if (!token) {
      wsClient.disconnect()
      conversations.reset()
      return
    }

    void conversations.load(true).catch(() => undefined)

    if (popoutWindow) {
      // 独立窗口不建立第二条 WS，避免同 session 顶掉主窗口连接；
      // 通过 BroadcastChannel 接收主窗口转发的实时事件
      const channel = openBroadcast()
      if (channel) {
        channel.onmessage = (event: MessageEvent) => {
          const payload = event.data as { type: string; data?: unknown }
          switch (payload.type) {
            case 'message.new':
              if (payload.data) conversations.receiveMessage(payload.data as MessageItem)
              break
            case 'message.sync':
              if (payload.data) conversations.receiveMessage(payload.data as MessageItem, true)
              break
            case 'message.recalled':
              if (payload.data) conversations.applyRecall(payload.data as MessageItem)
              break
            case 'typing.received': {
              const data = payload.data as { conversationId: string } | undefined
              if (data) conversations.receiveTyping(data.conversationId)
              break
            }
            case 'conversations.refresh':
              void conversations.refresh().catch(() => undefined)
              break
          }
        }
      }
      return
    }

    const channel = openBroadcast()
    unbindRealtime = conversations.bindRealtime((type, data) => {
      channel?.postMessage({ type, data })
    })
    unbindStatus = wsClient.onStatus((status) => {
      if (status === 'connected') void conversations.refresh().catch(() => undefined)
    })
    wsClient.connect(token)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  unbindRealtime?.()
  unbindStatus?.()
  closeBroadcast()
})
</script>

<template>
  <!-- 主窗口直接铺满整个可视区，页面切换不做过渡，避免动画卡住导致点击无响应 -->
  <div class="app-window flex h-full w-full" :class="compact ? 'login-shell' : ''">
    <RouterView />
  </div>
</template>
