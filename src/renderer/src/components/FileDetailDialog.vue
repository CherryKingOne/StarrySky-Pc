<script setup lang="ts">
import AppIcon from '@renderer/components/AppIcon.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'
import type { FileEntry } from '@renderer/types'

withDefaults(
  defineProps<{
    visible: boolean
    file?: FileEntry | null
    /** 来自聊天消息时的文件名与大小 */
    fallbackName?: string
    fallbackSize?: string
  }>(),
  { file: null, fallbackName: '', fallbackSize: '' }
)

const emit = defineEmits<{
  close: []
  open: []
  forward: []
  star: []
  locate: []
}>()

function iconOf(name: string): string {
  if (name.endsWith('.pdf')) return 'ion:document'
  if (/\.(png|jpe?g|webp|gif)$/i.test(name)) return 'ion:image'
  if (/\.(zip|rar|7z)$/i.test(name)) return 'ion:archive'
  if (/\.(ppt|pptx)$/i.test(name)) return 'ion:easel'
  return 'ion:document-text'
}
</script>

<template>
  <PopupDialog :visible="visible" title="文件详情" width="420px" @close="emit('close')">
    <div class="flex items-center gap-4 rounded-md bg-item-hover p-4">
      <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-selected-alt">
        <AppIcon :name="iconOf(file?.name || fallbackName)" :size="24" class="text-accent" />
      </div>
      <div class="min-w-0">
        <p class="truncate text-label text-foreground">
          {{ file?.name || fallbackName || '未命名文件' }}
        </p>
        <p class="mt-1 text-micro text-secondary-foreground">
          {{ file?.size || fallbackSize || '未知大小' }}
          <span v-if="file"> · {{ file.from }} · {{ file.time }}</span>
        </p>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-3 gap-2">
      <button
        type="button"
        class="flex h-10 items-center justify-center gap-1.5 rounded-md bg-item-hover text-small text-foreground transition-colors hover:bg-selected-alt"
        @click="emit('open')"
      >
        <AppIcon name="ion:ios-folder-open" :size="16" />
        打开
      </button>
      <button
        type="button"
        class="flex h-10 items-center justify-center gap-1.5 rounded-md bg-item-hover text-small text-foreground transition-colors hover:bg-selected-alt"
        @click="emit('forward')"
      >
        <AppIcon name="ion:ios-redo" :size="16" />
        转发
      </button>
      <button
        type="button"
        class="flex h-10 items-center justify-center gap-1.5 rounded-md bg-item-hover text-small text-foreground transition-colors hover:bg-selected-alt"
        @click="emit('star')"
      >
        <AppIcon :name="file?.starred ? 'ion:ios-star' : 'ion:ios-star-outline'" :size="16" />
        {{ file?.starred ? '取消收藏' : '收藏' }}
      </button>
    </div>

    <button
      v-if="file"
      type="button"
      class="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-border text-small text-secondary-foreground transition-colors hover:bg-item-hover hover:text-foreground"
      @click="emit('locate')"
    >
      <AppIcon name="ion:ios-locate" :size="16" />
      定位到所在会话
    </button>
  </PopupDialog>
</template>
