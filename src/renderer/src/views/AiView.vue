<script setup lang="ts">
import { nextTick, ref } from 'vue'
import MessageBubble from '@renderer/components/MessageBubble.vue'
import MessageInput from '@renderer/components/MessageInput.vue'
import type { ChatMessage } from '@renderer/types'

let sequence = 1

const now = (): string => {
  const date = new Date()
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function build(direction: ChatMessage['direction'], text: string): ChatMessage {
  return {
    id: `ai-${sequence++}`,
    direction,
    kind: 'text',
    time: now(),
    text
  }
}

const messages = ref<ChatMessage[]>([
  build('in', '你好，我是野火 AI 助手。可以帮你检索企业知识库、整理会议纪要、生成文案。')
])

const scrollArea = ref<HTMLDivElement | null>(null)

const replies = [
  '已为你整理好要点：1. 会话列表行高统一为 68px；2. 输入区工具条顺序已对齐设计稿。',
  '检索到相关知识库条目 3 条，已在企业知识库中为你生成摘要。',
  '这段内容已按「背景 / 进展 / 风险」结构重写，可直接粘贴到周报中。',
  '好的，已记录。需要我补充数据支撑或调整语气吗？'
]
let replyIndex = 0

async function scrollToBottom(): Promise<void> {
  await nextTick()
  const el = scrollArea.value
  if (el) el.scrollTop = el.scrollHeight
}

function onSend(text: string): void {
  messages.value.push(build('out', text))
  void scrollToBottom()
  window.setTimeout(() => {
    messages.value.push(build('in', replies[replyIndex % replies.length]))
    replyIndex += 1
    void scrollToBottom()
  }, 900)
}
</script>

<template>
  <!-- AI 对话区：右侧 1220 宽，标题 + 消息流 + 输入区 -->
  <div class="flex h-full w-full flex-col bg-tertiary">
    <header class="flex h-[60px] shrink-0 items-center border-b border-divider bg-panel px-6">
      <div>
        <h2 class="text-section text-foreground">AI 助手</h2>
        <p class="text-caption text-secondary-foreground">基于企业知识库的智能问答</p>
      </div>
    </header>

    <div ref="scrollArea" class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-3">
      <div class="px-[62px]">
        <div
          v-for="(message, index) in messages"
          :key="message.id"
        >
          <div
            v-if="index === 0 || messages[index - 1].time !== message.time"
            class="py-2 text-center text-micro text-time-foreground"
          >
            今天 {{ message.time }}
          </div>
          <MessageBubble :message="message" />
        </div>
      </div>
    </div>

    <MessageInput @send="onSend" />
  </div>
</template>
