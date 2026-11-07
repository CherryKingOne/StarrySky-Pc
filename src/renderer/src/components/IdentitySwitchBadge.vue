<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import FloatingPanel from '@renderer/components/FloatingPanel.vue'
import IdentityPicker from '@renderer/components/IdentityPicker.vue'
import { useAgentsStore } from '@renderer/stores/agents'
import { useAppStore } from '@renderer/stores/app'

const emit = defineEmits<{ toast: [message: string] }>()

const router = useRouter()
const route = useRoute()
const agents = useAgentsStore()
const app = useAppStore()

const open = ref(false)
const badgeRef = ref<HTMLButtonElement | null>(null)

function close(): void {
  open.value = false
}

watch(
  () => app.actingAgent?.agentId,
  () => close()
)

function onBadgeClick(): void {
  if (!agents.loaded) {
    if (!agents.loading) void agents.load()
    return
  }
  if (agents.activeAgents.length === 0) {
    close()
    void router.push('/agents/new')
    return
  }
  if (!agents.loaded) void agents.load()
  open.value = !open.value
}

async function switchAgent(agentId: string): Promise<void> {
  if (agents.switching) return
  try {
    await agents.switchToAgent(agentId)
    close()
    const name = agents.list.find((item) => item.agentId === agentId)?.nickname ?? 'Agent'
    emit('toast', `已切换为 ${name} 身份`)
    if (route.path !== '/chats') void router.push('/chats')
  } catch (error) {
    emit('toast', error instanceof Error ? error.message : '切换身份失败')
  }
}

function switchUser(): void {
  if (!app.actingAgent) {
    close()
    return
  }
  agents.switchToUser()
  close()
  emit('toast', '已切回用户账号')
  if (route.path !== '/chats') void router.push('/chats')
}

function manage(): void {
  close()
  void router.push('/agents')
}

defineExpose({ open: () => (open.value = true), close })
</script>

<template>
  <div>
    <button
      v-if="agents.activeAgents.length === 0 && agents.loaded"
      ref="badgeRef"
      v-tooltip="'创建 Agent'"
      type="button"
      class="flex h-4 w-4 items-center justify-center rounded-[8px] bg-accent text-white shadow-sm transition-transform hover:scale-110"
      @click.stop="onBadgeClick"
    >
      <AppIcon name="ion:add" :size="10" />
      <span
        class="pointer-events-none absolute left-[26px] top-0 whitespace-nowrap rounded-[6px] border border-accent bg-background px-2.5 py-1.5 text-caption text-accent shadow-popover"
      >
        + 创建 Agent
      </span>
    </button>

    <button
      v-else
      ref="badgeRef"
      v-tooltip="'切换身份'"
      type="button"
      class="flex h-[18px] w-[18px] items-center justify-center rounded-[9px] bg-accent text-white shadow-sm transition-transform hover:scale-110"
      @click.stop="onBadgeClick"
    >
      <AppIcon name="ion:shuffle" :size="11" />
    </button>

    <FloatingPanel :open="open" :anchor="badgeRef" placement="right" @close="close">
      <IdentityPicker
        :agents="agents.activeAgents"
        :current-agent-id="app.actingAgent?.agentId ?? ''"
        :user-name="app.nickname"
        :user-avatar-url="app.user?.avatarUrl ?? null"
        :busy-id="agents.switching"
        @switch-user="switchUser"
        @switch-agent="switchAgent"
        @manage="manage"
      />
    </FloatingPanel>
  </div>
</template>
