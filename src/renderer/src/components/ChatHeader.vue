<script setup lang="ts">
import { ref } from 'vue'
import IconButton from '@renderer/components/IconButton.vue'

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    pinned?: boolean
  }>(),
  { subtitle: '', pinned: false }
)

const emit = defineEmits<{
  search: []
  pin: []
  info: []
}>()

const hovering = ref(false)
</script>

<template>
  <header class="flex h-header w-full shrink-0 items-center border-b border-divider bg-panel px-5">
    <div class="min-w-0 flex-1">
      <h2 class="truncate text-section text-foreground">{{ title }}</h2>
      <p class="truncate text-caption text-secondary-foreground">{{ subtitle }}</p>
    </div>
    <div
      class="flex shrink-0 items-center gap-1"
      @mouseenter="hovering = true"
      @mouseleave="hovering = false"
    >
      <span class="mr-1 hidden text-micro text-tertiary-foreground sm:inline">
        {{ hovering ? '搜索 / 置顶 / 会话信息' : '' }}
      </span>
      <IconButton
        icon="ion:search"
        :size="20"
        :box="32"
        title="查找聊天记录"
        @click="emit('search')"
      />
      <IconButton
        icon="ion:pin"
        :size="20"
        :box="32"
        :active="props.pinned"
        :title="props.pinned ? '取消置顶' : '置顶会话'"
        @click="emit('pin')"
      />
      <IconButton
        icon="ion:navicon-round"
        :size="20"
        :box="32"
        title="聊天信息"
        @click="emit('info')"
      />
    </div>
  </header>
</template>
