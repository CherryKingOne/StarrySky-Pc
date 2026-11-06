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
import { useConversationsStore } from '@renderer/stores/conversations'
import type { CallMode, ChatMessage } from '@renderer/types'

const route = useRoute()
const router = useRouter()
const store = useConversationsStore()

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
const images = computed(
  () => conversation.value?.messages.filter((message) => message.kind === 'image') ?? []
)

onMounted(() => {
  if (!conversation.value) {
    void router.replace('/chats')
    return
  }
  store.setActive(id)
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

function onSend(text: string): void {
  store.sendMessage(text, replyTo.value?.text)
  replyTo.value = null
  void scrollToBottom()
  window.setTimeout(() => {
    store.simulateReply(id)
    void scrollToBottom()
  }, 900)
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
      void router.push({ path: '/history', query: { conversation: id } })
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

function sendFileMsg(payload: { name: string; size: string }): void {
  store.sendFile(id, payload.name, payload.size)
  void scrollToBottom()
}

function sendImageMsg(payload: { name: string }): void {
  store.sendImage(id, payload.name, 2)
  void scrollToBottom()
}

function sendAudioMsg(payload: { duration: string }): void {
  store.sendAudio(id, payload.duration)
  void scrollToBottom()
}

function sendPollMsg(): void {
  store.sendPoll(id, '本周评审时间投票')
  void scrollToBottom()
}

function sendCardMsg(): void {
  store.sendCard(id, '林晓', '产品经理')
  void scrollToBottom()
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
        type="button"
        class="icon-button h-8 w-8 rounded-md"
        title="返回主窗口"
        @click="router.push('/chats')"
      >
        <AppIcon name="ion:ios-arrow-left" :size="20" />
      </button>
      <Avatar :name="conversation.name" :index="conversation.avatarIndex" :size="36" />
      <div class="min-w-0 flex-1">
        <h2 class="truncate text-section text-foreground">{{ conversation.name }}</h2>
        <p class="truncate text-caption text-secondary-foreground">
          {{ conversation.group ? `${conversation.members?.length ?? 0} 位成员` : '独立聊天窗' }}
        </p>
      </div>
      <button
        type="button"
        class="icon-button h-8 w-8 rounded-md"
        title="会话信息"
        @click="showContext = true"
      >
        <AppIcon name="ion:information-circle-outline" :size="20" />
      </button>
      <button
        type="button"
        class="icon-button h-8 w-8 rounded-md"
        title="合并转发"
        @click="showForward = true"
      >
        <AppIcon name="ion:chatboxes" :size="20" />
      </button>
    </header>

    <div ref="scrollArea" class="min-h-0 flex-1 overflow-y-auto px-6 py-3">
      <MessageBubble
        v-for="message in conversation.messages"
        :key="message.id"
        :message="message"
        :highlight="message.id === store.highlightId"
        @preview="openPreview"
        @open-file="showToast(`打开文件：${$event.fileName}`)"
        @open-forward="showForward = true"
        @open-card="showToast(`查看名片：${$event.cardTitle}`)"
        @vote="onVote(message, $event)"
        @play-audio="showToast('正在播放语音…')"
        @contextmenu="replyToMessage(message)"
      />
    </div>

    <MessageInput
      :title="conversation.name"
      :reply-to="replyTo"
      @send="onSend"
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
