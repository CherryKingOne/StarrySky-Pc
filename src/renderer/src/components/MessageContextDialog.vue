<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'
import { useConversationsStore } from '@renderer/stores/conversations'

const props = defineProps<{
  visible: boolean
  conversationId: string
}>()

const emit = defineEmits<{
  close: []
  locate: [conversationId: string]
}>()

const store = useConversationsStore()

const conversation = computed(
  () => store.list.find((item) => item.id === props.conversationId) ?? null
)

const messages = computed(() => conversation.value?.messages.slice(0, 6) ?? [])
</script>

<template>
  <PopupDialog
    :visible="visible"
    title="消息上下文"
    subtitle="查看该会话最近的消息与摘要"
    width="440px"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-2">
      <div
        v-for="message in messages"
        :key="message.id"
        class="rounded-md px-3 py-2 text-small"
        :class="
          message.direction === 'out'
            ? 'bg-accent-subtle text-foreground'
            : 'bg-item-hover text-foreground'
        "
      >
        <div class="mb-1 flex items-center gap-2 text-micro text-tertiary-foreground">
          <span>{{
            message.sender || (message.direction === 'out' ? '我' : conversation?.name)
          }}</span>
          <span>{{ message.time }}</span>
        </div>
        <p class="line-clamp-2">
          {{
            message.text ||
            message.fileName ||
            message.imageLabel ||
            message.forwardTitle ||
            '[消息]'
          }}
        </p>
      </div>
      <p v-if="messages.length === 0" class="text-caption text-tertiary-foreground">
        该会话暂无消息
      </p>
    </div>

    <template #footer>
      <span class="mr-auto inline-flex items-center gap-1 text-micro text-tertiary-foreground">
        <AppIcon name="ion:information-circle-outline" :size="12" />
        仅加载最近 6 条消息作为上下文
      </span>
      <button type="button" class="btn-primary h-9 px-4" @click="emit('locate', conversationId)">
        在会话中查看
      </button>
    </template>
  </PopupDialog>
</template>
