<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AddActions from '@renderer/components/AddActions.vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import CallOverlay from '@renderer/components/CallOverlay.vue'
import ChatHeader from '@renderer/components/ChatHeader.vue'
import ConfirmDialog from '@renderer/components/ConfirmDialog.vue'
import ContextMenu, { type MenuItem } from '@renderer/components/ContextMenu.vue'
import ConversationItem from '@renderer/components/ConversationItem.vue'
import DatePickerDialog from '@renderer/components/DatePickerDialog.vue'
import FileDetailDialog from '@renderer/components/FileDetailDialog.vue'
import FloatingChat from '@renderer/components/FloatingChat.vue'
import ForwardDialog from '@renderer/components/ForwardDialog.vue'
import GroupManageDialog from '@renderer/components/GroupManageDialog.vue'
import GroupQrDialog from '@renderer/components/GroupQrDialog.vue'
import InfoPanel from '@renderer/components/InfoPanel.vue'
import MediaPreview from '@renderer/components/MediaPreview.vue'
import MessageBubble from '@renderer/components/MessageBubble.vue'
import MessageInput from '@renderer/components/MessageInput.vue'
import ForwardDetailDialog from '@renderer/components/ForwardDetailDialog.vue'
import SearchBar from '@renderer/components/SearchBar.vue'
import StatsDialog from '@renderer/components/StatsDialog.vue'
import Toast from '@renderer/components/Toast.vue'
import UserCardModal from '@renderer/components/UserCardModal.vue'
import { useAppStore } from '@renderer/stores/app'
import { useConversationsStore } from '@renderer/stores/conversations'
import { leaveGroup as leaveGroupApi } from '@renderer/api/groups'
import { sendFriendRequest } from '@renderer/api/friends'
import { blockUser } from '@renderer/api/blocks'
import { avatarIndexOf, shouldShowMessageTime } from '@renderer/utils/chat'
import { openPopoutWindow } from '@renderer/utils/window'
import type { CallMode, ChatMessage, Conversation } from '@renderer/types'

const store = useConversationsStore()
const app = useAppStore()
const router = useRouter()

const keyword = ref('')
const showInfo = ref(false)
const addActions = ref<InstanceType<typeof AddActions> | null>(null)
const scrollArea = ref<HTMLDivElement | null>(null)

const toastMessage = ref('')
function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}

const active = computed(() => store.activeConversation)
const highlightId = computed(() => store.highlightId)
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
  const conversation = active.value
  if (!conversation) {
    return { name: message.sender || '对方', index: 1, avatarUrl: null }
  }
  if (conversation.bot && message.senderId === conversation.bot.botId) {
    return {
      name: conversation.bot.nickname,
      index: conversation.avatarIndex,
      avatarUrl: conversation.bot.avatarUrl
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
    name: message.sender || conversation.name,
    index: conversation.avatarIndex,
    avatarUrl: conversation.avatarUrl ?? null
  }
}

const headerSubtitle = computed(() => {
  const conversation = active.value
  if (!conversation) return ''
  if (store.isTyping(conversation.id)) return '对方正在输入…'
  if (conversation.targetType === 'BOT') {
    return conversation.bot?.description || '机器人'
  }
  if (!conversation.group && conversation.targetUserId === app.user?.userId) {
    return '与自己的会话 · 备忘 / 文件传输'
  }
  if (conversation.group) return `${conversation.members?.length ?? 0} 位成员`
  if (conversation.muted) return '消息免打扰'
  return conversation.targetSignature || '在线'
})

function selectConversation(id: string): void {
  store.setActive(id)
}

function go(path: string): void {
  void router.push(path)
}

function openFiles(): void {
  void router.push('/files')
}

function openHistory(): void {
  if (!active.value) return
  void router.push({ path: '/history', query: { conversation: active.value.id } })
}

function openPopout(): void {
  if (!active.value) return
  openPopoutWindow(active.value.id)
}

function openFloat(): void {
  if (!active.value) return
  floatConversationId.value = active.value.id
  showFloat.value = true
}

async function openProfileChat(): Promise<void> {
  showProfile.value = false
  if (!profile.value.userId) {
    showToast('缺少用户信息')
    return
  }
  try {
    await store.openWithUser(profile.value.userId)
    void router.push('/chats')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '打开会话失败')
  }
}

function expandFloat(id: string): void {
  showFloat.value = false
  openPopoutWindow(id)
}

function clearChat(): void {
  showClear.value = false
  if (active.value) store.clearMessages(active.value.id)
  showToast('聊天记录已清空')
}

function forwardRecent(): void {
  if (!active.value) return
  openForward(
    active.value.messages
      .slice(-3)
      .map((item) => `${item.sender ?? '我'}：${item.text ?? item.fileName ?? ''}`)
  )
}

function openFileDialog(): void {
  showFile.value = false
  if (!fileFallback.value.url) {
    showToast('该文件没有可用的下载地址')
    return
  }
  window.open(fileFallback.value.url, '_blank')
  showToast('已打开文件')
}

function forwardFileDialog(): void {
  showFile.value = false
  openForward([fileFallback.value.name])
}

function openManageQr(): void {
  showManage.value = false
  showQr.value = true
}

function onScheduleConfirm(value: string): void {
  showToast(`已创建 ${value} 的日程`)
  showSchedule.value = false
}

async function profileAddFriend(): Promise<void> {
  showProfile.value = false
  const userId = active.value?.targetUserId
  if (!app.accessToken || !userId) return
  try {
    await sendFriendRequest(app.accessToken, {
      toUserId: userId,
      message: '你好，申请添加你为好友'
    })
    showToast('已发送好友申请')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '好友申请发送失败')
  }
}

function profileQr(): void {
  showProfile.value = false
  showQr.value = true
}

async function profileBlock(): Promise<void> {
  showProfile.value = false
  const userId = active.value?.targetUserId
  if (!app.accessToken || !userId) return
  try {
    await blockUser(app.accessToken, userId)
    showToast('已拉黑该用户，单聊将无法继续')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '拉黑失败')
  }
}

function openSearchFromPanel(): void {
  onHeaderSearch()
}

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return store.filteredList
  return store.filteredList.filter(
    (item) => item.name.toLowerCase().includes(kw) || item.preview.toLowerCase().includes(kw)
  )
})

function formatTime(time: string): string {
  return /^\d{1,2}:\d{2}$/.test(time) ? `今天 ${time}` : time
}

async function scrollToBottom(): Promise<void> {
  await nextTick()
  const el = scrollArea.value
  if (el) el.scrollTop = el.scrollHeight
}

function onScrollHistory(): void {
  const el = scrollArea.value
  const conversation = active.value
  if (!el || !conversation?.hasMore) return
  if (el.scrollTop < 48) void store.loadMoreHistory(conversation.id)
}

watch(() => active.value?.id, scrollToBottom)
watch(() => active.value?.messages.length, scrollToBottom)

/** P20 消息上下文：进入会话后定位并高亮命中消息 */
watch(
  () => store.highlightId,
  async (id) => {
    if (!id) return
    await nextTick()
    await scrollToBottom()
    const el = document.querySelector<HTMLElement>(`[data-message-id="${id}"]`)
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    window.setTimeout(() => store.clearHighlight(), 4000)
  },
  { immediate: true }
)

const replyTo = ref<{ sender: string; text: string } | null>(null)

async function onSend(text: string): Promise<void> {
  if (!active.value) return
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
  if (active.value) store.sendTyping(active.value.id)
}

function onHeaderSearch(): void {
  if (!active.value) return
  void router.push({ path: '/search', query: { conversation: active.value.id } })
}

async function onHeaderPin(): Promise<void> {
  if (!active.value) return
  const pinned = await store.togglePin(active.value.id)
  showToast(pinned ? '已置顶会话' : '已取消置顶')
}

/* ─────────── P12/P15-12 会话列表右键菜单 ─────────── */

const showConvMenu = ref(false)
const convMenuX = ref(0)
const convMenuY = ref(0)
const activeConvMenu = ref<Conversation | null>(null)

const conversationMenuItems = computed<MenuItem[]>(() => {
  const conv = activeConvMenu.value
  const isPinned = conv?.pinned ?? false
  const hasUnread = (conv?.unread ?? 0) > 0
  return [
    { key: 'pin', label: isPinned ? '取消置顶' : '置顶会话', icon: 'ion:pin' },
    {
      key: 'read-toggle',
      label: hasUnread ? '标记为已读' : '标为未读',
      icon: hasUnread ? 'ion:ios-checkmark' : 'ion:mail-unread'
    },
    {
      key: 'mute',
      label: conv?.muted ? '允许消息通知' : '消息免打扰',
      icon: conv?.muted ? 'ion:ios-notifications' : 'ion:ios-notifications-off'
    },
    { key: 'popout', label: '独立显示窗口', icon: 'ion:ios-open' },
    { key: 'sep1', label: '', separator: true },
    { key: 'hide', label: '不显示', icon: 'ion:eye-off' },
    { key: 'delete', label: '删除聊天', icon: 'ion:ios-trash', danger: true }
  ]
})

function onConversationContextMenu(event: MouseEvent, conversation: Conversation): void {
  activeConvMenu.value = conversation
  convMenuX.value = event.clientX
  convMenuY.value = event.clientY
  showConvMenu.value = true
}

const showDelete = ref(false)
const showPinConfirm = ref(false)
const pendingConv = ref<Conversation | null>(null)

const showFloat = ref(false)
const floatConversationId = ref('')

function onConvMenuSelect(key: string): void {
  const conv = activeConvMenu.value
  if (!conv) return

  switch (key) {
    case 'pin':
      pendingConv.value = conv
      showPinConfirm.value = true
      break
    case 'mute': {
      void store.toggleMute(conv.id).then((muted) => {
        showToast(muted ? '已开启消息免打扰' : '已关闭消息免打扰')
      })
      break
    }
    case 'read-toggle':
      if (conv.unread > 0) {
        void store.markRead(conv.id)
        showToast('已标记为已读')
      } else {
        void store.markUnread(conv.id)
        showToast('已标为未读')
      }
      break
    case 'popout':
      openPopoutWindow(conv.id)
      break
    case 'hide':
      askHideConversation(conv)
      break
    case 'delete':
      pendingConv.value = conv
      showDelete.value = true
      break
  }
}

const showHide = ref(false)
const HIDE_TIP_KEY = 'starrysky-hide-chat-tip-at'

/** 微信规则：首次隐藏时提醒，之后 30 天内不再提醒 */
function shouldShowHideTip(): boolean {
  try {
    const last = Number(localStorage.getItem(HIDE_TIP_KEY) ?? 0)
    return !last || Date.now() - last > 30 * 24 * 60 * 60 * 1000
  } catch {
    return true
  }
}

function markHideTipShown(): void {
  try {
    localStorage.setItem(HIDE_TIP_KEY, String(Date.now()))
  } catch {
    /* 忽略持久化失败 */
  }
}

function askHideConversation(conv: Conversation): void {
  if (shouldShowHideTip()) {
    pendingConv.value = conv
    showHide.value = true
    return
  }
  store.hideConversation(conv.id)
  showToast('已不显示该聊天')
}

function confirmHide(): void {
  const conv = pendingConv.value
  showHide.value = false
  markHideTipShown()
  if (!conv) return
  store.hideConversation(conv.id)
  showToast('已不显示该聊天')
}

async function confirmPin(): Promise<void> {
  const conv = pendingConv.value
  showPinConfirm.value = false
  if (!conv) return
  const pinned = await store.togglePin(conv.id)
  showToast(pinned ? '已置顶会话' : '已取消置顶')
}

async function confirmDelete(): Promise<void> {
  const conv = pendingConv.value
  showDelete.value = false
  if (!conv) return
  await store.deleteConversation(conv.id)
  showToast('聊天已删除')
}

/* ─────────── P15-11 消息右键菜单 ─────────── */

const showMsgMenu = ref(false)
const msgMenuX = ref(0)
const msgMenuY = ref(0)
const activeMsg = ref<ChatMessage | null>(null)

const messageMenuItems = computed<MenuItem[]>(() => {
  const msg = activeMsg.value
  const isOut = msg?.direction === 'out'
  const items: MenuItem[] = [
    { key: 'reply', label: '回复', icon: 'ion:ios-undo' },
    { key: 'forward', label: '转发', icon: 'ion:ios-redo' }
  ]
  if (isOut) items.push({ key: 'recall', label: '撤回', icon: 'ion:ios-arrow-back', danger: true })
  items.push({ key: 'copy', label: '复制', icon: 'ion:ios-copy' })
  items.push({ key: 'context', label: '查看上下文', icon: 'ion:ios-list' })
  items.push({ key: 'sep1', label: '', separator: true })
  items.push({ key: 'delete', label: '删除', icon: 'ion:ios-trash', danger: true })
  return items
})

function onMessageContextMenu(event: MouseEvent, message: ChatMessage): void {
  activeMsg.value = message
  msgMenuX.value = event.clientX
  msgMenuY.value = event.clientY
  showMsgMenu.value = true
}

const showForward = ref(false)
const forwardLines = ref<string[]>([])

function openForward(lines: string[]): void {
  forwardLines.value = lines
  showForward.value = true
}

function currentLines(): string[] {
  const message = activeMsg.value
  if (!message) return []
  if (message.kind === 'forward' && message.forwardLines?.length) return message.forwardLines
  return [
    `${message.sender ?? '我'}：${message.text ?? message.fileName ?? message.imageLabel ?? '[消息]'}`
  ]
}

function onMsgMenuSelect(key: string): void {
  const message = activeMsg.value
  if (!message) return

  switch (key) {
    case 'reply':
      replyTo.value = {
        sender: message.sender ?? '对方',
        text: message.text ?? message.fileName ?? '[消息]'
      }
      showToast('已引用该消息')
      break
    case 'forward':
      openForward(currentLines())
      break
    case 'recall':
      if (active.value) store.recall(active.value.id, message.id)
      showToast('消息已撤回')
      break
    case 'copy':
      navigator.clipboard
        ?.writeText(message.text ?? message.fileName ?? '')
        .then(() => showToast('已复制到剪贴板'))
        .catch(() => showToast('复制失败'))
      break
    case 'context':
      if (active.value) {
        store.setHighlight(message.id)
        showToast('已定位到该消息')
      }
      break
    case 'delete':
      if (active.value) store.removeMessage(active.value.id, message.id)
      showToast('消息已删除')
      break
  }
}

/* ─────────── P11 多媒体预览 ─────────── */

const showPreview = ref(false)
const previewIndex = ref(0)
const images = computed(
  () => active.value?.messages.filter((message) => message.kind === 'image') ?? []
)

function openPreview(message: ChatMessage): void {
  previewIndex.value = Math.max(
    0,
    images.value.findIndex((item) => item.id === message.id)
  )
  showPreview.value = true
}

/* ─────────── 文件详情 ─────────── */

const showFile = ref(false)
const fileFallback = ref({ name: '', size: '', url: '' })

function openFile(message: ChatMessage): void {
  fileFallback.value = {
    name: message.fileName ?? '文件',
    size: message.fileSize ?? '',
    url: message.fileUrl ?? ''
  }
  showFile.value = true
}

/* ─────────── P16 音视频 ─────────── */

const showCall = ref(false)
const callMode = ref<CallMode>('audio')

function startCall(mode: CallMode): void {
  callMode.value = mode
  showCall.value = true
}

/* ─────────── 其它弹窗 ─────────── */

const showStats = ref(false)
const showQr = ref(false)
const showManage = ref(false)
const showSchedule = ref(false)
const showProfile = ref(false)
const showClear = ref(false)
const showForwardDetail = ref(false)
const forwardDetail = ref<ChatMessage | null>(null)
const profile = ref({ name: '林晓', desc: '产品经理', index: 1, userId: '' })

function onInfoProfile(): void {
  const member = active.value?.members?.[0]
  if (active.value?.bot) {
    profile.value = {
      name: active.value.bot.nickname,
      desc: active.value.bot.description || '机器人',
      index: active.value.avatarIndex,
      userId: active.value.bot.botId
    }
    showProfile.value = false
    showToast('机器人资料由开发者后台维护')
    return
  }
  profile.value = {
    name: active.value?.name ?? (member?.name || '林晓'),
    desc: member?.role ?? active.value?.targetSignature ?? '在线',
    index: member?.index ?? active.value?.avatarIndex ?? 1,
    userId: active.value?.targetUserId ?? ''
  }
  showProfile.value = true
}

const showGroupQr = computed(() => showQr.value && Boolean(active.value?.group))
const showSelfQr = computed(() => showQr.value && !active.value?.group)

function onToggleMute(): void {
  if (!active.value) return
  void store.toggleMute(active.value.id).then((muted) => {
    showToast(muted ? '已开启消息免打扰' : '已关闭消息免打扰')
  })
}

function onMessageInputAction(key: string): void {
  if (!active.value) return
  const conversationId = active.value.id
  switch (key) {
    case 'history':
      void router.push({ path: '/history', query: { conversation: conversationId } })
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

async function sendFile(payload: { name: string; size: string; file: File }): Promise<void> {
  if (!active.value) return
  try {
    await store.sendFileAttachment(active.value.id, payload.file)
    await scrollToBottom()
  } catch (error) {
    showToast(error instanceof Error ? error.message : '文件上传失败')
  }
}

async function sendImage(payload: { name: string; file: File }): Promise<void> {
  if (!active.value) return
  try {
    await store.sendImageFile(active.value.id, payload.file)
    await scrollToBottom()
  } catch (error) {
    showToast(error instanceof Error ? error.message : '图片上传失败')
  }
}

async function sendAudio(payload: { duration: string; blob?: Blob }): Promise<void> {
  if (!active.value) return
  if (!payload.blob) {
    showToast('未录制到音频，请检查麦克风权限')
    return
  }
  const [minutes, seconds] = payload.duration.split(':').map((value) => Number(value))
  try {
    await store.sendAudioBlob(active.value.id, payload.blob, minutes * 60 + seconds)
    await scrollToBottom()
  } catch (error) {
    showToast(error instanceof Error ? error.message : '语音发送失败')
  }
}

function sendPoll(): void {
  if (!active.value) return
  store.sendPoll(active.value.id, '本周评审时间投票')
  showToast('投票能力后端暂未开放，当前为本地演示')
  void scrollToBottom()
}

async function sendCard(): Promise<void> {
  if (!active.value) return
  try {
    await store.sendCard(active.value.id, '林晓', '产品经理')
    await scrollToBottom()
  } catch (error) {
    showToast(error instanceof Error ? error.message : '名片发送失败')
  }
}

function onVote(message: ChatMessage, index: number): void {
  if (!active.value) return
  const votes = store.vote(active.value.id, message.id, index)
  if (votes === undefined) showToast('你已经投过票了')
  else showToast(`已投票，当前 ${votes} 票`)
}

function onForwardDetail(message: ChatMessage): void {
  forwardDetail.value = message
  showForwardDetail.value = true
}

async function onSelfChat(): Promise<void> {
  try {
    await store.openWithSelf()
    void router.push('/chats')
    showToast('已打开与自己的会话')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '打开会话失败')
  }
}

/* 加号菜单（P15-13） */
async function onStartChat(payload: {
  userId: string
  name: string
  index: number
}): Promise<void> {
  if (!payload.userId) {
    showToast('缺少用户 ID')
    return
  }
  try {
    await store.openWithUser(payload.userId)
    void router.push('/chats')
    showToast(`已打开与 ${payload.name} 的会话`)
  } catch (error) {
    showToast(error instanceof Error ? error.message : '打开会话失败')
  }
}

async function onCreateGroup(payload: {
  name: string
  members: { userId: string; name: string; index: number }[]
}): Promise<void> {
  const memberIds = payload.members.map((member) => member.userId).filter(Boolean)
  if (memberIds.length === 0) {
    showToast('请至少选择一位成员')
    return
  }
  try {
    await store.createGroup(payload.name, memberIds)
    void router.push('/chats')
    showToast('群聊已创建')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '创建群聊失败')
  }
}

async function leaveGroup(): Promise<void> {
  if (!active.value) return
  const id = active.value.id
  showManage.value = false
  if (app.accessToken && id.startsWith('group:')) {
    await leaveGroupApi(app.accessToken, id.replace(/^group:/, '')).catch(() => undefined)
  }
  await store.deleteConversation(id)
  showToast('已退出群聊')
}
</script>

<template>
  <div class="flex h-full w-full">
    <!-- 会话列表面板 -->
    <section
      class="flex h-full w-panel shrink-0 flex-col overflow-hidden border-r border-divider bg-tertiary"
    >
      <SearchBar v-model="keyword" @add="addActions?.open($event)" />

      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <ConversationItem
          v-for="conversation in filtered"
          :key="conversation.id"
          :conversation="conversation"
          :active="conversation.id === active?.id"
          class="cursor-pointer"
          @click="selectConversation(conversation.id)"
          @dblclick="openPopoutWindow(conversation.id)"
          @contextmenu="onConversationContextMenu"
        />
        <p
          v-if="filtered.length === 0"
          class="mt-8 px-4 text-center text-caption text-tertiary-foreground"
        >
          没有匹配的会话
        </p>
      </div>
    </section>

    <!-- 聊天区 -->
    <section v-if="active" class="relative flex h-full min-w-0 flex-1 flex-col bg-tertiary">
      <ChatHeader
        :title="active.name"
        :subtitle="headerSubtitle"
        :pinned="active.pinned"
        @search="onHeaderSearch"
        @pin="onHeaderPin"
        @info="showInfo = !showInfo"
      />

      <!-- P25 当前身份标识：仅在 Agent 视角显示 -->
      <div
        v-if="app.actingAgent"
        class="pointer-events-none absolute left-1/2 top-3.5 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-[8px] border border-accent bg-accent-subtle px-2.5 py-1.5 shadow-sm"
      >
        <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-status-success" />
        <span class="whitespace-nowrap text-caption text-accent">
          当前身份 · {{ app.actingAgent.nickname }}（Agent）
        </span>
      </div>

      <div
        ref="scrollArea"
        class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3"
        @scroll.passive="onScrollHistory"
      >
        <div
          v-for="(message, index) in active.messages"
          :key="message.id"
          :data-message-id="message.id"
        >
          <div
            v-if="shouldShowMessageTime(message, active.messages[index - 1])"
            class="py-2 text-center text-micro text-time-foreground"
          >
            {{ formatTime(message.time) }}
          </div>
          <MessageBubble
            :message="message"
            :highlight="message.id === highlightId"
            :self-avatar="selfAvatar"
            :sender-avatar="senderAvatarOf(message)"
            @contextmenu="onMessageContextMenu($event, message)"
            @preview="openPreview"
            @open-file="openFile"
            @open-forward="onForwardDetail"
            @open-card="showProfile = true"
            @vote="onVote(message, $event)"
            @play-audio="showToast('正在播放语音…')"
          />
        </div>

        <div v-if="active.messages.length === 0" class="mt-16 flex flex-col items-center gap-2">
          <AppIcon name="ion:chatbubbles" :size="32" class="text-icon" />
          <p class="text-caption text-tertiary-foreground">暂无消息，发送第一条开始对话</p>
        </div>
      </div>

      <MessageInput
        :title="active.name"
        :reply-to="replyTo"
        @send="onSend"
        @typing="onTyping"
        @toast="showToast"
        @clear-reply="replyTo = null"
        @send-file="sendFile"
        @send-image="sendImage"
        @send-audio="sendAudio"
        @send-poll="sendPoll"
        @send-card="sendCard"
        @request-forward="forwardRecent"
        @open-favorites="go('/favorites')"
        @call="startCall"
        @action="onMessageInputAction"
      />
    </section>

    <section
      v-else
      class="flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-3 bg-tertiary"
    >
      <AppIcon name="ion:chatbubbles" :size="40" class="text-icon" />
      <p class="text-label text-foreground">暂无会话</p>
      <p class="text-caption text-tertiary-foreground">点击左上角加号发起会话或创建群聊</p>
    </section>

    <!-- P06 会话详情信息面板 -->
    <InfoPanel
      v-if="showInfo && active"
      :conversation="active"
      @close="showInfo = false"
      @search="openSearchFromPanel"
      @files="openFiles"
      @history="openHistory"
      @forward="forwardRecent"
      @popout="openPopout"
      @float="openFloat"
      @manage="showManage = true"
      @qr="showQr = true"
      @profile="onInfoProfile"
      @call="startCall"
      @toggle-mute="onToggleMute"
      @open-qr-self="showQr = true"
    />

    <!-- P15-11 会话右键菜单 -->
    <ContextMenu
      v-model:visible="showConvMenu"
      :items="conversationMenuItems"
      :x="convMenuX"
      :y="convMenuY"
      @select="onConvMenuSelect"
    />

    <!-- P15-11 消息右键菜单 -->
    <ContextMenu
      v-model:visible="showMsgMenu"
      :items="messageMenuItems"
      :x="msgMenuX"
      :y="msgMenuY"
      @select="onMsgMenuSelect"
    />

    <!-- P15-13 加号菜单对应的四个弹窗 -->
    <AddActions
      ref="addActions"
      @start="onStartChat"
      @create="onCreateGroup"
      @friend="showToast(`已向 ${$event} 发送好友申请`)"
      @self-chat="onSelfChat"
      @toast="showToast"
    />

    <!-- P11 多媒体预览 -->
    <MediaPreview
      :visible="showPreview"
      :images="images"
      :index="previewIndex"
      @close="showPreview = false"
    />

    <!-- P13 合并转发 -->
    <ForwardDialog
      :visible="showForward"
      :lines="forwardLines"
      @close="showForward = false"
      @sent="showToast('已转发聊天记录')"
    />

    <!-- 转发详情 -->
    <ForwardDetailDialog
      :visible="showForwardDetail"
      :message="forwardDetail"
      @close="showForwardDetail = false"
    />

    <!-- 文件详情 -->
    <FileDetailDialog
      :visible="showFile"
      :file="null"
      :fallback-name="fileFallback.name"
      :fallback-size="fileFallback.size"
      @close="showFile = false"
      @open="openFileDialog"
      @forward="forwardFileDialog"
      @star="showToast('已收藏该文件')"
    />

    <!-- P16 音视频 -->
    <CallOverlay
      :visible="showCall"
      :mode="callMode"
      :title="active?.name ?? '林晓'"
      :avatar-index="active?.avatarIndex ?? 1"
      :members="active?.members ?? []"
      @close="showCall = false"
      @toast="showToast"
    />

    <!-- 消息统计 -->
    <StatsDialog :visible="showStats" :conversation="active" @close="showStats = false" />

    <!-- P15 群二维码 / 我的二维码 -->
    <GroupQrDialog
      :visible="showGroupQr"
      :name="active?.name ?? ''"
      :value="`starrysky://group/${active?.id ?? ''}`"
      @close="showQr = false"
      @toast="showToast"
    />
    <GroupQrDialog
      :visible="showSelfQr"
      mode="self"
      name="林晓"
      hint="用野火IM扫码添加我为好友"
      value="starrysky://user/linxiao"
      @close="showQr = false"
      @toast="showToast"
    />

    <!-- P15 群管理 -->
    <GroupManageDialog
      :visible="showManage"
      :conversation-id="active?.id ?? ''"
      @close="showManage = false"
      @toast="showToast"
      @open-qr="openManageQr"
      @leave="leaveGroup"
    />

    <!-- P15-07 日期选择 -->
    <DatePickerDialog
      :visible="showSchedule"
      title="设置日程"
      @close="showSchedule = false"
      @confirm="onScheduleConfirm"
    />

    <!-- P15-01 用户卡片 -->
    <UserCardModal
      :visible="showProfile"
      :name="profile.name"
      :desc="profile.desc"
      :avatar-index="profile.index"
      :avatar-url="active?.avatarUrl"
      :account-id="active?.targetUserId ?? active?.targetUsername ?? ''"
      @close="showProfile = false"
      @start-chat="openProfileChat"
      @add-friend="profileAddFriend"
      @qr="profileQr"
      @block="profileBlock"
    />

    <!-- P24 会话浮窗 -->
    <FloatingChat
      :visible="showFloat"
      :conversation-id="floatConversationId"
      @close="showFloat = false"
      @expand="expandFloat"
    />

    <!-- 确认弹窗 -->
    <ConfirmDialog
      :visible="showHide"
      title="不显示聊天"
      description="该聊天将从会话列表中隐藏，聊天记录仍会保留。对方发来新消息时会重新显示。"
      confirm-text="我知道"
      @cancel="showHide = false"
      @confirm="confirmHide"
    />
    <ConfirmDialog
      :visible="showDelete"
      title="删除聊天"
      :description="
        pendingConv
          ? `确定要删除「${pendingConv.name}」吗？删除后会话会从列表移除，对方发来新消息时会重新显示。`
          : ''
      "
      confirm-text="删除"
      danger
      @cancel="showDelete = false"
      @confirm="confirmDelete"
    />
    <ConfirmDialog
      :visible="showPinConfirm"
      title="置顶会话"
      :description="
        pendingConv
          ? `确定要${pendingConv.pinned ? '取消置顶' : '置顶'}「${pendingConv.name}」吗？`
          : ''
      "
      confirm-text="确定"
      @cancel="showPinConfirm = false"
      @confirm="confirmPin"
    />
    <ConfirmDialog
      :visible="showClear"
      title="清空聊天记录"
      description="清空后当前会话的本地记录将被删除，且无法恢复。"
      confirm-text="清空"
      danger
      @cancel="showClear = false"
      @confirm="clearChat"
    />

    <!-- P15-10 全局 Toast -->
    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
