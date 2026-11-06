<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    index?: number
    size?: 32 | 36 | 40 | 64
    rounded?: boolean
  }>(),
  { index: 1, size: 36, rounded: true }
)

const colorClass = computed(() => `bg-avatar-${props.index}`)
const sizeClass = computed(() => {
  if (props.size === 32) return 'h-8 w-8 text-xs'
  if (props.size === 40) return 'h-10 w-10 text-base'
  if (props.size === 64) return 'h-16 w-16 text-2xl'
  return 'h-9 w-9 text-sm'
})
const initial = computed(() => props.name.trim().charAt(0).toUpperCase() || '#')
</script>

<template>
  <div
    class="flex shrink-0 select-none items-center justify-center font-medium text-on-accent"
    :class="[colorClass, sizeClass, rounded ? 'rounded-md' : 'rounded-full']"
  >
    {{ initial }}
  </div>
</template>
