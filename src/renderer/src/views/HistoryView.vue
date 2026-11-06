<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import EmptyState from '@renderer/components/EmptyState.vue'
import ForwardDetailDialog from '@renderer/components/ForwardDetailDialog.vue'
import MediaPreview from '@renderer/components/MediaPreview.vue'
import MessageBubble from '@renderer/components/MessageBubble.vue'
import Toast from '@renderer/components/Toast.vue'
import { useConversationsStore } from '@renderer/stores/conversations'
import type { ChatMessage } from '@renderer/types'

const route = useRoute()
const router = useRouter()
const store = useConversationsStore()

const conversationId = ref(String(route.query.conversation ?? store.activeId))
const member = ref('全部成员')
const toastMessage = ref('')

watch(
  () => route.query.conversation,
  (value) => {
    if (value) conversationId.value = String(value)
  }
)

const conversation = computed(
  () => store.list.find((item) => item.id === conversationId.value) ?? null
)

const memberOptions = computed(() => {
  const names = new Set<string>()
  for (const message of conversation.value?.messages ?? []) {
    if (message.sender) names.add(message.sender)
    else if (message.direction === 'out') names.add('我')
  }
  return ['全部成员', ...names]
})

const filtered = computed(() => {
  const messages = conversation.value?.messages ?? []
  if (member.value === '全部成员') return messages
  return messages.filter(
    (message) => (message.sender ?? (message.direction === 'out' ? '我' : '')) === member.value
  )
})

const counts = computed(() => {
  const result: Record<string, number> = {}
  for (const message of conversation.value?.messages ?? []) {
    const name = message.sender ?? (message.direction === 'out' ? '我' : '系统')
    result[name] = (result[name] ?? 0) + 1
  }
  return result
})

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

function backToChat(): void {
  if (conversation.value) store.setActive(conversation.value.id)
  void router.push('/chats')
}

function exportHistory(): void {
  showToast('聊天记录已导出为 HTML（演示）')
}

onMounted(async () => {
  await store.load()
  if (conversationId.value) await store.loadHistory(conversationId.value)
})
</script>

<template>
  <!-- P14 消息历史：成员筛选 + 消息列表 -->
  <div class="flex h-full w-full">
    <section
      class="flex h-full w-[240px] shrink-0 flex-col overflow-hidden border-r border-divider bg-panel"
    >
      <div class="flex h-[60px] shrink-0 items-center justify-between px-4">
        <h2 class="text-label text-foreground">按成员查看</h2>
        <button
          v-tooltip="'返回会话'"
          type="button"
          class="icon-button h-7 w-7 rounded-sm"
          @click="backToChat"
        >
          <AppIcon name="ion:close" :size="16" />
        </button>
      </div>
      <div class="h-px w-full bg-border" />

      <div class="min-h-0 flex-1 overflow-y-auto py-1">
        <button
          v-for="option in memberOptions"
          :key="option"
          type="button"
          class="flex h-[50px] w-full items-center gap-3 px-3 text-left transition-colors"
          :class="member === option ? 'bg-conv-active' : 'hover:bg-item-hover'"
          @click="member = option"
        >
          <Avatar
            v-if="option !== '全部成员'"
            :name="option"
            :index="((counts[option] ?? 1) % 6) + 1"
            :size="32"
          />
          <span v-else class="flex h-8 w-8 items-center justify-center rounded-md bg-selected-alt">
            <AppIcon name="ion:people" :size="18" class="text-accent" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-small text-foreground">{{ option }}</span>
            <span class="block text-micro text-tertiary-foreground">
              {{
                option === '全部成员'
                  ? `${filtered.length} 条消息`
                  : `${counts[option] ?? 0} 条消息`
              }}
            </span>
          </span>
        </button>
      </div>
    </section>

    <section class="flex h-full min-w-0 flex-1 flex-col bg-tertiary">
      <header
        class="flex h-[60px] shrink-0 items-center justify-between border-b border-divider bg-panel px-5"
      >
        <div class="min-w-0">
          <h2 class="truncate text-section text-foreground">
            {{ conversation?.name || '消息历史' }}
          </h2>
          <p class="truncate text-caption text-secondary-foreground">
            共 {{ filtered.length }} 条消息 · {{ member }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
            @click="exportHistory"
          >
            <AppIcon name="ion:ios-download" :size="14" />
            导出
          </button>
          <button type="button" class="btn-primary h-8 px-3" @click="backToChat">返回会话</button>
        </div>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <EmptyState
          v-if="filtered.length === 0"
          title="暂无历史消息"
          hint="切换成员或返回会话发送一条消息"
        />

        <template v-else>
          <p class="py-2 text-center text-micro text-time-foreground">2026-11-04</p>
          <MessageBubble
            v-for="message in filtered"
            :key="message.id"
            :message="message"
            @open-forward="onForward"
            @preview="onPreview"
            @open-file="showToast(`查看文件：${$event.fileName}`)"
            @open-card="showToast(`查看名片：${$event.cardTitle}`)"
            @vote="showToast('请在会话中参与投票')"
            @play-audio="showToast('正在播放语音…')"
          />
        </template>
      </div>
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
