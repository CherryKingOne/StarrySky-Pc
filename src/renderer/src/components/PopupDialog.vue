<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    subtitle?: string
    /** 弹窗最大宽度，例如 320px / 480px */
    width?: string
    /** 弹窗最大高度，默认占满可用高度 */
    height?: string
    closable?: boolean
    closeOnBackdrop?: boolean
    /** 内容区是否使用默认内边距 */
    padded?: boolean
    bodyClass?: string
  }>(),
  {
    title: '',
    subtitle: '',
    width: '400px',
    height: '',
    closable: true,
    closeOnBackdrop: true,
    padded: true,
    bodyClass: ''
  }
)

const emit = defineEmits<{ close: [] }>()

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.visible && props.closable) emit('close')
}

function onBackdrop(): void {
  if (props.closeOnBackdrop) emit('close')
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) document.addEventListener('keydown', onKeydown)
    else document.removeEventListener('keydown', onKeydown)
  },
  { immediate: true }
)

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!-- 统一弹窗容器：挂载在 #app 上，始终相对主窗口居中，避免位置偏移 -->
  <Teleport to="#app">
    <div
      v-if="visible"
      class="popup-layer absolute inset-0 z-[80] flex items-center justify-center bg-overlay p-6"
      @click.self="onBackdrop"
    >
      <div
        class="flex max-h-full w-full flex-col overflow-hidden rounded-lg border border-border-soft bg-modal shadow-modal"
        :style="{ maxWidth: width, maxHeight: height || 'calc(100% - 48px)' }"
        role="dialog"
        aria-modal="true"
      >
        <header
          v-if="title || $slots.header"
          class="flex shrink-0 items-start justify-between gap-4 px-6 pt-5 pb-2"
        >
          <slot name="header">
            <div class="min-w-0">
              <h3 class="truncate text-section text-foreground">{{ title }}</h3>
              <p v-if="subtitle" class="mt-1 text-caption text-secondary-foreground">
                {{ subtitle }}
              </p>
            </div>
          </slot>
          <button
            v-if="closable"
            v-tooltip="'关闭'"
            type="button"
            class="icon-button h-7 w-7 shrink-0 rounded-md"
            @click="emit('close')"
          >
            <AppIcon name="ion:close" :size="16" />
          </button>
        </header>

        <div
          class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
          :class="padded ? 'px-6 py-4' : ''"
        >
          <slot />
        </div>

        <footer
          v-if="$slots.footer"
          class="flex shrink-0 items-center justify-end gap-3 px-6 pt-2 pb-5"
        >
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>
