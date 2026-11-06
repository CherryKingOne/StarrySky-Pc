<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import ChatHeader from '@renderer/components/ChatHeader.vue'
import ConversationItem from '@renderer/components/ConversationItem.vue'
import InfoPanel from '@renderer/components/InfoPanel.vue'
import MessageBubble from '@renderer/components/MessageBubble.vue'
import MessageInput from '@renderer/components/MessageInput.vue'
import SearchBar from '@renderer/components/SearchBar.vue'
import { useConversationsStore } from '@renderer/stores/conversations'

const store = useConversationsStore()

const keyword = ref('')
const pinned = ref(false)
const showInfo = ref(false)
const searchBarRef = ref<InstanceType<typeof SearchBar> | null>(null)
const scrollArea = ref<HTMLDivElement | null>(null)

/** P04/P03 会话列表面板：按关键字过滤会话 */
const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return store.list
  return store.list.filter(
    (item) =>
      item.name.toLowerCase().includes(kw) || item.preview.toLowerCase().includes(kw)
  )
})

const active = computed(() => store.activeConversation)

/** P06 会话详情：群成员信息 */
const members = [
  { name: '林晓', index: 1 },
  { name: '陈默', index: 5 },
  { name: '王芳', index: 2 },
  { name: '安子', index: 3 },
  { name: '张三', index: 6 }
]

function formatTime(time: string): string {
  return /^\d{1,2}:\d{2}$/.test(time) ? `今天 ${time}` : time
}

function selectConversation(id: string): void {
  store.setActive(id)
}

async function scrollToBottom(): Promise<void> {
  await nextTick()
  const el = scrollArea.value
  if (el) el.scrollTop = el.scrollHeight
}

watch(() => active.value.id, scrollToBottom)
watch(() => active.value.messages.length, scrollToBottom)

function onSend(text: string): void {
  store.sendMessage(text)
  void scrollToBottom()
  window.setTimeout(() => {
    store.simulateReply()
    void scrollToBottom()
  }, 900)
}

function onHeaderSearch(): void {
  searchBarRef.value?.focus()
}

function onHeaderPin(): void {
  pinned.value = !pinned.value
}

function onHeaderSettings(): void {
  showInfo.value = !showInfo.value
}
</script>

<template>
  <!-- P03 会话与聊天 / P06 会话详情：261 会话面板 + 聊天区（+266 信息面板） -->
  <div class="flex h-full w-full">
    <!-- 会话列表面板 -->
    <section
      class="flex h-full w-panel shrink-0 flex-col overflow-hidden border-r border-divider bg-tertiary"
    >
      <SearchBar ref="searchBarRef" v-model="keyword" @add="keyword = ''" />

      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <ConversationItem
          v-for="conversation in filtered"
          :key="conversation.id"
          :conversation="conversation"
          :active="conversation.id === active.id"
          @click="selectConversation(conversation.id)"
        />
      </div>
    </section>

    <!-- 聊天区 -->
    <section class="flex h-full min-w-0 flex-1 flex-col bg-tertiary">
      <ChatHeader
        :title="active.name"
        :subtitle="active.group ? '5 位成员' : '在线'"
        :pinned="pinned"
        @search="onHeaderSearch"
        @pin="onHeaderPin"
        @settings="onHeaderSettings"
      />

      <!-- 消息列表 -->
      <div ref="scrollArea" class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-3">
        <div
          v-for="(message, index) in active.messages"
          :key="message.id"
        >
          <div
            v-if="index === 0 || formatTime(active.messages[index - 1].time) !== formatTime(message.time)"
            class="py-2 text-center text-micro text-time-foreground"
          >
            {{ formatTime(message.time) }}
          </div>
          <MessageBubble :message="message" />
        </div>
      </div>

      <MessageInput @send="onSend" />
    </section>

    <!-- P06 会话详情信息面板 -->
    <InfoPanel
      v-if="showInfo && active.group"
      :title="active.name"
      :subtitle="'5 位成员'"
      :avatar-index="active.avatarIndex"
      :members="members"
      notice="本周五下午 15:00 进行版本评审，请提前提交设计稿。"
      @close="showInfo = false"
    />
  </div>
</template>
