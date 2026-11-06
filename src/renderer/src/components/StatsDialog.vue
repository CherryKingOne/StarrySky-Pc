<script setup lang="ts">
import { computed } from 'vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'
import type { Conversation } from '@renderer/types'

const props = defineProps<{
  visible: boolean
  conversation: Conversation | undefined
}>()

const emit = defineEmits<{ close: [] }>()

const stats = computed(() => {
  const messages = props.conversation?.messages ?? []
  const inCount = messages.filter((message) => message.direction === 'in').length
  const outCount = messages.filter((message) => message.direction === 'out').length
  const byKind = (kind: string): number =>
    messages.filter((message) => message.kind === kind).length
  return {
    total: messages.length,
    inCount,
    outCount,
    image: byKind('image'),
    file: byKind('file'),
    audio: byKind('audio'),
    other: messages.length - byKind('text') - byKind('image') - byKind('file') - byKind('audio')
  }
})

const bars = computed(() => {
  const { inCount, outCount, total } = stats.value
  const max = Math.max(1, inCount, outCount, total)
  return [
    { label: '接收', value: inCount, width: `${(inCount / max) * 100}%` },
    { label: '发送', value: outCount, width: `${(outCount / max) * 100}%` },
    { label: '总计', value: total, width: `${(total / max) * 100}%` }
  ]
})

const kinds = computed(() => [
  { label: '图片', value: stats.value.image },
  { label: '文件', value: stats.value.file },
  { label: '语音', value: stats.value.audio },
  { label: '其他', value: stats.value.other }
])
</script>

<template>
  <PopupDialog
    :visible="visible"
    title="消息统计"
    :subtitle="conversation ? conversation.name : ''"
    width="420px"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-3">
      <div v-for="bar in bars" :key="bar.label" class="flex items-center gap-3">
        <span class="w-10 shrink-0 text-caption text-secondary-foreground">{{ bar.label }}</span>
        <div class="h-2 flex-1 overflow-hidden rounded-full bg-item-hover">
          <div class="h-full rounded-full bg-accent" :style="{ width: bar.width }" />
        </div>
        <span class="w-8 shrink-0 text-right text-small text-foreground">{{ bar.value }}</span>
      </div>
    </div>

    <div class="section-divider my-4" />

    <div class="grid grid-cols-4 gap-2">
      <div
        v-for="kind in kinds"
        :key="kind.label"
        class="flex flex-col items-center gap-1 rounded-md bg-item-hover py-3"
      >
        <span class="text-section text-foreground">{{ kind.value }}</span>
        <span class="text-micro text-secondary-foreground">{{ kind.label }}</span>
      </div>
    </div>

    <p class="mt-3 text-micro text-tertiary-foreground">
      统计仅包含当前会话已加载的消息，用于演示数据概况。
    </p>
  </PopupDialog>
</template>
