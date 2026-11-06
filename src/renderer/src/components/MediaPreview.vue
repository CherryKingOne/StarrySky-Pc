<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import type { ChatMessage } from '@renderer/types'

const props = withDefaults(
  defineProps<{
    visible: boolean
    images: ChatMessage[]
    index?: number
  }>(),
  { index: 0 }
)

const emit = defineEmits<{ close: [] }>()

const current = ref(props.index)

watch(
  () => [props.visible, props.index],
  () => {
    if (props.visible) current.value = Math.max(0, Math.min(props.index, props.images.length - 1))
  },
  { immediate: true }
)

const TONES = [
  'linear-gradient(135deg, #dbe1f0 0%, #c7d2fe 100%)',
  'linear-gradient(135deg, #d6e4fb 0%, #a9c7f5 100%)',
  'linear-gradient(135deg, #dcefe4 0%, #b7ddc6 100%)',
  'linear-gradient(135deg, #f6e3cf 0%, #efc6a2 100%)',
  'linear-gradient(135deg, #ece0f7 0%, #d4bcee 100%)',
  'linear-gradient(135deg, #fbe0e0 0%, #f3bdbd 100%)'
]

const active = computed(() => props.images[current.value])
const background = computed(() => TONES[(active.value?.imageTone ?? 1) % TONES.length])

function prev(): void {
  if (current.value > 0) current.value -= 1
}

function next(): void {
  if (current.value < props.images.length - 1) current.value += 1
}

function onKeydown(event: KeyboardEvent): void {
  if (!props.visible) return
  if (event.key === 'Escape') emit('close')
  if (event.key === 'ArrowLeft') prev()
  if (event.key === 'ArrowRight') next()
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) document.addEventListener('keydown', onKeydown)
    else document.removeEventListener('keydown', onKeydown)
  }
)
</script>

<template>
  <Teleport to="#app">
    <div v-if="visible" class="popup-layer absolute inset-0 z-[100] flex flex-col bg-preview">
      <header class="flex h-16 shrink-0 items-center justify-between px-10">
        <p class="truncate text-small text-on-accent">
          {{ active?.imageLabel || '图片预览' }}
        </p>
        <button
          v-tooltip="'关闭预览'"
          type="button"
          class="icon-button h-8 w-8 rounded-md text-on-accent/80 hover:bg-white/10 hover:text-on-accent"
          @click="emit('close')"
        >
          <AppIcon name="ion:close" :size="20" />
        </button>
      </header>

      <div class="relative flex min-h-0 flex-1 items-center justify-center px-14">
        <button
          v-tooltip="'上一张'"
          type="button"
          class="absolute left-6 flex h-10 w-10 items-center justify-center rounded-full text-on-accent/70 transition-colors hover:bg-white/10 hover:text-on-accent disabled:opacity-30"
          :disabled="current === 0"
          @click="prev"
        >
          <AppIcon name="ion:ios-arrow-left" :size="24" />
        </button>

        <div
          class="flex max-h-[62vh] w-[70%] max-w-[900px] flex-col items-center justify-center gap-3 overflow-hidden rounded-lg shadow-modal"
          :style="active?.imageUrl ? undefined : { background }"
        >
          <img
            v-if="active?.imageUrl"
            :src="active.imageUrl"
            :alt="active.imageLabel || '图片'"
            class="max-h-[58vh] max-w-full object-contain"
          />
          <template v-else>
            <AppIcon name="ion:image" :size="48" class="text-foreground/40" />
            <span class="text-small text-secondary-foreground">{{
              active?.imageLabel || '图片'
            }}</span>
          </template>
          <span class="pb-2 text-micro text-tertiary-foreground">
            {{ current + 1 }} / {{ images.length }}
          </span>
        </div>

        <button
          v-tooltip="'下一张'"
          type="button"
          class="absolute right-6 flex h-10 w-10 items-center justify-center rounded-full text-on-accent/70 transition-colors hover:bg-white/10 hover:text-on-accent disabled:opacity-30"
          :disabled="current >= images.length - 1"
          @click="next"
        >
          <AppIcon name="ion:ios-arrow-right" :size="24" />
        </button>
      </div>

      <div class="flex h-28 shrink-0 items-center justify-center gap-3">
        <button
          v-for="(image, thumbIndex) in images"
          :key="image.id"
          v-tooltip="image.imageLabel"
          type="button"
          class="h-16 w-16 overflow-hidden rounded-sm border-2 transition-colors"
          :class="
            thumbIndex === current ? 'border-accent' : 'border-transparent hover:border-white/40'
          "
          @click="current = thumbIndex"
        >
          <img
            v-if="image.imageUrl"
            :src="image.imageUrl"
            :alt="image.imageLabel || '图片'"
            class="h-full w-full object-cover"
          />
          <div
            v-else
            class="flex h-full w-full items-center justify-center"
            :style="{ background: TONES[(image.imageTone ?? 1) % TONES.length] }"
          >
            <AppIcon name="ion:image" :size="18" class="text-foreground/50" />
          </div>
        </button>
      </div>
    </div>
  </Teleport>
</template>
