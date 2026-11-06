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
import OptionPickerDialog from '@renderer/components/OptionPickerDialog.vue'
import ForwardDetailDialog from '@renderer/components/ForwardDetailDialog.vue'
import SearchBar from '@renderer/components/SearchBar.vue'
import StatsDialog from '@renderer/components/StatsDialog.vue'
import Toast from '@renderer/components/Toast.vue'
import UserCardModal from '@renderer/components/UserCardModal.vue'
import { useConversationsStore, type ConversationFilter } from '@renderer/stores/conversations'
import type { CallMode, ChatMessage, Conversation } from '@renderer/types'

const store = useConversationsStore()
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
const totalUnread = computed(() => store.totalUnread)
const highlightId = computed(() => store.highlightId)

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
  void router.push(`/popout/${active.value.id}`)
}

function openFloat(): void {
  if (!active.value) return
  floatConversationId.value = active.value.id
  showFloat.value = true
}

function openProfileChat(): void {
  showProfile.value = false
  store.ensureConversation(profile.value.name, profile.value.index)
  void router.push('/chats')
}

function expandFloat(id: string): void {
  showFloat.value = false
  void router.push(`/popout/${id}`)
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
  showToast('已使用系统默认应用打开文件')
  showFile.value = false
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

function profileAddFriend(): void {
  showProfile.value = false
  showToast('已发送好友申请')
}

function profileQr(): void {
  showProfile.value = false
  showQr.value = true
}

function openSearchFromPanel(): void {
  onHeaderSearch()
}

/** 会话分类筛选（P15-08 选项选择） */
const showFilter = ref(false)
const filterOptions = ['全部会话', '未读会话', '群聊', '频道']
const filterLabel = computed(() => {
  const map: Record<ConversationFilter, string> = {
    all: '全部会话',
    unread: '未读会话',
    group: '群聊',
    channel: '频道'
  }
  return map[store.filter]
})

function onFilterConfirm(value: string): void {
  const map: Record<string, ConversationFilter> = {
    全部会话: 'all',
    未读会话: 'unread',
    群聊: 'group',
    频道: 'channel'
  }
  store.setFilter(map[value] ?? 'all')
  showToast(`已切换到「${value}」`)
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

function onSend(text: string): void {
  const conversationId = active.value?.id
  store.sendMessage(text, replyTo.value?.text)
  replyTo.value = null
  void scrollToBottom()
  window.setTimeout(() => {
    store.simulateReply(conversationId)
    void scrollToBottom()
  }, 900)
}

function onHeaderSearch(): void {
  if (!active.value) return
  void router.push({ path: '/search', query: { conversation: active.value.id } })
}

function onHeaderPin(): void {
  if (!active.value) return
  const pinned = store.togglePin(active.value.id)
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
  return [
    { key: 'pin', label: isPinned ? '取消置顶' : '置顶会话', icon: 'ion:pin' },
    {
      key: 'mute',
      label: conv?.muted ? '关闭免打扰' : '消息免打扰',
      icon: 'ion:ios-notifications-off'
    },
    { key: 'read', label: '标记为已读', icon: 'ion:ios-checkmark' },
    { key: 'filter', label: '会话分类', icon: 'ion:funnel' },
    { key: 'sep1', label: '', separator: true },
    { key: 'popout', label: '独立窗口打开', icon: 'ion:ios-open' },
    { key: 'float', label: '会话浮窗', icon: 'ion:copy' },
    { key: 'sep2', label: '', separator: true },
    { key: 'delete', label: '删除会话', icon: 'ion:ios-trash', danger: true }
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
      const muted = store.toggleMute(conv.id)
      showToast(muted ? '已开启消息免打扰' : '已关闭消息免打扰')
      break
    }
    case 'read':
      store.markRead(conv.id)
      showToast('已标记为已读')
      break
    case 'filter':
      showFilter.value = true
      break
    case 'popout':
      void router.push(`/popout/${conv.id}`)
      break
    case 'float':
      floatConversationId.value = conv.id
      showFloat.value = true
      break
    case 'delete':
      pendingConv.value = conv
      showDelete.value = true
      break
  }
}

function confirmPin(): void {
  const conv = pendingConv.value
  showPinConfirm.value = false
  if (!conv) return
  const pinned = store.togglePin(conv.id)
  showToast(pinned ? '已置顶会话' : '已取消置顶')
}

function confirmDelete(): void {
  const conv = pendingConv.value
  showDelete.value = false
  if (!conv) return
  store.deleteConversation(conv.id)
  showToast('会话已删除')
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
const fileFallback = ref({ name: '', size: '' })

function openFile(message: ChatMessage): void {
  fileFallback.value = { name: message.fileName ?? '文件', size: message.fileSize ?? '' }
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
const profile = ref({ name: '林晓', desc: '产品经理', index: 1 })

function onInfoProfile(): void {
  const member = active.value?.members?.[0]
  profile.value = {
    name: member?.name ?? active.value?.name ?? '林晓',
    desc: member?.role ?? '在线',
    index: member?.index ?? 1
  }
  showProfile.value = true
}

const showGroupQr = computed(() => showQr.value && Boolean(active.value?.group))
const showSelfQr = computed(() => showQr.value && !active.value?.group)

function onToggleMute(): void {
  if (!active.value) return
  const muted = store.toggleMute(active.value.id)
  showToast(muted ? '已开启消息免打扰' : '已关闭消息免打扰')
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

function sendFile(payload: { name: string; size: string }): void {
  if (!active.value) return
  store.sendFile(active.value.id, payload.name, payload.size)
  void scrollToBottom()
}

function sendImage(payload: { name: string }): void {
  if (!active.value) return
  store.sendImage(active.value.id, payload.name, 3)
  void scrollToBottom()
}

function sendAudio(payload: { duration: string }): void {
  if (!active.value) return
  store.sendAudio(active.value.id, payload.duration)
  void scrollToBottom()
}

function sendPoll(): void {
  if (!active.value) return
  store.sendPoll(active.value.id, '本周评审时间投票')
  void scrollToBottom()
}

function sendCard(): void {
  if (!active.value) return
  store.sendCard(active.value.id, '林晓', '产品经理')
  void scrollToBottom()
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

/* 加号菜单（P15-13） */
function onStartChat(payload: { name: string; index: number }): void {
  store.ensureConversation(payload.name, payload.index)
  void router.push('/chats')
  showToast(`已打开与 ${payload.name} 的会话`)
}

function onCreateGroup(payload: {
  name: string
  members: { name: string; index: number }[]
}): void {
  store.createGroup(
    payload.name,
    payload.members.map((member) => ({ ...member, role: '成员' as const }))
  )
  void router.push('/chats')
  showToast('群聊已创建')
}

function leaveGroup(): void {
  if (!active.value) return
  const id = active.value.id
  showManage.value = false
  store.deleteConversation(id)
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

      <div class="flex h-7 shrink-0 items-center justify-between px-3">
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-sm px-1 text-micro text-secondary-foreground transition-colors hover:text-foreground"
          @click="showFilter = true"
        >
          {{ filterLabel }}
          <AppIcon name="ion:chevron-down" :size="10" />
        </button>
        <span class="text-micro text-tertiary-foreground">{{ totalUnread }} 条未读</span>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <ConversationItem
          v-for="conversation in filtered"
          :key="conversation.id"
          :conversation="conversation"
          :active="conversation.id === active?.id"
          class="cursor-pointer"
          @click="selectConversation(conversation.id)"
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
    <section v-if="active" class="flex h-full min-w-0 flex-1 flex-col bg-tertiary">
      <ChatHeader
        :title="active.name"
        :subtitle="
          active.group
            ? `${active.members?.length ?? 0} 位成员`
            : active.muted
              ? '消息免打扰'
              : '在线'
        "
        :pinned="active.pinned"
        @search="onHeaderSearch"
        @pin="onHeaderPin"
        @info="showInfo = !showInfo"
      />

      <div
        ref="scrollArea"
        class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain py-3"
      >
        <div
          v-for="(message, index) in active.messages"
          :key="message.id"
          :data-message-id="message.id"
        >
          <div
            v-if="
              index === 0 ||
              formatTime(active.messages[index - 1].time) !== formatTime(message.time)
            "
            class="py-2 text-center text-micro text-time-foreground"
          >
            {{ formatTime(message.time) }}
          </div>
          <MessageBubble
            :message="message"
            :highlight="message.id === highlightId"
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

    <!-- P15-08 选项选择 -->
    <OptionPickerDialog
      :visible="showFilter"
      title="选择会话分类"
      :options="filterOptions"
      :model-value="filterLabel"
      @close="showFilter = false"
      @confirm="onFilterConfirm"
    />

    <!-- P15-01 用户卡片 -->
    <UserCardModal
      :visible="showProfile"
      :name="profile.name"
      :desc="profile.desc"
      :avatar-index="profile.index"
      account-id="linxiao"
      @close="showProfile = false"
      @start-chat="openProfileChat"
      @add-friend="profileAddFriend"
      @qr="profileQr"
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
      :visible="showDelete"
      title="删除会话"
      :description="
        pendingConv
          ? `确定要删除「${pendingConv.name}」吗？删除后聊天记录将一并清除，且无法恢复。`
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
