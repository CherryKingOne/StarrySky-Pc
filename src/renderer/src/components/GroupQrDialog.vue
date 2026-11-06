<script setup lang="ts">
import QrCode from '@renderer/components/QrCode.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    name: string
    hint?: string
    mode?: 'group' | 'self' | 'contact'
    value?: string
  }>(),
  { hint: '用野火IM扫码加入群聊', mode: 'group', value: 'starrysky://group' }
)

const emit = defineEmits<{
  close: []
  toast: [message: string]
}>()

async function copyLink(): Promise<void> {
  try {
    await navigator.clipboard?.writeText(props.value)
    emit('toast', '二维码链接已复制')
  } catch {
    emit('toast', '复制失败，请重试')
  }
}
</script>

<template>
  <PopupDialog
    :visible="visible"
    :title="mode === 'group' ? '群二维码' : mode === 'contact' ? '名片二维码' : '我的二维码'"
    width="320px"
    @close="emit('close')"
  >
    <div class="flex flex-col items-center">
      <div class="rounded-md bg-white p-3">
        <QrCode :size="200" :value="value" />
      </div>
      <p class="mt-4 text-section text-foreground">{{ name }}</p>
      <p class="mt-1 text-caption text-secondary-foreground">{{ hint }}</p>
    </div>

    <template #footer>
      <button
        type="button"
        class="inline-flex h-9 items-center justify-center rounded-sm border border-border bg-input px-4 text-label text-foreground transition-colors hover:bg-item-hover"
        @click="copyLink"
      >
        复制链接
      </button>
      <button type="button" class="btn-primary h-9 px-4" @click="emit('close')">完成</button>
    </template>
  </PopupDialog>
</template>
