<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import EmptyState from '@renderer/components/EmptyState.vue'
import ForwardDetailDialog from '@renderer/components/ForwardDetailDialog.vue'
import MediaPreview from '@renderer/components/MediaPreview.vue'
import SearchBar from '@renderer/components/SearchBar.vue'
import MessageBubble from '@renderer/components/MessageBubble.vue'
import Toast from '@renderer/components/Toast.vue'
import { useConversationsStore } from '@renderer/stores/conversations'
import type { ChatMessage } from '@renderer/types'

const route = useRoute()
const router = useRouter()
const store = useConversationsStore()

const keyword = ref(String(route.query.keyword ?? ''))
const selectedId = ref('')
const toastMessage = ref('')

const results = computed(() => store.searchMessages(keyword.value))
const selected = computed(
  () => results.value.find((item) => item.messageId === selectedId.value) ?? null
)

const conversation = computed(() =>
  selected.value ? store.list.find((item) => item.id === selected.value?.conversationId) : null
)

const contextMessages = computed(() => {
  if (!conversation.value || !selected.value) return []
  const messages = conversation.value.messages
  const index = messages.findIndex((item) => item.id === selected.value?.messageId)
  if (index < 0) return messages.slice(0, 6)
  return messages.slice(Math.max(0, index - 2), index + 3)
})

watch(keyword, () => {
  selectedId.value = ''
})

watch(
  results,
  (list) => {
    if (list.length > 0 && !selectedId.value) selectedId.value = list[0].messageId
  },
  { immediate: true }
)

const suggestions = ['评审', '设计规范', '打包脚本', '群公告']

const showForwardDetail = ref(false)
const forwardDetail = ref<ChatMessage | null>(null)
const showPreview = ref(false)
const previewIndex = ref(0)

const images = computed(
  () => conversation.value?.messages.filter((item) => item.kind === 'image') ?? []
)

function onForward(message: ChatMessage): void {
  forwardDetail.value = message
  showForwardDetail.value = true
}

function onPreview(message: ChatMessage): void {
  previewIndex.value = Math.max(
    0,
    images.value.findIndex((item) => item.id === message.id)
  )
  showPreview.value = true
}

function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}

function locate(): void {
  if (!selected.value) return
  store.setActive(selected.value.conversationId)
  store.setHighlight(selected.value.messageId)
  void router.push('/chats')
  showToast('已在会话中定位该消息')
}

function openContext(item: { conversationId: string; messageId: string }): void {
  store.setActive(item.conversationId)
  store.setHighlight(item.messageId)
  void router.push('/chats')
}
</script>

<template>
  <!-- P10 聊天记录搜索：261 结果面板 + 959 上下文区 -->
  <div class="flex h-full w-full">
    <section
      class="flex h-full w-panel shrink-0 flex-col overflow-hidden border-r border-divider bg-tertiary"
    >
      <SearchBar v-model="keyword" placeholder="搜索聊天记录" :show-add="false" />

      <div class="px-4 pb-2 text-micro text-secondary-foreground">
        {{ keyword.trim() ? `找到 ${results.length} 条相关消息` : '输入关键字检索全部会话' }}
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <button
          v-for="item in results"
          :key="item.messageId"
          type="button"
          class="list-row h-row w-panel text-left"
          :class="selectedId === item.messageId ? 'bg-conv-active' : ''"
          @click="selectedId = item.messageId"
        >
          <Avatar :name="item.conversationName" :index="item.avatarIndex" :size="32" />
          <span class="min-w-0 flex-1">
            <span class="flex items-baseline justify-between gap-2">
              <span class="truncate text-base text-foreground">{{ item.conversationName }}</span>
              <span class="shrink-0 text-micro text-time-foreground">{{ item.time }}</span>
            </span>
            <span class="mt-0.5 block truncate text-caption text-tertiary-foreground">
              {{ item.sender }}：{{ item.text }}
            </span>
          </span>
        </button>

        <div
          v-if="keyword.trim() && results.length === 0"
          class="mt-8 flex flex-col items-center gap-2"
        >
          <AppIcon name="ion:search" :size="28" class="text-icon" />
          <p class="text-caption text-tertiary-foreground">没有找到相关消息</p>
        </div>

        <div v-if="!keyword.trim()" class="px-4 pt-2">
          <p class="mb-2 text-micro text-tertiary-foreground">最近搜索</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="item in suggestions"
              :key="item"
              type="button"
              class="rounded-full border border-soft px-3 py-1 text-micro text-secondary-foreground transition-colors hover:bg-item-hover hover:text-foreground"
              @click="keyword = item"
            >
              {{ item }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="flex h-full min-w-0 flex-1 flex-col bg-tertiary">
      <EmptyState
        v-if="!selected"
        title="搜索聊天记录"
        hint="在左侧输入关键字，查看上下文并定位消息"
      />

      <template v-else>
        <header
          class="flex h-[60px] shrink-0 items-center justify-between border-b border-divider bg-panel px-5"
        >
          <div class="min-w-0">
            <h2 class="truncate text-section text-foreground">{{ conversation?.name }}</h2>
            <p class="truncate text-caption text-secondary-foreground">
              命中消息：{{ selected.text }}
            </p>
          </div>
          <button type="button" class="btn-primary h-8 px-3" @click="locate">在会话中查看</button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <p class="mb-3 text-center text-micro text-time-foreground">消息上下文</p>
          <div v-for="message in contextMessages" :key="message.id" class="rounded-md">
            <MessageBubble
              :message="message"
              :highlight="message.id === selected.messageId"
              @open-forward="onForward"
              @preview="onPreview"
              @open-file="showToast(`查看文件：${$event.fileName}`)"
              @open-card="showToast(`查看名片：${$event.cardTitle}`)"
              @vote="showToast('请在会话中参与投票')"
              @play-audio="showToast('正在播放语音…')"
            />
          </div>
          <div class="mt-2 flex justify-center">
            <button type="button" class="btn-primary h-8 px-4" @click="openContext(selected)">
              在会话中定位
            </button>
          </div>
        </div>
      </template>
    </section>

    <ForwardDetailDialog
      :visible="showForwardDetail"
      :message="forwardDetail"
      @close="showForwardDetail = false"
    />

    <MediaPreview
      :visible="showPreview"
      :images="images"
      :index="previewIndex"
      @close="showPreview = false"
    />

    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
