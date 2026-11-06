<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import ContextMenu, { type MenuItem } from '@renderer/components/ContextMenu.vue'
import StickerPanel from '@renderer/components/StickerPanel.vue'
import type { CallMode } from '@renderer/types'

const props = withDefaults(
  defineProps<{
    replyTo?: { sender: string; text: string } | null
    /** 会话标题，用于语音/视频通话弹层 */
    title?: string
  }>(),
  { replyTo: null, title: '林晓' }
)

const emit = defineEmits<{
  send: [text: string]
  toast: [message: string]
  'send-file': [payload: { name: string; size: string }]
  'send-image': [payload: { name: string }]
  'send-audio': [payload: { duration: string }]
  'send-poll': []
  'send-card': []
  'request-forward': []
  'open-favorites': []
  'clear-reply': []
  call: [mode: CallMode]
  action: [key: string]
}>()

const text = ref('')
const editor = ref<HTMLTextAreaElement | null>(null)
const showStickerPanel = ref(false)
const showAttachMenu = ref(false)
const showMoreMenu = ref(false)
const showActionsMenu = ref(false)

const toolRefs = reactive<Record<string, HTMLElement | null>>({})
function setToolRef(key: string, el: unknown): void {
  toolRefs[key] = (el as HTMLElement) ?? null
}

const fileInput = ref<HTMLInputElement | null>(null)
const pickMode = ref<'file' | 'image'>('file')

const recording = ref(false)
const recordSeconds = ref(0)
let recordTimer: ReturnType<typeof setInterval> | undefined

const leftTools = [
  { icon: 'ion:ios-heart', key: 'sticker', label: '表情' },
  { icon: 'ion:ios-attach', key: 'attach', label: '发送文件' },
  { icon: 'ion:scissors', key: 'screenshot', label: '截图' },
  { icon: 'ion:chatboxes', key: 'chat', label: '合并转发' },
  { icon: 'ion:ios-radio-button-on', key: 'more', label: '更多' },
  { icon: 'ion:ios-mic', key: 'voice', label: '语音消息' },
  { icon: 'ion:ios-list', key: 'list', label: '消息历史' },
  { icon: 'ion:stats-bars', key: 'stats', label: '消息统计' }
]

const rightTools = [
  { icon: 'ion:ios-call', key: 'audio-call', label: '语音通话' },
  { icon: 'ion:ios-videocam', key: 'video-call', label: '视频通话' },
  { icon: 'ion:desktop', key: 'screen-share', label: '屏幕共享' },
  { icon: 'ion:ios-menu', key: 'more-actions', label: '更多操作' }
]

const attachItems: MenuItem[] = [
  { key: 'file', label: '发送文件', icon: 'ion:document' },
  { key: 'image', label: '发送图片', icon: 'ion:image' },
  { key: 'folder', label: '文件记录', icon: 'ion:folder' }
]

const moreItems: MenuItem[] = [
  { key: 'poll', label: '发起投票', icon: 'ion:stats-bars' },
  { key: 'card', label: '分享名片', icon: 'ion:person' },
  { key: 'favorites', label: '我的收藏', icon: 'ion:ios-star' },
  { key: 'schedule', label: '日程', icon: 'ion:calendar' }
]

const actionItems: MenuItem[] = [
  { key: 'history', label: '消息历史', icon: 'ion:ios-list' },
  { key: 'files', label: '聊天文件', icon: 'ion:folder' },
  { key: 'forward', label: '合并转发', icon: 'ion:chatboxes' },
  { key: 'sep', label: '', separator: true },
  { key: 'clear', label: '清空聊天记录', icon: 'ion:ios-trash', danger: true }
]

const recordLabel = computed(() => {
  const mm = Math.floor(recordSeconds.value / 60)
  const ss = recordSeconds.value % 60
  return `${mm}:${String(ss).padStart(2, '0')}`
})

function focusEditor(): void {
  void nextTick(() => editor.value?.focus())
}

function submit(): void {
  const value = text.value.trim()
  if (!value) return
  emit('send', value)
  text.value = ''
  showStickerPanel.value = false
  focusEditor()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    event.preventDefault()
    submit()
  }
}

function pickFile(mode: 'file' | 'image'): void {
  pickMode.value = mode
  showAttachMenu.value = false
  fileInput.value?.click()
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (pickMode.value === 'image' || file.type.startsWith('image/')) {
    emit('send-image', { name: file.name })
    return
  }
  const size =
    file.size > 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.max(1, Math.round(file.size / 1024))} KB`
  emit('send-file', { name: file.name, size })
}

async function captureScreenshot(): Promise<void> {
  const media = navigator.mediaDevices as MediaDevices | undefined
  if (!media?.getDisplayMedia) {
    emit('toast', '当前环境不支持截屏，请使用系统截图后粘贴')
    return
  }
  try {
    const stream = await media.getDisplayMedia({ video: true })
    const video = document.createElement('video')
    video.srcObject = stream
    await video.play()
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    stream.getTracks().forEach((track) => track.stop())
    emit('send-image', { name: '屏幕截图.png' })
    emit('toast', '截图已发送')
  } catch {
    emit('toast', '已取消截图')
  }
}

function toggleRecord(): void {
  if (recording.value) {
    recording.value = false
    if (recordTimer) clearInterval(recordTimer)
    recordTimer = undefined
    emit('send-audio', { duration: recordLabel.value })
    recordSeconds.value = 0
    return
  }
  recording.value = true
  recordSeconds.value = 0
  recordTimer = setInterval(() => {
    recordSeconds.value += 1
  }, 1000)
  emit('toast', '正在录音，再次点击结束')
}

function onToolClick(key: string): void {
  switch (key) {
    case 'sticker':
      showStickerPanel.value = !showStickerPanel.value
      showAttachMenu.value = false
      showMoreMenu.value = false
      break
    case 'attach':
      showAttachMenu.value = !showAttachMenu.value
      showStickerPanel.value = false
      break
    case 'screenshot':
      void captureScreenshot()
      break
    case 'chat':
      emit('request-forward')
      break
    case 'more':
      showMoreMenu.value = !showMoreMenu.value
      break
    case 'voice':
      toggleRecord()
      break
    case 'list':
      emit('action', 'history')
      break
    case 'stats':
      emit('action', 'stats')
      break
  }
}

function onRightToolClick(key: string): void {
  if (key === 'audio-call') emit('call', 'audio')
  else if (key === 'video-call') emit('call', 'video')
  else if (key === 'screen-share') emit('call', 'screen')
  else showActionsMenu.value = !showActionsMenu.value
}

function onAttachSelect(key: string): void {
  showAttachMenu.value = false
  if (key === 'file') pickFile('file')
  else if (key === 'image') pickFile('image')
  else emit('action', 'files')
}

function onMoreSelect(key: string): void {
  showMoreMenu.value = false
  if (key === 'poll') emit('send-poll')
  else if (key === 'card') emit('send-card')
  else if (key === 'favorites') emit('open-favorites')
  else emit('action', 'schedule')
}

function onActionSelect(key: string): void {
  showActionsMenu.value = false
  if (key === 'forward') emit('request-forward')
  else emit('action', key)
}

function onStickerSelect(emoji: string): void {
  text.value += emoji
  focusEditor()
}

onBeforeUnmount(() => {
  if (recordTimer) clearInterval(recordTimer)
})
</script>

<template>
  <section class="flex h-input w-full shrink-0 flex-col bg-tertiary">
    <div class="mx-3 h-px bg-border-strong" />

    <div class="flex items-center gap-1 overflow-hidden px-2 pt-2">
      <div
        class="scrollbar-none flex h-10 min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overflow-y-hidden"
      >
        <button
          v-for="tool in leftTools"
          :key="tool.key"
          :ref="(el) => setToolRef(tool.key, el)"
          type="button"
          class="icon-button h-10 w-10 shrink-0 rounded-sm"
          :class="
            (tool.key === 'sticker' && showStickerPanel) || (tool.key === 'voice' && recording)
              ? 'bg-item-hover text-accent'
              : ''
          "
          :title="tool.label"
          @click="onToolClick(tool.key)"
        >
          <AppIcon :name="tool.icon" :size="20" />
        </button>
      </div>
      <div class="ml-auto flex shrink-0 items-center gap-0.5">
        <button
          v-for="tool in rightTools"
          :key="tool.key"
          :ref="(el) => setToolRef(tool.key, el)"
          type="button"
          class="icon-button h-10 w-10 shrink-0 rounded-sm"
          :title="tool.label"
          @click="onRightToolClick(tool.key)"
        >
          <AppIcon :name="tool.icon" :size="20" />
        </button>
      </div>
    </div>

    <!-- 引用回复 -->
    <div
      v-if="props.replyTo"
      class="mx-5 mt-2 flex items-center gap-2 rounded-sm bg-item-hover px-3 py-1.5"
    >
      <span class="shrink-0 text-micro text-accent">回复 {{ props.replyTo.sender }}</span>
      <span class="min-w-0 flex-1 truncate text-micro text-secondary-foreground">
        {{ props.replyTo.text }}
      </span>
      <button
        type="button"
        class="icon-button h-5 w-5 shrink-0 rounded-sm"
        title="取消回复"
        @click="emit('clear-reply')"
      >
        <AppIcon name="ion:close" :size="12" />
      </button>
    </div>

    <div
      v-if="recording"
      class="mx-5 mt-2 flex items-center gap-2 rounded-sm bg-message-selected px-3 py-2"
    >
      <span class="h-2 w-2 animate-pulse rounded-full bg-danger" />
      <span class="text-small text-foreground">录音中 {{ recordLabel }}</span>
      <span class="text-micro text-tertiary-foreground">再次点击麦克风发送</span>
    </div>

    <textarea
      ref="editor"
      v-model="text"
      rows="4"
      class="mt-2 flex-1 w-full resize-none bg-transparent px-5 text-base text-foreground outline-none placeholder:text-placeholder-foreground"
      placeholder="Enter 发送，Shift+Enter 换行"
      @keydown="onKeydown"
    />

    <div class="flex items-center justify-end gap-3 px-3 pb-3">
      <span class="text-micro text-time-foreground">Enter 发送，Shift+Enter 换行</span>
      <button type="button" class="btn-primary h-[30px] w-[72px]" @click="submit">发送</button>
    </div>

    <input ref="fileInput" type="file" class="hidden" @change="onFileChange" />

    <!-- P15-14 表情面板：锚定在表情按钮上方 -->
    <StickerPanel
      :visible="showStickerPanel"
      :anchor="toolRefs.sticker"
      @update:visible="showStickerPanel = $event"
      @select="onStickerSelect"
    />

    <!-- 附件菜单 -->
    <ContextMenu
      v-model:visible="showAttachMenu"
      :items="attachItems"
      :anchor="toolRefs.attach"
      @select="onAttachSelect"
    />

    <!-- 更多菜单 -->
    <ContextMenu
      v-model:visible="showMoreMenu"
      :items="moreItems"
      :anchor="toolRefs.more"
      @select="onMoreSelect"
    />

    <!-- 右侧更多操作 -->
    <ContextMenu
      v-model:visible="showActionsMenu"
      :items="actionItems"
      :anchor="toolRefs['more-actions']"
      align="end"
      @select="onActionSelect"
    />
  </section>
</template>
