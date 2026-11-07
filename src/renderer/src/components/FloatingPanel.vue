<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch, type CSSProperties } from 'vue'

/**
 * 通用浮层：Teleport 到 body，按锚点元素 rect 计算 fixed 位置。
 * - 默认在锚点下方 8px；下方空间不足时向上翻转
 * - 左右自动收进视口，避免贴边溢出
 * - 外部点击、Esc、滚动、窗口 resize 时关闭
 * - 同一时刻只允许一个浮层打开
 */
const props = withDefaults(
  defineProps<{
    open: boolean
    anchor: HTMLElement | null
    /** 与锚点的间距 */
    offset?: number
    /** 相对锚点的水平对齐方式（placement=bottom 时生效） */
    align?: 'left' | 'right' | 'center'
    /** bottom=上下弹出；right=向右弹出（侧栏角标场景） */
    placement?: 'bottom' | 'right'
  }>(),
  { offset: 8, align: 'left', placement: 'bottom' }
)

const emit = defineEmits<{ close: [] }>()

const panelRef = ref<HTMLElement | null>(null)
const position = ref({ left: 0, top: 0 })
const ready = ref(false)
const style = computed<CSSProperties>(() => ({
  left: `${position.value.left}px`,
  top: `${position.value.top}px`,
  zIndex: 1200,
  visibility: ready.value ? 'visible' : 'hidden'
}))

let observer: ResizeObserver | null = null
/** 全局单例：当前打开的浮层关闭函数 */
let activeClose: (() => void) | null = null

function requestClose(): void {
  emit('close')
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

function place(): void {
  const anchor = props.anchor
  const el = panelRef.value
  if (!anchor || !el) return
  const rect = anchor.getBoundingClientRect()
  const width = el.offsetWidth
  const height = el.offsetHeight
  if (!width || !height) return
  const vw = window.innerWidth
  const vh = window.innerHeight
  const margin = 8

  if (props.placement === 'right') {
    let left = rect.right + props.offset
    if (left + width > vw - margin) left = rect.left - width - props.offset
    let top = rect.top - props.offset
    top = clamp(top, margin, vh - height - margin)
    position.value = { left: clamp(left, margin, vw - width - margin), top }
  } else {
    let top = rect.bottom + props.offset
    if (top + height > vh - margin) top = rect.top - height - props.offset
    top = clamp(top, margin, vh - height - margin)
    let left = rect.left
    if (props.align === 'right') left = rect.right - width
    else if (props.align === 'center') left = rect.left + rect.width / 2 - width / 2
    position.value = { left: clamp(left, margin, vw - width - margin), top }
  }
  ready.value = true
}

function onMouseDown(event: MouseEvent): void {
  const target = event.target as Node | null
  if (panelRef.value?.contains(target)) return
  if (props.anchor?.contains(target)) return
  requestClose()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.stopPropagation()
    requestClose()
  }
}

function onScroll(event: Event): void {
  const target = event.target as Node | null
  if (panelRef.value?.contains(target)) return
  requestClose()
}

function cleanup(): void {
  ready.value = false
  observer?.disconnect()
  observer = null
  window.removeEventListener('resize', requestClose)
  document.removeEventListener('mousedown', onMouseDown, true)
  document.removeEventListener('keydown', onKeydown, true)
  document.removeEventListener('scroll', onScroll, true)
  if (activeClose === requestClose) activeClose = null
}

async function setup(): Promise<void> {
  if (activeClose && activeClose !== requestClose) activeClose()
  activeClose = requestClose
  await nextTick()
  place()
  window.addEventListener('resize', requestClose)
  document.addEventListener('mousedown', onMouseDown, true)
  document.addEventListener('keydown', onKeydown, true)
  document.addEventListener('scroll', onScroll, true)
  if (panelRef.value && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => place())
    observer.observe(panelRef.value)
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) void setup()
    else cleanup()
  },
  { immediate: true }
)

watch(
  () => props.anchor,
  () => {
    if (props.open) place()
  }
)

onBeforeUnmount(cleanup)
</script>

<template>
  <Teleport to="body">
    <div v-if="open" ref="panelRef" class="fixed" :style="style">
      <slot />
    </div>
  </Teleport>
</template>
