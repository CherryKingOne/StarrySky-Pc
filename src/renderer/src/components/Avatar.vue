<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import { resolveMediaUrl } from '@renderer/utils/chat'

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
const iconSize = computed(() => {
  if (props.size === 28) return 14
  if (props.size === 32) return 16
  if (props.size === 40) return 20
  if (props.size === 64) return 32
  if (props.size === 96) return 44
  return 18
})

/** 无头像兜底：字母/汉字取首字符；数字、符号等改用通用人像，避免出现无意义字符 */
const initial = computed(() => {
  const first = props.name.trim().charAt(0)
  return first && /[\p{L}]/u.test(first) ? first.toUpperCase() : ''
})

const failed = ref(false)
watch(
  () => props.avatarUrl,
  () => {
    failed.value = false
  }
)
const resolvedUrl = computed(() => resolveMediaUrl(props.avatarUrl) ?? null)
const showImage = computed(() => Boolean(resolvedUrl.value) && !failed.value)
</script>

<template>
  <div
    class="relative shrink-0 select-none overflow-hidden font-medium text-on-accent"
    :class="[showImage ? '' : colorClass, sizeClass, rounded ? 'rounded-md' : 'rounded-full']"
  >
    <img
      v-if="showImage"
      :src="resolvedUrl ?? ''"
      :alt="name"
      class="h-full w-full object-cover"
      @error="failed = true"
    />
    <span v-else-if="initial" class="flex h-full w-full items-center justify-center">
      {{ initial }}
    </span>
    <span v-else class="flex h-full w-full items-center justify-center opacity-80">
      <AppIcon name="ion:person" :size="iconSize" />
    </span>
  </div>
</template>
