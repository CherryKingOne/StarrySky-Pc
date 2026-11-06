<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import type { CallMode } from '@renderer/types'

const props = withDefaults(
  defineProps<{
    visible: boolean
    mode: CallMode
    title?: string
    avatarIndex?: number
    members?: { name: string; index: number }[]
  }>(),
  { title: '林晓', avatarIndex: 1, members: () => [] }
)

const emit = defineEmits<{
  close: []
  toast: [message: string]
}>()

const micOn = ref(true)
const videoOn = ref(true)
const sharing = ref(false)
const seconds = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

const isGroup = computed(() => props.mode === 'group' || props.mode === 'meeting')
const isVideo = computed(
  () => props.mode === 'video' || props.mode === 'group' || props.mode === 'meeting'
)

const modeLabel = computed(() => {
  switch (props.mode) {
    case 'audio':
      return '语音通话中'
    case 'video':
      return '视频通话中'
    case 'group':
      return '多人通话中'
    case 'meeting':
      return '会议进行中'
    case 'screen':
      return '屏幕共享中'
    default:
      return '远程控制中'
  }
})

const duration = computed(() => {
  const mm = String(Math.floor(seconds.value / 60)).padStart(2, '0')
  const ss = String(seconds.value % 60).padStart(2, '0')
  return `${mm}:${ss}`
})

const tiles = computed(() => {
  const list =
    props.members.length > 0
      ? props.members
      : [
          { name: '林晓', index: 1 },
          { name: '陈默', index: 5 },
          { name: '王芳', index: 2 },
          { name: '安子', index: 3 },
          { name: '张三', index: 6 },
          { name: '我', index: 2 }
        ]
  return props.mode === 'meeting' ? list.slice(0, 6) : list.slice(0, 4)
})

function stopTimer(): void {
  if (timer) clearInterval(timer)
  timer = undefined
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      seconds.value = 0
      micOn.value = true
      videoOn.value = props.mode !== 'audio'
      sharing.value = props.mode === 'screen'
      stopTimer()
      timer = setInterval(() => {
        seconds.value += 1
      }, 1000)
    } else {
      stopTimer()
    }
  }
)

onBeforeUnmount(stopTimer)

function hangup(): void {
  stopTimer()
  emit('toast', '通话已结束')
  emit('close')
}

function toggleMic(): void {
  micOn.value = !micOn.value
  emit('toast', micOn.value ? '麦克风已开启' : '麦克风已静音')
}

function toggleVideo(): void {
  videoOn.value = !videoOn.value
  emit('toast', videoOn.value ? '摄像头已开启' : '摄像头已关闭')
}

function toggleShare(): void {
  sharing.value = !sharing.value
  emit('toast', sharing.value ? '开始共享屏幕' : '已停止共享')
}
</script>

<template>
  <Teleport to="#app">
    <div v-if="visible" class="popup-layer absolute inset-0 z-[100] flex flex-col bg-voip">
      <header class="flex h-16 shrink-0 items-center justify-between px-8">
        <div class="flex items-center gap-2 text-on-accent">
          <AppIcon :name="mode === 'audio' ? 'ion:ios-call' : 'ion:ios-videocam'" :size="18" />
          <span class="text-section">{{ modeLabel }}</span>
          <span class="text-small text-on-accent/70">{{ duration }}</span>
        </div>
        <span class="text-caption text-on-accent/60">{{
          isGroup ? `${tiles.length} 位成员` : title
        }}</span>
      </header>

      <!-- 单人 -->
      <div v-if="!isGroup" class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
        <div
          class="flex h-56 w-80 items-center justify-center rounded-lg border border-white/10 bg-white/5"
          :class="sharing ? 'text-on-accent/40' : ''"
        >
          <div v-if="sharing" class="flex flex-col items-center gap-2 text-on-accent/70">
            <AppIcon name="ion:desktop" :size="40" />
            <span class="text-caption">正在共享「设计评审.pdf」</span>
          </div>
          <Avatar v-else :name="title" :index="avatarIndex" :size="96" />
        </div>
        <p class="text-page text-on-accent">{{ title }}</p>
        <p class="text-small text-on-accent/60">
          {{
            sharing ? '对方可实时看到你的屏幕操作' : isVideo ? '视频画面为规范占位' : '正在通话中'
          }}
        </p>
      </div>

      <!-- 多人 / 会议 -->
      <div v-else class="min-h-0 flex-1 px-6">
        <div
          class="grid h-full grid-cols-2 gap-3 pb-4"
          :class="mode === 'meeting' ? 'grid-cols-3' : ''"
        >
          <div
            v-for="(tile, index) in tiles"
            :key="tile.name"
            class="flex flex-col items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5"
          >
            <Avatar :name="tile.name" :index="tile.index" :size="64" />
            <span class="text-small text-on-accent/80">{{ tile.name }}</span>
            <span v-if="mode === 'meeting' && index === 0" class="text-micro text-status-success">
              正在发言
            </span>
          </div>
        </div>
      </div>

      <!-- 操作栏 -->
      <footer class="flex h-28 shrink-0 items-center justify-center gap-6">
        <button
          type="button"
          class="flex h-12 w-12 items-center justify-center rounded-full transition-colors"
          :class="
            micOn ? 'bg-white/10 text-on-accent hover:bg-white/20' : 'bg-danger text-on-accent'
          "
          :title="micOn ? '静音' : '取消静音'"
          @click="toggleMic"
        >
          <AppIcon :name="micOn ? 'ion:ios-mic' : 'ion:ios-mic-off'" :size="20" />
        </button>
        <button
          v-if="isVideo"
          type="button"
          class="flex h-12 w-12 items-center justify-center rounded-full transition-colors"
          :class="
            videoOn ? 'bg-white/10 text-on-accent hover:bg-white/20' : 'bg-danger text-on-accent'
          "
          :title="videoOn ? '关闭摄像头' : '开启摄像头'"
          @click="toggleVideo"
        >
          <AppIcon :name="videoOn ? 'ion:ios-videocam' : 'ion:videocam-off'" :size="20" />
        </button>
        <button
          type="button"
          class="flex h-12 w-12 items-center justify-center rounded-full transition-colors"
          :class="
            sharing ? 'bg-accent text-on-accent' : 'bg-white/10 text-on-accent hover:bg-white/20'
          "
          title="屏幕共享"
          @click="toggleShare"
        >
          <AppIcon name="ion:desktop" :size="20" />
        </button>
        <button
          type="button"
          class="flex h-12 w-16 items-center justify-center rounded-full bg-danger text-on-accent transition-opacity hover:opacity-90"
          title="挂断"
          @click="hangup"
        >
          <AppIcon name="ion:ios-call" :size="22" class="rotate-[135deg]" />
        </button>
      </footer>
    </div>
  </Teleport>
</template>
