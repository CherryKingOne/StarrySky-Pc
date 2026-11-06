<script setup lang="ts">
import { ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'

const props = defineProps<{ visible: boolean }>()

const emit = defineEmits<{
  close: []
  start: [payload: { name: string; index: number }]
}>()

const scanning = ref(true)

watch(
  () => props.visible,
  (visible) => {
    if (visible) scanning.value = true
  }
)

function simulate(): void {
  scanning.value = false
}

function confirmScan(): void {
  emit('start', { name: '林晓', index: 1 })
  emit('close')
}
</script>

<template>
  <PopupDialog
    :visible="visible"
    title="扫一扫"
    subtitle="将二维码放入框内即可自动扫描"
    width="360px"
    @close="emit('close')"
  >
    <div class="flex flex-col items-center">
      <div
        class="relative flex h-[220px] w-[220px] items-center justify-center overflow-hidden rounded-lg bg-action"
      >
        <div class="grid h-[160px] w-[160px] place-items-center border border-white/20">
          <AppIcon name="ion:qr-scanner" :size="72" class="text-on-accent/40" />
        </div>
        <span
          class="absolute inset-x-6 h-0.5 bg-accent transition-all duration-1000"
          :class="scanning ? 'top-8 animate-bounce' : 'top-1/2 opacity-0'"
        />
      </div>

      <div v-if="scanning" class="mt-4 flex flex-col items-center gap-2">
        <p class="text-caption text-secondary-foreground">扫描中…</p>
        <button type="button" class="btn-primary h-9 px-4" @click="simulate">模拟扫码成功</button>
      </div>

      <div v-else class="mt-4 flex w-full items-center gap-3 rounded-md bg-item-hover p-3">
        <Avatar name="林晓" :index="1" :size="36" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-small text-foreground">林晓</p>
          <p class="truncate text-micro text-tertiary-foreground">产品经理 · 已识别野火IM账号</p>
        </div>
        <button type="button" class="btn-primary h-8 px-3" @click="confirmScan">发消息</button>
      </div>
    </div>
  </PopupDialog>
</template>
