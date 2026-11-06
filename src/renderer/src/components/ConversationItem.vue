<script setup lang="ts">
import { computed } from 'vue'
import Avatar from '@renderer/components/Avatar.vue'
import BadgeDigit from '@renderer/components/BadgeDigit.vue'
import { useAppStore } from '@renderer/stores/app'
import type { Conversation } from '@renderer/types'

const props = defineProps<{ conversation: Conversation; active?: boolean }>()
const app = useAppStore()
const isSelf = computed(
  () =>
    !props.conversation.group &&
    !props.conversation.bot &&
    props.conversation.targetUserId === app.user?.userId
)

const emit = defineEmits<{
  contextmenu: [event: MouseEvent, conversation: Conversation]
}>()

function onContextMenu(event: MouseEvent, conversation: Conversation): void {
  event.preventDefault()
  emit('contextmenu', event, conversation)
}
</script>

<template>
  <div
    class="list-row h-item w-panel"
    :class="active ? 'bg-conv-active' : 'hover:bg-item-hover'"
    @contextmenu="onContextMenu($event, conversation)"
  >
    <Avatar
      :name="conversation.name"
      :index="conversation.avatarIndex"
      :avatar-url="conversation.avatarUrl"
      :size="36"
    />
    <div class="min-w-0 flex-1">
      <div class="flex items-baseline justify-between gap-2">
        <span class="flex min-w-0 items-center gap-1">
          <span class="truncate text-base text-foreground">{{ conversation.name }}</span>
          <span
            v-if="conversation.targetType === 'BOT'"
            class="shrink-0 rounded-sm bg-conv-active px-1 text-[10px] leading-4 text-accent"
          >
            机器人
          </span>
          <span
            v-else-if="conversation.bot"
            class="shrink-0 rounded-sm bg-conv-active px-1 text-[10px] leading-4 text-accent"
          >
            BOT
          </span>
          <span
            v-else-if="isSelf"
            class="shrink-0 rounded-sm bg-conv-active px-1 text-[10px] leading-4 text-accent"
          >
            我的会话
          </span>
        </span>
        <span class="shrink-0 text-micro text-time-foreground">{{ conversation.time }}</span>
      </div>
      <div class="mt-0.5 flex items-center justify-between gap-2">
        <p class="min-w-0 flex-1 truncate text-caption text-tertiary-foreground">
          {{ conversation.preview }}
        </p>
        <BadgeDigit v-if="conversation.unread > 0" :count="conversation.unread" class="shrink-0" />
      </div>
    </div>
  </div>
</template>
