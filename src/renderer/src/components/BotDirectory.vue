<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import Toast from '@renderer/components/Toast.vue'
import { listBotDirectory, listMyBots } from '@renderer/api/bots'
import type { BotItem, BotSummary } from '@renderer/api/contracts'
import { useAppStore } from '@renderer/stores/app'
import { useConversationsStore } from '@renderer/stores/conversations'
import { avatarIndexOf } from '@renderer/utils/chat'

const router = useRouter()
const app = useAppStore()
const conversations = useConversationsStore()

const keyword = ref('')
const directory = ref<BotSummary[]>([])
const myBots = ref<BotItem[]>([])
const loading = ref(false)
const toastMessage = ref('')

const developerConsoleUrl =
  (import.meta.env.VITE_DEVELOPER_CONSOLE_URL as string | undefined)?.trim() ||
  'https://developer.starrysky.cn'

const visibleBots = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return directory.value
  return directory.value.filter(
    (bot) =>
      bot.nickname.toLowerCase().includes(kw) || (bot.description ?? '').toLowerCase().includes(kw)
  )
})

function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}

async function load(): Promise<void> {
  const token = app.accessToken
  if (!token) return
  loading.value = true
  try {
    const [all, mine] = await Promise.all([
      listBotDirectory(token, keyword.value.trim() || undefined),
      listMyBots(token).catch(() => [])
    ])
    directory.value = all
    myBots.value = mine
  } catch (error) {
    showToast(error instanceof Error ? error.message : '机器人目录加载失败')
  } finally {
    loading.value = false
  }
}

async function startChat(bot: BotSummary | BotItem): Promise<void> {
  try {
    await conversations.openWithBot(bot.botId)
    await router.push('/chats')
    showToast(`已打开与 ${bot.nickname} 的会话`)
  } catch (error) {
    showToast(error instanceof Error ? error.message : '打开机器人会话失败')
  }
}

function openDeveloperConsole(): void {
  window.open(developerConsoleUrl, '_blank')
}

onMounted(load)
</script>

<template>
  <div class="max-w-[760px]">
    <div class="rounded-lg border border-border-soft bg-panel p-4">
      <div class="flex items-start gap-3">
        <div
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-subtle"
        >
          <AppIcon name="ion:android-chat" :size="22" class="text-accent" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-label text-foreground">机器人由开发者后台统一创建和管理</p>
          <p class="mt-1 text-caption text-secondary-foreground">
            客户端只能发现机器人和发起聊天，不能创建或删除机器人。需要新建、修改或下线机器人时，请前往开发者后台。
          </p>
        </div>
        <button
          type="button"
          class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
          @click="openDeveloperConsole"
        >
          <AppIcon name="ion:open-outline" :size="14" />
          开发者后台
        </button>
      </div>
    </div>

    <div class="mt-5 flex items-center gap-2">
      <div class="app-field flex h-9 flex-1 items-center gap-1.5 px-2">
        <AppIcon name="ion:search" :size="14" class="shrink-0 text-placeholder-foreground" />
        <input
          v-model="keyword"
          class="h-full w-full bg-transparent text-small text-foreground outline-none placeholder:text-placeholder-foreground"
          placeholder="搜索机器人昵称或简介"
          @keydown.enter.prevent="load"
        />
      </div>
      <button
        type="button"
        class="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
        :disabled="loading"
        @click="load"
      >
        {{ loading ? '加载中' : '刷新' }}
      </button>
    </div>

    <p class="mt-4 mb-2 text-micro text-tertiary-foreground">
      机器人目录 · {{ visibleBots.length }} 个可用
    </p>

    <div class="grid grid-cols-2 gap-3">
      <div
        v-for="bot in visibleBots"
        :key="bot.botId"
        class="flex flex-col gap-3 rounded-md border border-border-soft bg-panel p-3"
      >
        <div class="flex items-center gap-3">
          <Avatar
            :name="bot.nickname"
            :index="avatarIndexOf(bot.nickname)"
            :avatar-url="bot.avatarUrl"
            :size="40"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-small text-foreground">{{ bot.nickname }}</p>
            <p class="truncate text-micro text-tertiary-foreground">
              {{ bot.description || '暂无简介' }}
            </p>
          </div>
          <span
            class="shrink-0 rounded-sm px-1.5 py-0.5 text-[10px]"
            :class="
              bot.status === 'ACTIVE'
                ? 'bg-conv-active text-status-success'
                : 'bg-item-hover text-tertiary-foreground'
            "
          >
            {{ bot.status === 'ACTIVE' ? '可用' : '已禁用' }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="min-w-0 flex-1 truncate text-micro text-tertiary-foreground">
            ID: {{ bot.botId }}
          </span>
          <button
            type="button"
            class="btn-primary h-7 px-3 text-micro"
            :disabled="bot.status !== 'ACTIVE'"
            @click="startChat(bot)"
          >
            开始聊天
          </button>
        </div>
      </div>
    </div>

    <p
      v-if="!loading && visibleBots.length === 0"
      class="mt-8 text-center text-caption text-tertiary-foreground"
    >
      暂无可用机器人，请先让开发者在后台创建。
    </p>

    <template v-if="myBots.length > 0">
      <p class="mt-8 mb-2 text-micro text-tertiary-foreground">
        当前账号在开发者后台拥有的机器人 · {{ myBots.length }} 个（只读）
      </p>
      <div class="flex flex-col rounded-md border border-border-soft bg-panel">
        <div
          v-for="bot in myBots"
          :key="bot.botId"
          class="flex h-12 items-center gap-3 border-b border-divider px-3 last:border-b-0"
        >
          <Avatar
            :name="bot.nickname"
            :index="avatarIndexOf(bot.nickname)"
            :avatar-url="bot.avatarUrl"
            :size="32"
          />
          <span class="min-w-0 flex-1 truncate text-small text-foreground">{{ bot.nickname }}</span>
          <span class="shrink-0 text-micro text-tertiary-foreground">AppID: {{ bot.appId }}</span>
          <button
            type="button"
            class="shrink-0 text-micro text-link hover:text-link-hover disabled:text-tertiary-foreground"
            :disabled="bot.status !== 'ACTIVE'"
            @click="startChat(bot)"
          >
            {{ bot.status === 'ACTIVE' ? '聊天' : '已禁用' }}
          </button>
        </div>
      </div>
      <p class="mt-2 text-micro text-tertiary-foreground">
        机器人资料、凭证、事件订阅和删除操作请在开发者后台完成。
      </p>
    </template>

    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
