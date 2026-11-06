<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import IconButton from '@renderer/components/IconButton.vue'
import { useAppStore } from '@renderer/stores/app'
import type { CallMode, Conversation } from '@renderer/types'

const props = defineProps<{
  conversation: Conversation
}>()

const emit = defineEmits<{
  close: []
  search: []
  files: []
  history: []
  forward: []
  popout: []
  float: []
  manage: []
  qr: []
  profile: []
  call: [mode: CallMode]
  'toggle-mute': []
  'open-qr-self': []
}>()

const members = computed(() => props.conversation.members ?? [])

const memberCount = computed(() => {
  if (props.conversation.group) return members.value.length
  return 2
})

const app = useAppStore()
const isSelf = computed(
  () =>
    !props.conversation.group &&
    !props.conversation.bot &&
    props.conversation.targetUserId === app.user?.userId
)

const subtitle = computed(() => {
  if (props.conversation.bot) return `机器人 · ${props.conversation.bot.description || '暂无简介'}`
  if (isSelf.value) return '与自己的会话 · 备忘 / 文件传输'
  if (props.conversation.group) return `${memberCount.value} 位成员`
  return props.conversation.targetSignature || '在线'
})
</script>

<template>
  <aside
    class="flex h-full w-info shrink-0 flex-col overflow-y-auto border-l border-divider bg-info-panel"
  >
    <div class="flex shrink-0 items-center justify-between px-5 pt-4">
      <h3 class="text-section text-foreground">聊天信息</h3>
      <IconButton
        icon="ion:close"
        :size="18"
        :box="28"
        label="关闭信息面板"
        @click="emit('close')"
      />
    </div>

    <div class="mt-3 flex flex-col items-center px-5">
      <Avatar
        :name="conversation.name"
        :index="conversation.avatarIndex"
        :avatar-url="conversation.avatarUrl"
        :size="64"
      />
      <h4 class="mt-2 text-center text-section text-foreground">{{ conversation.name }}</h4>
      <p class="mt-0.5 text-center text-caption text-secondary-foreground">
        {{ subtitle }}
      </p>
    </div>

    <div class="section-divider mx-5 mt-4" />

    <!-- 群成员 -->
    <div v-if="conversation.group" class="mt-4 px-5">
      <div class="flex items-center justify-between">
        <p class="text-caption text-secondary-foreground">群成员（{{ members.length }}）</p>
        <button
          type="button"
          class="text-micro text-link hover:text-link-hover"
          @click="emit('manage')"
        >
          群管理
        </button>
      </div>
      <div class="mt-3 flex flex-wrap gap-3">
        <button
          v-for="member in members.slice(0, 10)"
          :key="member.name"
          v-tooltip="`${member.name} · ${member.role || '成员'}`"
          type="button"
          class="flex flex-col items-center gap-1"
          @click="emit('profile')"
        >
          <Avatar :name="member.name" :index="member.index" :size="32" :rounded="false" />
          <span class="max-w-[44px] truncate text-[10px] text-tertiary-foreground">{{
            member.name
          }}</span>
        </button>
      </div>
      <button
        type="button"
        class="mt-3 flex h-9 w-full items-center justify-center rounded-md bg-item-hover text-small text-secondary-foreground transition-colors hover:text-foreground"
        @click="emit('manage')"
      >
        查看全部 {{ members.length }} 位群成员
      </button>
    </div>

    <!-- 机器人：只展示资料，不提供通话 -->
    <div v-else-if="conversation.bot" class="mt-4 px-5">
      <div class="rounded-md bg-item-hover p-3">
        <p class="text-caption text-secondary-foreground">机器人 ID</p>
        <p class="mt-1 break-all text-small text-foreground">{{ conversation.bot.botId }}</p>
        <p class="mt-3 text-caption text-secondary-foreground">简介</p>
        <p class="mt-1 text-small text-foreground">
          {{ conversation.bot.description || '暂无简介' }}
        </p>
        <p class="mt-3 text-micro text-tertiary-foreground">
          机器人由开发者后台创建和管理，客户端不能删除机器人。
        </p>
      </div>
    </div>

    <!-- 自己：备忘/文件传输说明 -->
    <div v-else-if="isSelf" class="mt-4 px-5">
      <div class="rounded-md bg-item-hover p-3">
        <p class="text-caption text-secondary-foreground">这是你与自己的会话</p>
        <p class="mt-1 text-small leading-relaxed text-foreground">
          可以发送文字、图片和文件给自己，用于备忘或跨设备传输。
        </p>
      </div>
    </div>

    <!-- 单人：快捷操作 -->
    <div v-else class="mt-4 px-5">
      <div class="grid grid-cols-3 gap-2">
        <button
          type="button"
          class="flex flex-col items-center gap-1 rounded-md bg-item-hover py-3 text-secondary-foreground transition-colors hover:text-foreground"
          @click="emit('call', 'audio')"
        >
          <AppIcon name="ion:ios-call" :size="18" />
          <span class="text-micro">语音通话</span>
        </button>
        <button
          type="button"
          class="flex flex-col items-center gap-1 rounded-md bg-item-hover py-3 text-secondary-foreground transition-colors hover:text-foreground"
          @click="emit('call', 'video')"
        >
          <AppIcon name="ion:ios-videocam" :size="18" />
          <span class="text-micro">视频通话</span>
        </button>
        <button
          type="button"
          class="flex flex-col items-center gap-1 rounded-md bg-item-hover py-3 text-secondary-foreground transition-colors hover:text-foreground"
          @click="emit('profile')"
        >
          <AppIcon name="ion:person" :size="18" />
          <span class="text-micro">用户资料</span>
        </button>
      </div>
    </div>

    <div class="section-divider mx-5 mt-4" />

    <!-- 会话操作 -->
    <div class="mt-2 flex flex-col px-2">
      <button
        type="button"
        class="flex h-10 items-center gap-3 rounded-sm px-3 text-left text-small text-foreground transition-colors hover:bg-item-hover"
        @click="emit('search')"
      >
        <AppIcon name="ion:search" :size="16" class="text-icon" />
        查找聊天记录
        <AppIcon name="ion:ios-arrow-right" :size="14" class="ml-auto text-tertiary-foreground" />
      </button>
      <button
        type="button"
        class="flex h-10 items-center gap-3 rounded-sm px-3 text-left text-small text-foreground transition-colors hover:bg-item-hover"
        @click="emit('files')"
      >
        <AppIcon name="ion:folder" :size="16" class="text-icon" />
        聊天文件
        <AppIcon name="ion:ios-arrow-right" :size="14" class="ml-auto text-tertiary-foreground" />
      </button>
      <button
        type="button"
        class="flex h-10 items-center gap-3 rounded-sm px-3 text-left text-small text-foreground transition-colors hover:bg-item-hover"
        @click="emit('history')"
      >
        <AppIcon name="ion:ios-list" :size="16" class="text-icon" />
        消息历史
        <AppIcon name="ion:ios-arrow-right" :size="14" class="ml-auto text-tertiary-foreground" />
      </button>
      <button
        type="button"
        class="flex h-10 items-center gap-3 rounded-sm px-3 text-left text-small text-foreground transition-colors hover:bg-item-hover"
        @click="emit('forward')"
      >
        <AppIcon name="ion:chatboxes" :size="16" class="text-icon" />
        合并转发
        <AppIcon name="ion:ios-arrow-right" :size="14" class="ml-auto text-tertiary-foreground" />
      </button>
      <button
        type="button"
        class="flex h-10 items-center gap-3 rounded-sm px-3 text-left text-small text-foreground transition-colors hover:bg-item-hover"
        @click="emit('popout')"
      >
        <AppIcon name="ion:ios-open" :size="16" class="text-icon" />
        独立窗口打开
        <AppIcon name="ion:ios-arrow-right" :size="14" class="ml-auto text-tertiary-foreground" />
      </button>
      <button
        type="button"
        class="flex h-10 items-center gap-3 rounded-sm px-3 text-left text-small text-foreground transition-colors hover:bg-item-hover"
        @click="emit('float')"
      >
        <AppIcon name="ion:copy" :size="16" class="text-icon" />
        会话浮窗
        <AppIcon name="ion:ios-arrow-right" :size="14" class="ml-auto text-tertiary-foreground" />
      </button>
      <button
        v-if="conversation.group"
        type="button"
        class="flex h-10 items-center gap-3 rounded-sm px-3 text-left text-small text-foreground transition-colors hover:bg-item-hover"
        @click="emit('qr')"
      >
        <AppIcon name="ion:qr-code" :size="16" class="text-icon" />
        群二维码
        <AppIcon name="ion:ios-arrow-right" :size="14" class="ml-auto text-tertiary-foreground" />
      </button>
      <button
        v-else-if="!conversation.bot && !isSelf"
        type="button"
        class="flex h-10 items-center gap-3 rounded-sm px-3 text-left text-small text-foreground transition-colors hover:bg-item-hover"
        @click="emit('open-qr-self')"
      >
        <AppIcon name="ion:qr-code" :size="16" class="text-icon" />
        我的二维码
        <AppIcon name="ion:ios-arrow-right" :size="14" class="ml-auto text-tertiary-foreground" />
      </button>
    </div>

    <div class="section-divider mx-5 mt-2" />

    <!-- 消息免打扰 -->
    <button
      type="button"
      class="mx-3 mt-2 flex h-10 items-center gap-3 rounded-sm px-2 text-left text-small text-foreground transition-colors hover:bg-item-hover"
      @click="emit('toggle-mute')"
    >
      <AppIcon name="ion:ios-notifications-off" :size="16" class="text-icon" />
      消息免打扰
      <span
        class="ml-auto rounded-full px-2 py-0.5 text-micro"
        :class="
          conversation.muted ? 'bg-accent text-on-accent' : 'bg-item-hover text-tertiary-foreground'
        "
      >
        {{ conversation.muted ? '已开启' : '已关闭' }}
      </span>
    </button>

    <!-- 群公告 -->
    <div v-if="conversation.notice" class="mt-3 px-5 pb-6">
      <p class="text-caption text-secondary-foreground">群公告</p>
      <p class="mt-2 text-small leading-relaxed text-foreground">{{ conversation.notice }}</p>
    </div>
    <div v-else class="pb-6" />
  </aside>
</template>
