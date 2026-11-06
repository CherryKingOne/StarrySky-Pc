<script setup lang="ts">
import AppIcon from '@renderer/components/AppIcon.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'
import type { ChatMessage } from '@renderer/types'

withDefaults(defineProps<{ visible: boolean; message?: ChatMessage | null }>(), {
  message: null
})

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <PopupDialog :visible="visible" title="聊天记录" width="380px" @close="emit('close')">
    <div class="rounded-md bg-item-hover p-3">
      <div class="mb-2 flex items-center gap-1.5 text-micro text-tertiary-foreground">
        <AppIcon name="ion:ios-albums" :size="12" />
        <span class="truncate">{{ message?.forwardTitle || '合并转发' }}</span>
      </div>
      <p
        v-for="line in message?.forwardLines ?? []"
        :key="line"
        class="mt-1 truncate text-caption text-secondary-foreground first:mt-0"
      >
        {{ line }}
      </p>
      <p v-if="!message?.forwardLines?.length" class="text-caption text-tertiary-foreground">
        暂无转发内容
      </p>
    </div>
    <template #footer>
      <button type="button" class="btn-primary h-9 px-4" @click="emit('close')">关闭</button>
    </template>
  </PopupDialog>
</template>
