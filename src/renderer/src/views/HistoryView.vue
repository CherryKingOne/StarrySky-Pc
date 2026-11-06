<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import DatePickerDialog from '@renderer/components/DatePickerDialog.vue'
import EmptyState from '@renderer/components/EmptyState.vue'
import ForwardDetailDialog from '@renderer/components/ForwardDetailDialog.vue'
import MediaPreview from '@renderer/components/MediaPreview.vue'
import MessageBubble from '@renderer/components/MessageBubble.vue'
import Toast from '@renderer/components/Toast.vue'
import { useContactsStore } from '@renderer/stores/contacts'
import { useConversationsStore } from '@renderer/stores/conversations'
import type { ChatMessage } from '@renderer/types'

const route = useRoute()
const router = useRouter()
const store = useConversationsStore()
const contacts = useContactsStore()

const conversationId = ref(String(route.query.conversation ?? store.activeId))
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

/* ─────────── 日期工具 ─────────── */

function dateKeyOf(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDateKey(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : dateKeyOf(date)
}

function keyToDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

function todayKey(): string {
  return dateKeyOf(new Date())
}

/** 日期标题始终显示年月日：11月7日 周五 / 2025年11月7日 周五 */
function dateLabel(key: string): string {
  if (!key) return ''
  const target = keyToDate(key)
  const today = keyToDate(todayKey())
  const week = '日一二三四五六'[target.getDay()]
  if (target.getFullYear() === today.getFullYear()) {
    return `${target.getMonth() + 1}月${target.getDate()}日 周${week}`
  }
  return `${target.getFullYear()}年${target.getMonth() + 1}月${target.getDate()}日 周${week}`
}

/** 相对日：今天 / 昨天；其余为空 */
function relativeLabel(key: string): string {
  const today = keyToDate(todayKey())
  const target = keyToDate(key)
  const diff = Math.round((today.getTime() - target.getTime()) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  return ''
}

/* ─────────── 日期选项 ─────────── */

/** 加为好友 / 建群的时间；没有资料时退回会话创建时间或消息最早日期 */
const startKey = computed(() => {
  const current = conversation.value
  const keys: string[] = []
  if (current?.group) {
    const groupId = current.id.startsWith('group:') ? current.id.slice('group:'.length) : ''
    const group = contacts.groups.find((item) => item.groupId === groupId)
    if (group?.createdAt) keys.push(toDateKey(group.createdAt))
  } else if (current?.targetUserId) {
    const friend = contacts.friends.find((item) => item.userId === current.targetUserId)
    if (friend?.createdAt) keys.push(toDateKey(friend.createdAt))
  }
  if (current?.createdAt) keys.push(toDateKey(current.createdAt))
  for (const message of current?.messages ?? []) {
    const key = toDateKey(message.createdAt)
    if (key) keys.push(key)
  }
  const valid = keys.filter(Boolean).sort()
  return valid[0] || todayKey()
})

const dateCounts = computed(() => {
  const counts: Record<string, number> = {}
  for (const message of conversation.value?.messages ?? []) {
    const key = toDateKey(message.createdAt)
    if (!key) continue
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
})

const allCount = computed(() => conversation.value?.messages.length ?? 0)

/** 从加好友当天到今天逐日列出；无消息的日期置灰不可点击 */
const dateOptions = computed(() => {
  const start = keyToDate(startKey.value)
  const end = keyToDate(todayKey())
  const list: { key: string; label: string; count: number; enabled: boolean }[] = []
  for (
    let cursor = new Date(start);
    cursor.getTime() <= end.getTime() && list.length < 1000;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const key = dateKeyOf(cursor)
    const count = dateCounts.value[key] ?? 0
    list.push({ key, label: dateLabel(key), count, enabled: count > 0 })
  }
  return list.reverse()
})

const selectedDate = ref<'all' | string>('all')

const selectedLabel = computed(() => {
  if (selectedDate.value === 'all') return '全部日期'
  const relative = relativeLabel(selectedDate.value)
  return relative
    ? `${relative} · ${dateLabel(selectedDate.value)}`
    : dateLabel(selectedDate.value)
})

/** 日期条目第二行：今天/昨天 + 消息数 */
function dateSubLabel(option: { key: string; count: number; enabled: boolean }): string {
  const relative = relativeLabel(option.key)
  const countText = option.enabled ? `${option.count} 条消息` : '无消息'
  return relative ? `${relative} · ${countText}` : countText
}

function selectDate(key: string): void {
  selectedDate.value = key
}

/* ─────────── 日历选择 ─────────── */

const showCalendar = ref(false)
const enabledDateKeys = computed(() => Object.keys(dateCounts.value))
const calendarInitial = computed(() =>
  selectedDate.value === 'all' ? todayKey() : selectedDate.value
)

function openCalendar(): void {
  showCalendar.value = true
}

function onCalendarPick(key: string): void {
  selectedDate.value = key
  showCalendar.value = false
}

/* ─────────── 消息列表 ─────────── */

const filtered = computed(() => {
  const messages = conversation.value?.messages ?? []
  if (selectedDate.value === 'all') return messages
  return messages.filter((message) => toDateKey(message.createdAt) === selectedDate.value)
})

/** 跨天时在消息上方补一条日期分隔 */
function showDateHeader(message: ChatMessage, index: number): boolean {
  if (index === 0) return true
  const previous = filtered.value[index - 1]
  return toDateKey(previous.createdAt) !== toDateKey(message.createdAt)
}

function dayHeaderLabel(message: ChatMessage): string {
  const key = toDateKey(message.createdAt)
  return key ? dateLabel(key) : message.time
}

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

/** 从独立会话窗口进入历史页时，返回该独立窗口而不是主窗口会话页 */
const inPopout = computed(() => String(route.query.popout ?? '') === '1')

function backToChat(): void {
  if (conversation.value) store.setActive(conversation.value.id)
  if (inPopout.value && conversation.value) {
    void router.push(`/popout/${conversation.value.id}`)
    return
  }
  void router.push('/chats')
}

function exportHistory(): void {
  showToast('聊天记录已导出为 HTML（演示）')
}

onMounted(async () => {
  await store.load()
  await contacts.load().catch(() => undefined)
  if (conversationId.value) await store.loadAllHistory(conversationId.value)
})
</script>

<template>
  <!-- P14 消息历史：按日期查看当前会话记录（独立视图，不显示主应用侧栏） -->
  <div class="flex h-full w-full">
    <section
      class="flex h-full w-[240px] shrink-0 flex-col overflow-hidden border-r border-divider bg-panel"
    >
      <div class="flex h-[60px] shrink-0 items-center justify-between px-4">
        <div class="min-w-0">
          <h2 class="text-label text-foreground">按日期查看</h2>
          <p class="truncate text-micro text-tertiary-foreground">
            自 {{ dateLabel(startKey) }} 起
          </p>
        </div>
        <button
          v-tooltip="'打开日历'"
          type="button"
          class="icon-button h-7 w-7 shrink-0 rounded-sm"
          @click="openCalendar"
        >
          <AppIcon name="ion:calendar" :size="16" />
        </button>
      </div>
      <div class="h-px w-full bg-border" />

      <div class="min-h-0 flex-1 overflow-y-auto py-1">
        <button
          type="button"
          class="flex h-[50px] w-full items-center gap-3 px-3 text-left transition-colors"
          :class="selectedDate === 'all' ? 'bg-conv-active' : 'hover:bg-item-hover'"
          @click="selectDate('all')"
        >
          <span class="flex h-8 w-8 items-center justify-center rounded-md bg-selected-alt">
            <AppIcon name="ion:chatbubbles" :size="18" class="text-accent" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-small text-foreground">全部消息</span>
            <span class="block text-micro text-tertiary-foreground">
              {{ allCount }} 条消息
            </span>
          </span>
        </button>

        <button
          v-for="option in dateOptions"
          :key="option.key"
          type="button"
          :disabled="!option.enabled"
          class="flex h-[50px] w-full items-center gap-3 px-3 text-left transition-colors"
          :class="[
            selectedDate === option.key ? 'bg-conv-active' : '',
            option.enabled ? 'hover:bg-item-hover' : 'cursor-not-allowed opacity-50'
          ]"
          @click="selectDate(option.key)"
        >
          <span
            class="flex h-8 w-8 items-center justify-center rounded-md"
            :class="option.enabled ? 'bg-selected-alt text-accent' : 'bg-input text-tertiary-foreground'"
          >
            <AppIcon name="ion:calendar-outline" :size="18" />
          </span>
          <span class="min-w-0 flex-1">
            <span
              class="block truncate text-small"
              :class="option.enabled ? 'text-foreground' : 'text-tertiary-foreground'"
            >
              {{ option.label }}
            </span>
            <span class="block truncate text-micro text-tertiary-foreground">
              {{ dateSubLabel(option) }}
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
            共 {{ filtered.length }} 条消息 · {{ selectedLabel }}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
            @click="openCalendar"
          >
            <AppIcon name="ion:calendar-outline" :size="14" />
            选择日期
          </button>
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
          :hint="
            selectedDate === 'all'
              ? '当前会话还没有聊天记录'
              : '该日期没有聊天记录，请选择有消息的日期'
          "
        />

        <template v-else>
          <template v-for="(message, index) in filtered" :key="message.id">
            <p
              v-if="showDateHeader(message, index)"
              class="py-2 text-center text-micro text-time-foreground"
            >
              {{ dayHeaderLabel(message) }}
            </p>
            <MessageBubble
              :message="message"
              @open-forward="onForward"
              @preview="onPreview"
              @open-file="showToast(`查看文件：${$event.fileName}`)"
              @open-card="showToast(`查看名片：${$event.cardTitle}`)"
              @vote="showToast('请在会话中参与投票')"
              @play-audio="showToast('正在播放语音…')"
            />
          </template>
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

    <!-- 日历：支持上/下一年、上/下个月切换；有消息的日期可点击 -->
    <DatePickerDialog
      :visible="showCalendar"
      title="选择聊天日期"
      subtitle="带圆点的日期有聊天记录，灰色日期不可点击"
      :initial-date="calendarInitial"
      :enabled-dates="enabledDateKeys"
      :min-date="startKey"
      disable-future
      select-on-click
      @close="showCalendar = false"
      @confirm="onCalendarPick"
    />

    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
