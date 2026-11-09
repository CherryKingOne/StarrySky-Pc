<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { RouterView } from 'vue-router'
import { useAppStore } from '@renderer/stores/app'
import { useAgentsStore } from '@renderer/stores/agents'
import { useConversationsStore } from '@renderer/stores/conversations'
import { wsClient } from '@renderer/api/ws'
import { setTokenRefresher } from '@renderer/api/http'
import type { MessageItem } from '@renderer/api/contracts'
import { isAgentWindow, isLoginWindow, isPopoutWindow } from '@renderer/utils/window'

const REALTIME_CHANNEL = 'starrysky-realtime'
const app = useAppStore()
const agents = useAgentsStore()
const conversations = useConversationsStore()
const compact = isLoginWindow()
const popoutWindow = isPopoutWindow()
const agentWindow = isAgentWindow()

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

/**
 * 窗口重新获得焦点时刷新会话列表：拉群、入群等成员变化没有 WebSocket 事件，
 * 不刷新的话新群会话（尤其 Agent 未授权 GROUP 白名单时）不会出现在列表里。
 */
let lastFocusRefresh = 0
function onWindowFocus(): void {
  if (!app.accessToken || document.visibilityState !== 'visible') return
  const now = Date.now()
  if (now - lastFocusRefresh < 5000) return
  lastFocusRefresh = now
  void conversations.refresh().catch(() => undefined)
}
window.addEventListener('focus', onWindowFocus)
document.addEventListener('visibilitychange', onWindowFocus)

/** 实时事件频道按身份隔离：用户窗口与 Agent 窗口互不串消息 */
function realtimeChannelName(): string {
  return `${REALTIME_CHANNEL}:${app.actingAgent?.agentId || 'user'}`
}

function closeBroadcast(): void {
  broadcastChannel?.close()
  broadcastChannel = undefined
}

function openBroadcast(): BroadcastChannel | undefined {
  if (typeof BroadcastChannel === 'undefined') return undefined
  broadcastChannel = new BroadcastChannel(realtimeChannelName())
  return broadcastChannel
}

let previousToken = ''

watch(
  () => app.accessToken,
  (token) => {
    unbindRealtime?.()
    unbindRealtime = undefined
    unbindStatus?.()
    unbindStatus = undefined
    closeBroadcast()

    const switched = Boolean(previousToken) && previousToken !== token
    previousToken = token

    // 独立会话窗口与 Agent 窗口不刷新 Token，避免轮换后使主窗口的 refreshToken 失效
    setTokenRefresher(
      !popoutWindow && !agentWindow && token ? () => app.refreshAccessToken() : null
    )

    if (!token) {
      wsClient.disconnect()
      conversations.reset()
      return
    }

    // 身份发生变化时先清空旧身份的会话与选中态，避免旧数据残留造成“切了却没变”
    if (switched) conversations.reset()

    // 主窗口启动时加载 Agent 列表；Agent 独立窗口的身份已在挂载前初始化
    if (!compact && !popoutWindow && !agentWindow) void agents.init()

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
  window.removeEventListener('focus', onWindowFocus)
  document.removeEventListener('visibilitychange', onWindowFocus)
})
</script>

<template>
  <!-- 主窗口直接铺满整个可视区，页面切换不做过渡，避免动画卡住导致点击无响应 -->
  <div class="app-window flex h-full w-full" :class="compact ? 'login-shell' : ''">
    <RouterView />
  </div>
</template>
