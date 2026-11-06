<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    visible?: boolean
    /** 表情按钮，用于把面板锚定在输入区上方 */
    anchor?: HTMLElement | null
  }>(),
  { visible: false, anchor: null }
)

const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [emoji: string]
}>()

const PANEL_WIDTH = 320
const PANEL_HEIGHT = 240

const panel = ref<HTMLDivElement | null>(null)
const position = ref({ left: 12, top: 0 })

const categories = ['😀', '😂', '🥰', '😎', '🤔', '😭', '😡', '👍', '🙏', '🎉']
const recent = ref<string[]>([])

function close(): void {
  emit('update:visible', false)
}

function onSelect(emoji: string): void {
  recent.value = [emoji, ...recent.value.filter((item) => item !== emoji)].slice(0, 5)
  emit('select', emoji)
}

function computePosition(): void {
  const app = document.getElementById('app')
  const root = app
    ? app.getBoundingClientRect()
    : new DOMRect(0, 0, window.innerWidth, window.innerHeight)
  const anchor = props.anchor
  const height = panel.value?.getBoundingClientRect().height ?? PANEL_HEIGHT

  let left = 12
  let top = root.height - height - 220

  if (anchor?.isConnected) {
    const rect = anchor.getBoundingClientRect()
    left = rect.left - root.left
    top = rect.top - root.top - height - 8
  }

  position.value = {
    left: Math.max(8, Math.min(left, root.width - PANEL_WIDTH - 8)),
    top: Math.max(8, Math.min(top, root.height - height - 8))
  }
}

watch(
  () => [props.visible, props.anchor],
  () => {
    if (!props.visible) return
    void nextTick(computePosition)
  },
  { immediate: true }
)

watch(
  () => props.visible,
  (visible) => {
    if (visible) window.addEventListener('resize', computePosition)
    else window.removeEventListener('resize', computePosition)
  }
)
</script>

<template>
  <Teleport to="#app">
    <div
      v-if="visible"
      ref="panel"
      class="popup-layer absolute z-[85] w-[320px] rounded-lg border border-border-soft bg-modal p-3 shadow-popover"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }"
    >
      <div class="flex items-center justify-between px-1 pb-2">
        <div class="flex items-center gap-1.5">
          <span class="text-small font-medium text-foreground">表情</span>
          <span class="text-micro text-tertiary-foreground">点击插入输入框</span>
        </div>
        <button type="button" class="icon-button h-6 w-6 rounded-sm" title="关闭" @click="close">
          <AppIcon name="ion:close" :size="12" />
        </button>
      </div>

      <div class="grid grid-cols-5 gap-1.5">
        <button
          v-for="emoji in categories"
          :key="emoji"
          type="button"
          class="flex h-12 items-center justify-center rounded-md text-2xl transition-colors hover:bg-item-hover"
          @click="onSelect(emoji)"
        >
          {{ emoji }}
        </button>
      </div>

      <div class="mt-2 flex items-center gap-2 rounded-md bg-item-hover px-3 py-2">
        <span class="text-micro text-secondary-foreground">最近使用</span>
        <span v-if="recent.length === 0" class="text-micro text-tertiary-foreground">暂无</span>
        <span v-for="emoji in recent" :key="emoji" class="text-base">{{ emoji }}</span>
      </div>
    </div>
  </Teleport>
</template>
