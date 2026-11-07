<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    index?: number
    size?: 28 | 32 | 36 | 40 | 64 | 96
    rounded?: boolean
    avatarUrl?: string | null
  }>(),
  { index: 1, size: 36, rounded: true, avatarUrl: null }
)

const colorClass = computed(() => `bg-avatar-${props.index}`)
const sizeClass = computed(() => {
  if (props.size === 28) return 'h-7 w-7 text-xs'
  if (props.size === 32) return 'h-8 w-8 text-xs'
  if (props.size === 40) return 'h-10 w-10 text-base'
  if (props.size === 64) return 'h-16 w-16 text-2xl'
  if (props.size === 96) return 'h-24 w-24 text-4xl'
  return 'h-9 w-9 text-sm'
})
const initial = computed(() => props.name.trim().charAt(0).toUpperCase() || '#')

const failed = ref(false)
watch(
  () => props.avatarUrl,
  () => {
    failed.value = false
  }
)
const showImage = computed(() => Boolean(props.avatarUrl) && !failed.value)
</script>

<template>
  <div
    class="relative shrink-0 select-none overflow-hidden font-medium text-on-accent"
    :class="[showImage ? '' : colorClass, sizeClass, rounded ? 'rounded-md' : 'rounded-full']"
  >
    <img
      v-if="showImage"
      :src="avatarUrl ?? ''"
      :alt="name"
      class="h-full w-full object-cover"
      @error="failed = true"
    />
    <span v-else class="flex h-full w-full items-center justify-center">{{ initial }}</span>
  </div>
</template>
