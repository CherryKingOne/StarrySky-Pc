<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const TOAST_DURATION = 1800

const props = defineProps<{
  message: string
}>()

const emit = defineEmits<{ close: [] }>()

const visible = ref(false)
let autoCloseTimer: ReturnType<typeof setTimeout> | undefined

function clearTimer(): void {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer)
    autoCloseTimer = undefined
  }
}

onBeforeUnmount(clearTimer)

watch(
  () => props.message,
  () => {
    if (!props.message) {
      visible.value = false
      clearTimer()
      return
    }
    visible.value = true
    clearTimer()
    autoCloseTimer = setTimeout(() => {
      visible.value = false
      autoCloseTimer = undefined
      emit('close')
    }, TOAST_DURATION)
  },
  { immediate: true }
)
</script>

<template>
  <Teleport to="#app">
    <div
      v-if="visible"
      class="popup-layer pointer-events-none absolute inset-x-0 top-[72px] z-[95] flex justify-center px-4"
    >
      <div
        class="flex max-w-[80%] items-center gap-2 rounded-md bg-action px-3 py-2 text-center text-small text-on-accent shadow-popover"
        role="status"
        aria-live="polite"
      >
        <span class="break-words">{{ message }}</span>
      </div>
    </div>
  </Teleport>
</template>
