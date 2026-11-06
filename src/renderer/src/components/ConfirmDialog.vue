<script setup lang="ts">
import PopupDialog from '@renderer/components/PopupDialog.vue'

withDefaults(
  defineProps<{
    visible: boolean
    title: string
    description?: string
    confirmText?: string
    cancelText?: string
    danger?: boolean
    width?: string
  }>(),
  { description: '', confirmText: '确定', cancelText: '取消', danger: false, width: '400px' }
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <PopupDialog :visible="visible" :title="title" :width="width" @close="emit('cancel')">
    <p v-if="description" class="text-small leading-relaxed text-secondary-foreground">
      {{ description }}
    </p>
    <slot />

    <template #footer>
      <button
        type="button"
        class="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-border bg-input px-4 text-label text-foreground transition-colors hover:bg-item-hover"
        @click="emit('cancel')"
      >
        {{ cancelText }}
      </button>
      <button
        type="button"
        class="btn-primary h-9 px-4"
        :class="danger ? 'bg-danger hover:bg-danger/90' : ''"
        @click="emit('confirm')"
      >
        {{ confirmText }}
      </button>
    </template>
  </PopupDialog>
</template>
