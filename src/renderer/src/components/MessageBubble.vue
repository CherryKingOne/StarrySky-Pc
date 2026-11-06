<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import { avatarIndexOf } from '@renderer/utils/chat'
import type { ChatMessage } from '@renderer/types'

interface MessageAvatar {
  name: string
  index?: number
  avatarUrl?: string | null
}

const props = withDefaults(
  defineProps<{
    message: ChatMessage
    highlight?: boolean
    /** 自己（右侧）头像，未传时用「我」的首字占位 */
    selfAvatar?: MessageAvatar
    /** 对方（左侧）头像，未传时按消息发送者生成首字占位 */
    senderAvatar?: MessageAvatar
  }>(),
  { highlight: false, selfAvatar: undefined, senderAvatar: undefined }
)

const emit = defineEmits<{
  contextmenu: [event: MouseEvent]
  preview: [message: ChatMessage]
  'open-file': [message: ChatMessage]
  'open-forward': [message: ChatMessage]
  'open-card': [message: ChatMessage]
  vote: [index: number]
  'play-audio': [message: ChatMessage]
}>()

const isOut = computed(() => props.message.direction === 'out')
const bubbleBg = computed(() => (isOut.value ? 'bg-message-out' : 'bg-message-in'))
const bubbleText = computed(() => (isOut.value ? 'text-on-accent' : 'text-foreground'))
const subText = computed(() => (isOut.value ? 'text-on-accent/80' : 'text-secondary-foreground'))
const hintText = computed(() => (isOut.value ? 'text-on-accent/70' : 'text-hint-foreground'))
const bubbleBorder = computed(() =>
  isOut.value ? 'border border-white/20' : 'border border-black/10'
)

const incomingAvatar = computed<MessageAvatar>(() => {
  if (props.senderAvatar) return props.senderAvatar
  const name = props.message.sender || '对方'
  return { name, index: avatarIndexOf(name), avatarUrl: null }
})

const outgoingAvatar = computed<MessageAvatar>(
  () => props.selfAvatar ?? { name: '我', index: 1, avatarUrl: null }
)

const TONES = [
  'linear-gradient(135deg, #dbe1f0 0%, #c7d2fe 100%)',
  'linear-gradient(135deg, #d6e4fb 0%, #a9c7f5 100%)',
  'linear-gradient(135deg, #dcefe4 0%, #b7ddc6 100%)',
  'linear-gradient(135deg, #f6e3cf 0%, #efc6a2 100%)',
  'linear-gradient(135deg, #ece0f7 0%, #d4bcee 100%)',
  'linear-gradient(135deg, #fbe0e0 0%, #f3bdbd 100%)'
]

const imageStyle = computed(() => ({
  background: TONES[(props.message.imageTone ?? 1) % TONES.length]
}))

const fileIcon = computed(() => {
  const name = props.message.fileName ?? ''
  if (name.endsWith('.pdf')) return 'ion:document'
  if (/\.(png|jpe?g|webp|gif)$/i.test(name)) return 'ion:image'
  if (/\.(zip|rar|7z)$/i.test(name)) return 'ion:archive'
  if (/\.(ppt|pptx)$/i.test(name)) return 'ion:easel'
  return 'ion:document-text'
})

function onContextMenu(event: MouseEvent): void {
  event.preventDefault()
  emit('contextmenu', event)
}

function playAudio(): void {
  if (props.message.audioUrl) {
    const audio = new Audio(props.message.audioUrl)
    audio.play().catch(() => emit('play-audio', props.message))
    return
  }
  emit('play-audio', props.message)
}
</script>

<template>
  <div
    class="mb-5 flex w-full items-end gap-2 transition-colors"
    :class="[
      isOut ? 'justify-end' : 'justify-start',
      highlight ? 'rounded-md bg-message-selected py-1' : ''
    ]"
    @contextmenu="onContextMenu"
  >
    <Avatar
      v-if="!isOut && message.kind !== 'notification'"
      class="mb-0.5 shrink-0"
      :name="incomingAvatar.name"
      :index="incomingAvatar.index ?? avatarIndexOf(incomingAvatar.name)"
      :avatar-url="incomingAvatar.avatarUrl"
      :rounded="true"
      :size="32"
    />

    <div v-if="message.kind === 'notification'" class="w-full text-center">
      <span class="text-caption text-tertiary-foreground">{{ message.text }}</span>
    </div>

    <button
      v-else-if="message.kind === 'file'"
      v-tooltip="'查看文件详情'"
      type="button"
      class="flex w-[260px] cursor-pointer items-center gap-3 rounded-md border px-3 py-3 text-left transition-opacity hover:opacity-90"
      :class="[bubbleBg, bubbleBorder]"
      @click="emit('open-file', message)"
    >
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
        :class="isOut ? 'bg-white/25' : 'bg-selected-alt'"
      >
        <AppIcon :name="fileIcon" :size="20" class="text-accent" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate text-small" :class="bubbleText">{{ message.fileName }}</p>
        <p class="text-micro" :class="hintText">{{ message.fileSize }}</p>
      </div>
      <AppIcon name="ion:ios-download-outline" :size="16" class="shrink-0" :class="hintText" />
    </button>

    <button
      v-else-if="message.kind === 'audio'"
      v-tooltip="'播放语音'"
      type="button"
      class="bubble flex cursor-pointer items-center gap-3 border transition-opacity hover:opacity-90"
      :class="[bubbleBg, bubbleBorder]"
      @click="playAudio"
    >
      <AppIcon name="ion:ios-mic" :size="18" class="shrink-0 text-accent" />
      <div class="flex h-5 items-end gap-0.5">
        <span
          v-for="index in 8"
          :key="index"
          class="w-0.5 rounded-full bg-current opacity-70"
          :style="{ height: `${6 + ((index * 5) % 16)}px` }"
        />
      </div>
      <span class="text-micro" :class="subText">{{ message.duration }}</span>
    </button>

    <button
      v-else-if="message.kind === 'image'"
      v-tooltip="'查看大图'"
      type="button"
      class="cursor-zoom-in rounded-md border p-1 transition-transform hover:scale-[1.01]"
      :class="[bubbleBg, bubbleBorder]"
      @click="emit('preview', message)"
    >
      <img
        v-if="message.imageUrl"
        :src="message.imageUrl"
        :alt="message.imageLabel || '图片'"
        class="max-h-[240px] max-w-[260px] rounded-sm object-cover"
      />
      <div
        v-else
        class="flex h-[140px] w-[220px] flex-col items-center justify-center gap-2 rounded-sm"
        :style="imageStyle"
      >
        <AppIcon name="ion:image" :size="32" class="text-foreground/50" />
        <span class="max-w-[190px] truncate text-micro text-secondary-foreground">
          {{ message.imageLabel || '图片' }}
        </span>
      </div>
    </button>

    <div
      v-else-if="message.kind === 'quote'"
      class="bubble max-w-[70%] cursor-context-menu border"
      :class="[bubbleBg, bubbleBorder]"
    >
      <div
        class="mb-2 rounded-sm px-2 py-1 text-caption"
        :class="[isOut ? 'bg-white/20' : 'bg-message-quoted', subText]"
      >
        <span v-if="message.quotedSender" class="mr-1">{{ message.quotedSender }}：</span>
        {{ message.quoted }}
      </div>
      <p class="text-message" :class="bubbleText">{{ message.text }}</p>
    </div>

    <div
      v-else-if="message.kind === 'poll'"
      class="bubble w-[300px] cursor-context-menu border"
      :class="[bubbleBg, bubbleBorder]"
    >
      <p class="mb-1 text-small font-medium" :class="bubbleText">{{ message.text }}</p>
      <p class="mb-2 text-micro" :class="hintText">投票 · 点击选项投票</p>
      <button
        v-for="(option, index) in message.options ?? []"
        :key="option.label"
        type="button"
        class="mb-1.5 flex h-[26px] w-full items-center justify-between gap-2 rounded-sm px-2 text-left transition-colors last:mb-0"
        :class="
          message.votedIndex === index
            ? 'bg-conv-active text-foreground'
            : 'bg-item-hover text-foreground hover:bg-selected-alt'
        "
        @click="emit('vote', index)"
      >
        <span class="truncate text-small">
          <AppIcon
            v-if="message.votedIndex === index"
            name="ion:checkmark"
            :size="12"
            class="mr-1 inline-block text-accent"
          />
          {{ option.label }}
        </span>
        <span class="shrink-0 text-micro text-secondary-foreground">{{ option.votes }}</span>
      </button>
    </div>

    <button
      v-else-if="message.kind === 'forward'"
      v-tooltip="'查看合并转发内容'"
      type="button"
      class="bubble w-[280px] cursor-pointer border text-left transition-opacity hover:opacity-90"
      :class="[bubbleBg, bubbleBorder]"
      @click="emit('open-forward', message)"
    >
      <p class="mb-2 truncate text-small font-medium" :class="bubbleText">
        {{ message.forwardTitle }}
      </p>
      <p
        v-for="line in message.forwardLines ?? []"
        :key="line"
        class="truncate text-caption"
        :class="subText"
      >
        {{ line }}
      </p>
      <div class="mt-2 flex items-center gap-1 text-micro" :class="hintText">
        <AppIcon name="ion:ios-albums" :size="12" />
        聊天记录
      </div>
    </button>

    <button
      v-else-if="message.kind === 'card'"
      v-tooltip="'查看名片'"
      type="button"
      class="flex w-[260px] cursor-pointer items-center gap-3 rounded-md border px-3 py-3 text-left transition-opacity hover:opacity-90"
      :class="[bubbleBg, bubbleBorder]"
      @click="emit('open-card', message)"
    >
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-selected-alt">
        <AppIcon :name="message.cardIcon || 'ion:person'" :size="20" class="text-accent" />
      </div>
      <div class="min-w-0">
        <p class="truncate text-small font-medium" :class="bubbleText">{{ message.cardTitle }}</p>
        <p class="truncate text-micro" :class="hintText">{{ message.cardSubtitle }}</p>
        <p class="truncate text-micro" :class="hintText">{{ message.cardDesc }}</p>
      </div>
    </button>

    <div
      v-else
      class="bubble max-w-[70%] cursor-context-menu border"
      :class="[bubbleBg, bubbleBorder]"
    >
      <p class="text-message" :class="bubbleText">{{ message.text }}</p>
    </div>

    <Avatar
      v-if="isOut && message.kind !== 'notification'"
      class="mb-0.5 shrink-0"
      :name="outgoingAvatar.name"
      :index="outgoingAvatar.index ?? avatarIndexOf(outgoingAvatar.name)"
      :avatar-url="outgoingAvatar.avatarUrl"
      :rounded="true"
      :size="32"
    />
  </div>
</template>
