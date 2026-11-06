<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import AppIconButton from '@renderer/components/IconButton.vue'
import CallOverlay from '@renderer/components/CallOverlay.vue'
import ConfirmDialog from '@renderer/components/ConfirmDialog.vue'
import DatePickerDialog from '@renderer/components/DatePickerDialog.vue'
import ForwardDialog from '@renderer/components/ForwardDialog.vue'
import MessageBubble from '@renderer/components/MessageBubble.vue'
import MessageInput from '@renderer/components/MessageInput.vue'
import StatsDialog from '@renderer/components/StatsDialog.vue'
import Toast from '@renderer/components/Toast.vue'
import type { CallMode, ChatMessage, Conversation } from '@renderer/types'

const router = useRouter()

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

const greeting = build(
  'in',
  '你好，我是野火 AI 助手。可以帮你检索企业知识库、整理会议纪要、生成文案。'
)

const messages = ref<ChatMessage[]>([greeting])

const scrollArea = ref<HTMLDivElement | null>(null)
const toastMessage = ref('')
const showClear = ref(false)
const showStats = ref(false)
const showCall = ref(false)
const callMode = ref<CallMode>('audio')
const showSchedule = ref(false)
const showForward = ref(false)
const forwardLines = ref<string[]>([])

const replies = [
  '已为你整理好要点：1. 会话列表行高统一为 68px；2. 输入区工具条顺序已对齐设计稿。',
  '检索到相关知识库条目 3 条，已在企业知识库中为你生成摘要。',
  '这段内容已按「背景 / 进展 / 风险」结构重写，可直接粘贴到周报中。',
  '好的，已记录。需要我补充数据支撑或调整语气吗？'
]
let replyIndex = 0

const quickPrompts = ['整理今天的评审结论', '检索设计规范 v2.0', '生成周报草稿', '总结未读消息']

const pseudoConversation = computed<Conversation>(() => ({
  id: 'ai',
  name: 'AI 助手',
  avatarIndex: 1,
  preview: '',
  time: '',
  unread: 0,
  messages: messages.value
}))

async function scrollToBottom(): Promise<void> {
  await nextTick()
  const el = scrollArea.value
  if (el) el.scrollTop = el.scrollHeight
}

function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}

function pushAnswer(question: string): void {
  messages.value.push(build('out', question))
  void scrollToBottom()
  window.setTimeout(() => {
    messages.value.push(build('in', replies[replyIndex % replies.length]))
    replyIndex += 1
    void scrollToBottom()
  }, 900)
}

function onSend(text: string): void {
  pushAnswer(text)
}

function newChat(): void {
  messages.value = [build('in', '新的对话已开始，你可以继续向我提问。')]
  showToast('已新建对话')
}

function clearChat(): void {
  showClear.value = false
  messages.value = [build('in', '对话记录已清空，可以开始新的提问。')]
  showToast('对话记录已清空')
}

function sendFile(payload: { name: string; size: string }): void {
  messages.value.push({
    id: `ai-${sequence++}`,
    direction: 'out',
    kind: 'file',
    time: now(),
    fileName: payload.name,
    fileSize: payload.size
  })
  showToast('文件已提交给 AI 助手分析')
  void scrollToBottom()
}

function sendImage(payload: { name: string }): void {
  messages.value.push({
    id: `ai-${sequence++}`,
    direction: 'out',
    kind: 'image',
    time: now(),
    imageLabel: payload.name,
    imageTone: 2
  })
  showToast('图片已提交给 AI 助手识别')
  void scrollToBottom()
}

function sendAudio(payload: { duration: string }): void {
  messages.value.push({
    id: `ai-${sequence++}`,
    direction: 'out',
    kind: 'audio',
    time: now(),
    duration: payload.duration
  })
  showToast('语音已转写并提交给 AI 助手')
  void scrollToBottom()
}

function sendPoll(): void {
  messages.value.push({
    id: `ai-${sequence++}`,
    direction: 'out',
    kind: 'poll',
    time: now(),
    text: '本周评审时间投票',
    options: [
      { label: '周五 15:00（设计评审）', votes: 1 },
      { label: '周四 10:00（需求预评审）', votes: 0 }
    ]
  })
  showToast('投票已创建')
  void scrollToBottom()
}

function sendCard(): void {
  messages.value.push({
    id: `ai-${sequence++}`,
    direction: 'out',
    kind: 'card',
    time: now(),
    cardTitle: '林晓',
    cardSubtitle: '产品经理',
    cardDesc: '个人名片 · 野火科技',
    cardIcon: 'ion:person'
  })
  showToast('名片已发送')
  void scrollToBottom()
}

function openForward(): void {
  const last = [...messages.value].reverse().find((item) => item.direction === 'in')
  forwardLines.value = last ? [`AI 助手：${last.text ?? ''}`] : ['AI 助手：暂无内容']
  showForward.value = true
}

function startAiCall(mode: CallMode): void {
  callMode.value = mode
  showCall.value = true
}

function onScheduleConfirm(value: string): void {
  showToast(`已创建 ${value} 的日程`)
  showSchedule.value = false
}

function onAction(key: string): void {
  switch (key) {
    case 'history':
      showStats.value = true
      break
    case 'files':
      void router.push('/files')
      break
    case 'stats':
      showStats.value = true
      break
    case 'schedule':
      showSchedule.value = true
      break
    case 'clear':
      showClear.value = true
      break
    default:
      showToast('操作已完成')
  }
}
</script>

<template>
  <!-- P18 AI 助手：标题 + 消息流 + 输入区 -->
  <div class="flex h-full w-full flex-col bg-tertiary">
    <header
      class="flex h-[60px] shrink-0 items-center justify-between border-b border-divider bg-panel px-6"
    >
      <div class="min-w-0">
        <h2 class="truncate text-section text-foreground">AI 助手</h2>
        <p class="truncate text-caption text-secondary-foreground">基于企业知识库的智能问答</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
          @click="openForward"
        >
          <AppIcon name="ion:ios-redo" :size="14" />
          转发结果
        </button>
        <button
          type="button"
          class="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
          @click="showStats = true"
        >
          <AppIcon name="ion:stats-bars" :size="14" />
          统计
        </button>
        <AppIconButton
          icon="ion:android-add"
          :size="18"
          :box="32"
          label="新建对话"
          @click="newChat"
        />
        <AppIconButton
          icon="ion:ios-trash"
          :size="18"
          :box="32"
          label="清空对话"
          @click="showClear = true"
        />
      </div>
    </header>

    <div
      ref="scrollArea"
      class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-3"
    >
      <div class="px-[62px]">
        <div v-for="(message, index) in messages" :key="message.id">
          <div
            v-if="index === 0 || messages[index - 1].time !== message.time"
            class="py-2 text-center text-micro text-time-foreground"
          >
            今天 {{ message.time }}
          </div>
          <MessageBubble
            :message="message"
            @preview="showToast('查看图片')"
            @open-file="showToast(`查看文件：${$event.fileName}`)"
            @open-forward="openForward"
            @vote="showToast('已投票')"
            @play-audio="showToast('正在播放语音…')"
          />
        </div>

        <div class="mb-4 flex flex-wrap gap-2">
          <button
            v-for="prompt in quickPrompts"
            :key="prompt"
            type="button"
            class="rounded-full border border-soft bg-panel px-3 py-1 text-micro text-secondary-foreground transition-colors hover:border-accent hover:text-foreground"
            @click="pushAnswer(prompt)"
          >
            {{ prompt }}
          </button>
        </div>
      </div>
    </div>

    <MessageInput
      title="AI 助手"
      @send="onSend"
      @toast="showToast"
      @send-file="sendFile"
      @send-image="sendImage"
      @send-audio="sendAudio"
      @send-poll="sendPoll"
      @send-card="sendCard"
      @request-forward="openForward"
      @open-favorites="router.push('/favorites')"
      @call="startAiCall"
      @action="onAction"
    />

    <ConfirmDialog
      :visible="showClear"
      title="清空对话"
      description="清空后当前对话记录将被删除，确定继续吗？"
      confirm-text="清空"
      danger
      @cancel="showClear = false"
      @confirm="clearChat"
    />

    <StatsDialog
      :visible="showStats"
      :conversation="pseudoConversation"
      @close="showStats = false"
    />

    <ForwardDialog
      :visible="showForward"
      :lines="forwardLines"
      @close="showForward = false"
      @sent="showToast('AI 回复已转发')"
    />

    <DatePickerDialog
      :visible="showSchedule"
      title="设置日程"
      @close="showSchedule = false"
      @confirm="onScheduleConfirm"
    />

    <CallOverlay
      :visible="showCall"
      :mode="callMode"
      title="AI 语音助手"
      :avatar-index="1"
      @close="showCall = false"
      @toast="showToast"
    />

    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
