<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    name: string
    desc?: string
    avatarIndex?: number
    avatarUrl?: string | null
    accountId?: string
    self?: boolean
    /** Agent 资料卡：展示归属账号、创建时间、状态等信息 */
    agent?: boolean
    idLabel?: string
    /** 账号 ID 使用等宽字体（Agent ID 等长数字串） */
    idMono?: boolean
    meta?: Array<{ label: string; value: string }>
  }>(),
  {
    desc: '',
    avatarIndex: 1,
    avatarUrl: null,
    accountId: 'linxiao',
    self: false,
    agent: false,
    idLabel: 'ID',
    idMono: false,
    meta: () => []
  }
)

const emit = defineEmits<{
  close: []
  startChat: []
  addFriend: []
  qr: []
  block: []
  settings: []
  whitelist: []
  manage: []
}>()

const copied = ref(false)
let copyTimer: number | undefined

async function copyId(): Promise<void> {
  if (!props.accountId) return
  try {
    await navigator.clipboard.writeText(props.accountId)
    copied.value = true
    if (copyTimer) window.clearTimeout(copyTimer)
    copyTimer = window.setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    /* 剪贴板不可用时不影响资料卡展示 */
  }
}
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
      <button
        v-tooltip="'点击复制账号 ID'"
        type="button"
        class="mt-0.5 inline-flex items-center gap-1 text-micro text-tertiary-foreground transition-colors hover:text-accent"
        :class="idMono ? 'font-mono' : ''"
        @click="copyId"
      >
        {{ idLabel }}: {{ accountId }}
        <AppIcon :name="copied ? 'ion:checkmark' : 'ion:copy-outline'" :size="11" />
      </button>

      <div
        v-if="meta.length"
        class="mt-3 flex w-full flex-col gap-1.5 rounded-md bg-panel px-3 py-2"
      >
        <div
          v-for="row in meta"
          :key="row.label"
          class="flex items-start justify-between gap-3 text-micro"
        >
          <span class="shrink-0 text-tertiary-foreground">{{ row.label }}</span>
          <span class="min-w-0 break-all text-right text-secondary-foreground">{{
            row.value
          }}</span>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2 px-6 pb-6">
      <template v-if="agent">
        <button type="button" class="btn-primary h-9 w-full" @click="emit('settings')">
          <AppIcon name="ion:settings" :size="16" />
          Agent 设置
        </button>
        <div class="flex gap-2">
          <button
            type="button"
            class="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-sm border border-border bg-input text-label text-foreground transition-colors hover:bg-item-hover"
            @click="emit('whitelist')"
          >
            <AppIcon name="ion:shield-checkmark" :size="14" />
            聊天白名单
          </button>
          <button
            type="button"
            class="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-sm border border-border bg-input text-label text-foreground transition-colors hover:bg-item-hover"
            @click="emit('manage')"
          >
            <AppIcon name="ion:construct" :size="14" />
            管理 Agent
          </button>
        </div>
      </template>

      <template v-else>
        <button v-if="self" type="button" class="btn-primary h-9 w-full" @click="emit('startChat')">
          <AppIcon name="ion:chatboxes" :size="16" />
          发消息给自己
        </button>
        <button v-else type="button" class="btn-primary h-9 w-full" @click="emit('startChat')">
          <AppIcon name="ion:chatboxes" :size="16" />
          发消息
        </button>

        <div class="flex gap-2">
          <template v-if="self">
            <button
              type="button"
              class="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-sm border border-border bg-input text-label text-foreground transition-colors hover:bg-item-hover"
              @click="emit('qr')"
            >
              <AppIcon name="ion:qr-code" :size="14" />
              我的二维码
            </button>
            <button
              type="button"
              class="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-sm border border-border bg-input text-label text-foreground transition-colors hover:bg-item-hover"
              @click="emit('settings')"
            >
              <AppIcon name="ion:settings" :size="14" />
              设置
            </button>
          </template>
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
      </template>
    </div>
  </PopupDialog>
</template>
