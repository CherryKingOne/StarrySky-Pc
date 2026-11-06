<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    hint?: string
  }>(),
  { title: '安全验证', hint: '拖动滑块完成拼图验证' }
)

const emit = defineEmits<{
  close: []
  verified: []
}>()

const TRACK = 264
const HANDLE = 44

const offset = ref(0)
const dragging = ref(false)
const verified = ref(false)
const startX = ref(0)
const startOffset = ref(0)

const progress = computed(() => `${offset.value}px`)
const done = computed(() => offset.value >= TRACK - HANDLE - 2)

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      offset.value = 0
      verified.value = false
    }
  }
)

function onPointerDown(event: PointerEvent): void {
  if (verified.value) return
  dragging.value = true
  startX.value = event.clientX
  startOffset.value = offset.value
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging.value) return
  const delta = event.clientX - startX.value
  offset.value = Math.max(0, Math.min(TRACK - HANDLE, startOffset.value + delta))
}

function onPointerUp(): void {
  if (!dragging.value) return
  dragging.value = false
  if (done.value) {
    verified.value = true
    emit('verified')
    window.setTimeout(() => emit('close'), 500)
  } else {
    offset.value = 0
  }
}
</script>

<template>
  <PopupDialog
    :visible="visible"
    :title="title"
    :subtitle="hint"
    width="320px"
    @close="emit('close')"
  >
    <div class="flex h-[96px] items-center justify-center rounded-sm bg-selected-alt">
      <div class="flex flex-col items-center gap-1 text-secondary-foreground">
        <AppIcon name="ion:image" :size="28" />
        <span class="text-micro">拼图验证区（演示占位）</span>
      </div>
    </div>

    <div class="relative mt-3 h-11 overflow-hidden rounded-sm border border-border bg-input">
      <div
        class="absolute inset-y-0 left-0 bg-accent/15"
        :style="{ width: `${offset + HANDLE}px` }"
      />
      <span
        class="absolute inset-0 flex items-center justify-center text-small text-secondary-foreground"
      >
        {{ verified ? '验证通过' : '按住滑块，向右拖动' }}
      </span>
      <button
        type="button"
        class="absolute top-0 left-0 flex h-full w-11 cursor-grab items-center justify-center rounded-sm bg-accent text-on-accent active:cursor-grabbing"
        :style="{ transform: `translateX(${progress})` }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <AppIcon :name="verified ? 'ion:checkmark' : 'ion:arrow-forward'" :size="18" />
      </button>
    </div>
  </PopupDialog>
</template>
