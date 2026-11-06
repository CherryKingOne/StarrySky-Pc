<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import type { ChatMessage } from '@renderer/types'

const props = defineProps<{ message: ChatMessage }>()

const isOut = computed(() => props.message.direction === 'out')
const bubbleBg = computed(() => (isOut.value ? 'bg-message-out' : 'bg-message-in'))
const bubbleText = computed(() => (isOut.value ? 'text-on-accent' : 'text-foreground'))
const subText = computed(() => (isOut.value ? 'text-on-accent/80' : 'text-secondary-foreground'))
const hintText = computed(() => (isOut.value ? 'text-on-accent/70' : 'text-hint-foreground'))
const bubbleBorder = computed(() => (isOut.value ? 'border border-white/20' : 'border border-black/10'))
</script>

<template>
  <div class="mb-5 flex w-full items-end" :class="isOut ? 'justify-end' : 'justify-start'">
    <div v-if="message.kind === 'notification'" class="w-full text-center">
      <span class="text-caption text-tertiary-foreground">{{ message.text }}</span>
    </div>

    <div
      v-else-if="message.kind === 'file'"
      class="flex w-[260px] items-center gap-3 rounded-md px-3 py-3 border"
      :class="[bubbleBg, bubbleBorder]"
    >
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
        :class="isOut ? 'bg-white/25' : 'bg-selected-alt'"
      >
        <AppIcon name="ion:document" :size="20" class="text-accent" />
      </div>
      <div class="min-w-0">
        <p class="truncate text-small" :class="bubbleText">{{ message.fileName }}</p>
        <p class="text-micro" :class="hintText">{{ message.fileSize }}</p>
      </div>
    </div>

    <div v-else-if="message.kind === 'audio'" class="bubble flex items-center gap-3" :class="[bubbleBg, bubbleBorder]">
      <AppIcon name="ion:ios-mic" :size="18" class="shrink-0 text-accent" />
      <div class="flex h-5 items-end gap-0.5">
        <span
          v-for="index in 8"
          :key="index"
          class="w-0.5 rounded-full bg-current opacity-70"
          :style="{ height: `${6 + ((index * 5) % 16)}px` }"
        />
      </div>
      <span class="text-micro text-secondary-foreground">{{ message.duration }}</span>
    </div>

    <div v-else-if="message.kind === 'image'" class="rounded-md p-1 border" :class="[bubbleBg, bubbleBorder]">
      <div class="flex h-[140px] w-[220px] items-center justify-center rounded-sm bg-message-quoted">
        <AppIcon name="ion:image" :size="36" class="text-icon" />
      </div>
    </div>

    <div v-else-if="message.kind === 'quote'" class="bubble max-w-[70%]" :class="[bubbleBg, bubbleBorder]">
      <div class="mb-2 rounded-sm px-2 py-1 text-caption" :class="[isOut ? 'bg-white/20' : 'bg-message-quoted', subText]">
        {{ message.quoted }}
      </div>
      <p class="text-message" :class="bubbleText">{{ message.text }}</p>
    </div>

    <div v-else-if="message.kind === 'poll'" class="bubble w-[300px]" :class="[bubbleBg, bubbleBorder]">
      <p class="mb-3 text-small font-medium" :class="bubbleText">{{ message.text }}</p>
      <div
        v-for="(option, index) in message.options ?? []"
        :key="option.label"
        class="mb-1.5 flex h-[26px] items-center justify-between gap-2 rounded-sm px-2 last:mb-0"
        :class="index === 0 ? 'bg-conv-active' : 'bg-item-hover'"
      >
        <span class="truncate text-small" :class="bubbleText">{{ option.label }}</span>
        <span class="shrink-0 text-micro" :class="subText">{{ option.votes }}</span>
      </div>
    </div>

    <div v-else-if="message.kind === 'forward'" class="bubble w-[280px]" :class="[bubbleBg, bubbleBorder]">
      <p class="mb-2 truncate text-small font-medium" :class="bubbleText">{{ message.forwardTitle }}</p>
      <p
        v-for="line in message.forwardLines ?? []"
        :key="line"
        class="truncate text-caption"
        :class="subText"
      >
        {{ line }}
      </p>
    </div>

    <div v-else class="bubble max-w-[70%]" :class="[bubbleBg, bubbleBorder]">
      <p class="text-message" :class="bubbleText">{{ message.text }}</p>
    </div>
  </div>
</template>
