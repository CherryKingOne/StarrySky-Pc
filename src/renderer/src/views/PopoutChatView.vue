<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import CallOverlay from '@renderer/components/CallOverlay.vue'
import ConfirmDialog from '@renderer/components/ConfirmDialog.vue'
import ForwardDialog from '@renderer/components/ForwardDialog.vue'
import MediaPreview from '@renderer/components/MediaPreview.vue'
import MessageBubble from '@renderer/components/MessageBubble.vue'
import MessageInput from '@renderer/components/MessageInput.vue'
import MessageContextDialog from '@renderer/components/MessageContextDialog.vue'
import StatsDialog from '@renderer/components/StatsDialog.vue'
import Toast from '@renderer/components/Toast.vue'
import { useAppStore } from '@renderer/stores/app'
import { useConversationsStore } from '@renderer/stores/conversations'
import { avatarIndexOf, shouldShowMessageTime } from '@renderer/utils/chat'
import { hasElectron, isPopoutWindow, sendWindowAction } from '@renderer/utils/window'
import type { CallMode, ChatMessage } from '@renderer/types'

const route = useRoute()
const router = useRouter()
const store = useConversationsStore()
const app = useAppStore()

const id = String(route.params.id ?? '')
const toastMessage = ref('')
const scrollArea = ref<HTMLDivElement | null>(null)
const replyTo = ref<{ sender: string; text: string } | null>(null)
const showForward = ref(false)
const showPreview = ref(false)
const previewIndex = ref(0)
const showCall = ref(false)
const callMode = ref<CallMode>('audio')
const showStats = ref(false)
const showContext = ref(false)
const showClear = ref(false)

const conversation = computed(() => store.list.find((item) => item.id === id) ?? null)
const selfAvatar = computed(() => ({
  name: app.nickname || '我',
  index: app.avatarIndex,
  avatarUrl: app.user?.avatarUrl ?? null
}))

function senderAvatarOf(message: ChatMessage): {
  name: string
  index: number
  avatarUrl: string | null
} {
  const current = conversation.value
  if (!current) return { name: message.sender || '对方', index: 1, avatarUrl: null }
  if (current.bot && message.senderId === current.bot.botId) {
    return {
      name: current.bot.nickname,
      index: current.avatarIndex,
      avatarUrl: current.bot.avatarUrl
    }
  }
  if (message.senderId) {
    const profile = store.profiles[message.senderId]
    if (profile) {
      return {
        name: profile.nickname,
        index: avatarIndexOf(profile.nickname),
        avatarUrl: profile.avatarUrl
      }
    }
  }
  return {
    name: message.sender || current.name,
    index: current.avatarIndex,
    avatarUrl: current.avatarUrl ?? null
  }
}

const images = computed(
  () => conversation.value?.messages.filter((message) => message.kind === 'image') ?? []
)

function backToMain(): void {
  if (isPopoutWindow() && hasElectron()) {
    sendWindowAction('window:close')
    return
  }
  void router.push('/chats')
}

onMounted(async () => {
  await store.load().catch(() => undefined)
  if (!conversation.value) {
    if (isPopoutWindow() && hasElectron()) {
      sendWindowAction('window:close')
      return
    }
    void router.replace('/chats')
    return
  }
  await store.setActive(id)
  void scrollToBottom()
})

function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}

async function scrollToBottom(): Promise<void> {
  await nextTick()
  if (scrollArea.value) scrollArea.value.scrollTop = scrollArea.value.scrollHeight
}

async function onSend(text: string): Promise<void> {
  const quoted = replyTo.value
  replyTo.value = null
  const payload = quoted ? `回复 ${quoted.sender}：${quoted.text}\n${text}` : text
  try {
    await store.sendMessage(payload)
    await scrollToBottom()
  } catch (error) {
    showToast(error instanceof Error ? error.message : '消息发送失败')
  }
}

function onTyping(): void {
  store.sendTyping(id)
}

function openPreview(message: ChatMessage): void {
  previewIndex.value = Math.max(
    0,
    images.value.findIndex((item) => item.id === message.id)
  )
  showPreview.value = true
}

function onVote(message: ChatMessage, index: number): void {
  const votes = store.vote(id, message.id, index)
  if (votes === undefined) showToast('你已经投过票了')
  else showToast(`已投票，当前 ${votes} 票`)
}

function onAction(key: string): void {
  switch (key) {
    case 'history':
      // popout=1：历史页保留主应用侧栏，返回时回到当前独立会话窗口
      void router.push({ path: '/history', query: { conversation: id, popout: '1' } })
      break
    case 'files':
      void router.push('/files')
      break
    case 'stats':
      showStats.value = true
      break
    case 'schedule':
      showToast('已打开日程（可在工作台查看）')
      break
    case 'clear':
      showClear.value = true
      break
    default:
      showToast('操作已完成')
  }
}

async function sendFileMsg(payload: { name: string; size: string; file: File }): Promise<void> {
  try {
    await store.sendFileAttachment(id, payload.file)
    await scrollToBottom()
  } catch (error) {
    showToast(error instanceof Error ? error.message : '文件上传失败')
  }
}

async function sendImageMsg(payload: { name: string; file: File }): Promise<void> {
  try {
    await store.sendImageFile(id, payload.file)
    await scrollToBottom()
  } catch (error) {
    showToast(error instanceof Error ? error.message : '图片上传失败')
  }
}

async function sendAudioMsg(payload: { duration: string; blob?: Blob }): Promise<void> {
  if (!payload.blob) {
    showToast('未录制到音频')
    return
  }
  const [minutes, seconds] = payload.duration.split(':').map((value) => Number(value))
  try {
    await store.sendAudioBlob(id, payload.blob, minutes * 60 + seconds)
    await scrollToBottom()
  } catch (error) {
    showToast(error instanceof Error ? error.message : '语音发送失败')
  }
}

function sendPollMsg(): void {
  store.sendPoll(id, '本周评审时间投票')
  showToast('投票能力后端暂未开放，当前为本地演示')
  void scrollToBottom()
}

async function sendCardMsg(): Promise<void> {
  try {
    await store.sendCard(id, '林晓', '产品经理')
    await scrollToBottom()
  } catch (error) {
    showToast(error instanceof Error ? error.message : '名片发送失败')
  }
}

function startCall(mode: CallMode): void {
  callMode.value = mode
  showCall.value = true
}

function replyToMessage(message: ChatMessage): void {
  replyTo.value = {
    sender: message.sender ?? conversation.value?.name ?? '对方',
    text: message.text ?? ''
  }
}

function confirmClear(): void {
  showClear.value = false
  store.clearMessages(id)
  showToast('聊天记录已清空')
}

function locateContext(conversationId: string): void {
  showContext.value = false
  store.setActive(conversationId)
  const first = conversation.value?.messages[0]
  if (first) store.setHighlight(first.id)
  showToast('已定位到该会话')
}
</script>

<template>
  <!-- P09 独立聊天窗：无侧栏的独立会话窗口 -->
  <div v-if="conversation" class="flex h-full w-full flex-col bg-tertiary">
    <header class="flex h-[60px] shrink-0 items-center gap-3 border-b border-divider bg-panel px-4">
      <button
        v-tooltip="'返回主窗口'"
        type="button"
        class="icon-button h-8 w-8 rounded-md"
        @click="backToMain"
      >
        <AppIcon name="ion:ios-arrow-left" :size="20" />
      </button>
      <Avatar :name="conversation.name" :index="conversation.avatarIndex" :size="36" />
      <div class="min-w-0 flex-1">
        <h2 class="truncate text-section text-foreground">{{ conversation.name }}</h2>
        <p class="truncate text-caption text-secondary-foreground">
          {{
            conversation.group
              ? `${conversation.members?.length ?? 0} 位成员`
              : !conversation.bot && conversation.targetUserId === app.user?.userId
                ? '与自己的会话 · 备忘 / 文件传输'
                : '独立聊天窗'
          }}
        </p>
      </div>
      <button
        v-tooltip="'会话信息'"
        type="button"
        class="icon-button h-8 w-8 rounded-md"
        @click="showContext = true"
      >
        <AppIcon name="ion:information-circle-outline" :size="20" />
      </button>
      <button
        v-tooltip="'合并转发'"
        type="button"
        class="icon-button h-8 w-8 rounded-md"
        @click="showForward = true"
      >
        <AppIcon name="ion:chatboxes" :size="20" />
      </button>
    </header>

    <div ref="scrollArea" class="min-h-0 flex-1 overflow-y-auto px-6 py-3">
      <div v-for="(message, index) in conversation.messages" :key="message.id">
        <div
          v-if="shouldShowMessageTime(message, conversation.messages[index - 1])"
          class="py-2 text-center text-micro text-time-foreground"
        >
          {{ message.time }}
        </div>
        <MessageBubble
          :message="message"
          :highlight="message.id === store.highlightId"
          :self-avatar="selfAvatar"
          :sender-avatar="senderAvatarOf(message)"
          @preview="openPreview"
          @open-file="showToast(`打开文件：${$event.fileName}`)"
          @open-forward="showForward = true"
          @open-card="showToast(`查看名片：${$event.cardTitle}`)"
          @vote="onVote(message, $event)"
          @play-audio="showToast('正在播放语音…')"
          @contextmenu="replyToMessage(message)"
        />
      </div>
    </div>

    <MessageInput
      :title="conversation.name"
      :reply-to="replyTo"
      @send="onSend"
      @typing="onTyping"
      @toast="showToast"
      @clear-reply="replyTo = null"
      @send-file="sendFileMsg"
      @send-image="sendImageMsg"
      @send-audio="sendAudioMsg"
      @send-poll="sendPollMsg"
      @send-card="sendCardMsg"
      @request-forward="showForward = true"
      @open-favorites="router.push('/favorites')"
      @call="startCall"
      @action="onAction"
    />

    <MediaPreview
      :visible="showPreview"
      :images="images"
      :index="previewIndex"
      @close="showPreview = false"
    />

    <ForwardDialog
      :visible="showForward"
      :lines="
        conversation.messages
          .slice(-3)
          .map((item) => `${item.sender ?? '我'}：${item.text ?? item.fileName ?? ''}`)
      "
      @close="showForward = false"
      @sent="showToast('已转发聊天记录')"
    />

    <CallOverlay
      :visible="showCall"
      :mode="callMode"
      :title="conversation.name"
      :avatar-index="conversation.avatarIndex"
      :members="conversation.members ?? []"
      @close="showCall = false"
      @toast="showToast"
    />

    <StatsDialog :visible="showStats" :conversation="conversation" @close="showStats = false" />

    <MessageContextDialog
      :visible="showContext"
      :conversation-id="id"
      @close="showContext = false"
      @locate="locateContext"
    />

    <ConfirmDialog
      :visible="showClear"
      title="清空聊天记录"
      description="清空后当前会话的本地记录将被删除，且无法恢复。"
      confirm-text="清空"
      danger
      @cancel="showClear = false"
      @confirm="confirmClear"
    />

    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
