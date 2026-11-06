<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    icon: string
    size?: number
    box?: 28 | 32
    active?: boolean
    rounded?: 'sm' | 'md' | 'full'
  }>(),
  { size: 20, box: 32, active: false, rounded: 'md' }
)

const boxClass = computed(() => (props.box === 28 ? 'h-7 w-7' : 'h-8 w-8'))
const radiusClass = computed(() => {
  if (props.rounded === 'sm') return 'rounded-sm'
  if (props.rounded === 'full') return 'rounded-full'
  return 'rounded-md'
})
</script>

<template>
  <button
    type="button"
    class="icon-button shrink-0"
    :class="[boxClass, radiusClass, active ? 'text-accent' : 'text-icon']"
  >
    <AppIcon :name="icon" :size="size" />
  </button>
</template>
