<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'

export interface MenuItem {
  key: string
  label: string
  icon?: string
  hint?: string
  danger?: boolean
  disabled?: boolean
  separator?: boolean
}

const props = withDefaults(
  defineProps<{
    items: MenuItem[]
    visible: boolean
    x?: number
    y?: number
    anchor?: HTMLElement | null
    /** 宽度，默认 176px */
    width?: number
    align?: 'start' | 'end'
  }>(),
  { x: 0, y: 0, anchor: null, width: 176, align: 'start' }
)

const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [key: string]
}>()

const menuEl = ref<HTMLDivElement | null>(null)
const position = ref({ left: 0, top: 0 })

const menuStyle = computed(() => ({
  left: `${position.value.left}px`,
  top: `${position.value.top}px`,
  width: `${props.width}px`
}))

function close(): void {
  emit('update:visible', false)
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

function handleClickOutside(event: MouseEvent): void {
  if (!menuEl.value) return
  if (!menuEl.value.contains(event.target as Node)) close()
}

function onItemClick(item: MenuItem): void {
  if (item.disabled || item.separator) return
  emit('select', item.key)
  close()
}

/** 以 #app 为坐标原点定位，确保弹层始终贴合主窗口 */
function appRect(): DOMRect {
  const app = document.getElementById('app')
  return app
    ? app.getBoundingClientRect()
    : new DOMRect(0, 0, window.innerWidth, window.innerHeight)
}

function computePosition(): void {
  const el = menuEl.value
  const anchor = props.anchor
  const root = appRect()
  let rawX = props.x
  let rawY = props.y

  if (anchor && anchor.isConnected) {
    const rect = anchor.getBoundingClientRect()
    rawX = props.align === 'end' ? rect.right - props.width : rect.left
    rawY = rect.bottom + 4
  }

  if (!el) {
    position.value = { left: Math.max(8, rawX - root.left), top: Math.max(8, rawY - root.top) }
    return
  }

  const height = el.getBoundingClientRect().height
  const maxLeft = root.width - props.width - 8
  const maxTop = root.height - height - 8
  let left = rawX - root.left
  let top = rawY - root.top

  // 空间不足时向上翻折，避免菜单位置被裁切
  if (top + height > root.height - 8)
    top = Math.max(8, anchor ? anchor.getBoundingClientRect().top - root.top - height - 4 : maxTop)
  position.value = {
    left: Math.max(8, Math.min(left, Math.max(8, maxLeft))),
    top: Math.max(8, Math.min(top, Math.max(8, maxTop)))
  }
}

watch(
  () => [props.visible, props.x, props.y, props.anchor],
  () => {
    if (!props.visible) return
    void nextTick(computePosition)
  },
  { immediate: true }
)

function handleScroll(event: Event): void {
  if (!props.visible) return
  if (menuEl.value?.contains(event.target as Node)) return
  close()
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      document.addEventListener('keydown', handleKeydown)
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('contextmenu', handleClickOutside)
      document.addEventListener('scroll', handleScroll, true)
      window.addEventListener('resize', computePosition)
    } else {
      document.removeEventListener('keydown', handleKeydown)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('contextmenu', handleClickOutside)
      document.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', computePosition)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('contextmenu', handleClickOutside)
  document.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('resize', computePosition)
})

function itemClass(item: MenuItem): string {
  const base =
    'flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-small transition-colors'
  if (item.disabled) return `${base} text-tertiary-foreground cursor-not-allowed opacity-50`
  if (item.danger) return `${base} text-danger hover:bg-item-hover`
  return `${base} text-foreground hover:bg-item-hover`
}
</script>

<template>
  <Teleport to="#app">
    <div
      v-if="visible"
      ref="menuEl"
      class="popup-layer absolute z-[90] rounded-md border border-border-soft bg-modal py-1 shadow-menu"
      :style="menuStyle"
      role="menu"
    >
      <template v-for="item in items" :key="item.key || item.label">
        <div v-if="item.separator" class="mx-2 my-1 h-px bg-border-separator" />
        <button
          v-else
          type="button"
          :class="itemClass(item)"
          role="menuitem"
          @click="onItemClick(item)"
        >
          <AppIcon v-if="item.icon" :name="item.icon" :size="16" class="shrink-0" />
          <span v-else class="h-4 w-4 shrink-0" />
          <span class="truncate">{{ item.label }}</span>
          <span v-if="item.hint" class="ml-auto shrink-0 text-micro text-tertiary-foreground">
            {{ item.hint }}
          </span>
        </button>
      </template>
    </div>
  </Teleport>
</template>
