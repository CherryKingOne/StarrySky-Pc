<script setup lang="ts">
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'

withDefaults(
  defineProps<{
    visible: boolean
    name: string
    desc?: string
    avatarIndex?: number
    avatarUrl?: string | null
    accountId?: string
    self?: boolean
  }>(),
  { desc: '', avatarIndex: 1, avatarUrl: null, accountId: 'linxiao', self: false }
)

const emit = defineEmits<{
  close: []
  startChat: []
  addFriend: []
  qr: []
  block: []
  settings: []
}>()
</script>

<template>
  <PopupDialog
    :visible="visible"
    width="300px"
    :closable="false"
    :padded="false"
    @close="emit('close')"
  >
    <div class="flex flex-col items-center px-6 pt-7 pb-2">
      <Avatar :name="name" :index="avatarIndex" :avatar-url="avatarUrl" :size="64" />
      <p class="mt-3 text-section text-foreground">{{ name }}</p>
      <p class="mt-1 text-caption text-secondary-foreground">{{ desc }}</p>
      <p class="mt-0.5 text-micro text-tertiary-foreground">ID: {{ accountId }}</p>
    </div>

    <div class="flex flex-col gap-2 px-6 pb-6">
      <button v-if="self" type="button" class="btn-primary h-9 w-full" @click="emit('qr')">
        <AppIcon name="ion:qr-code" :size="16" />
        我的二维码
      </button>
      <button v-else type="button" class="btn-primary h-9 w-full" @click="emit('startChat')">
        <AppIcon name="ion:chatboxes" :size="16" />
        发消息
      </button>

      <div class="flex gap-2">
        <button
          v-if="self"
          type="button"
          class="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-sm border border-border bg-input text-label text-foreground transition-colors hover:bg-item-hover"
          @click="emit('settings')"
        >
          <AppIcon name="ion:settings" :size="14" />
          设置
        </button>
        <template v-else>
          <button
            type="button"
            class="inline-flex h-9 flex-1 items-center justify-center rounded-sm border border-border bg-input text-small text-foreground transition-colors hover:bg-item-hover"
            @click="emit('addFriend')"
          >
            加好友
          </button>
          <button
            type="button"
            class="inline-flex h-9 flex-1 items-center justify-center rounded-sm border border-border bg-input text-small text-foreground transition-colors hover:bg-item-hover"
            @click="emit('qr')"
          >
            二维码
          </button>
          <button
            type="button"
            class="inline-flex h-9 flex-1 items-center justify-center rounded-sm border border-border bg-input text-small text-danger transition-colors hover:bg-item-hover"
            @click="emit('block')"
          >
            拉黑
          </button>
        </template>
      </div>
    </div>
  </PopupDialog>
</template>
