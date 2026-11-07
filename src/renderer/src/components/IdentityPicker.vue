<script setup lang="ts">
import Avatar from '@renderer/components/Avatar.vue'
import type { AgentItem } from '@renderer/api/agents'
import { avatarIndexOf } from '@renderer/utils/chat'

withDefaults(
  defineProps<{
    agents: AgentItem[]
    currentAgentId: string
    userName: string
    userAvatarUrl?: string | null
    busyId?: string
    /** 面板宽度；位置由 FloatingPanel 统一计算 */
    width?: number
  }>(),
  { userAvatarUrl: null, busyId: '', width: 248 }
)

const emit = defineEmits<{
  switchUser: []
  switchAgent: [agentId: string]
  manage: []
}>()

function shortId(agentId: string): string {
  return agentId.length > 8 ? agentId.slice(-4) : agentId
}
</script>

<template>
  <div
    class="identity-picker flex flex-col gap-[2px] rounded-[10px] bg-background p-2 shadow-popover"
    :style="{ width: `${width}px` }"
    @click.stop
  >
    <p class="px-2 py-1 text-caption text-tertiary-foreground">切换身份</p>

    <button
      type="button"
      class="flex h-9 items-center gap-2 rounded-[6px] px-2 text-left transition-colors"
      :class="currentAgentId === '' ? 'bg-accent-subtle' : 'hover:bg-item-hover'"
      :disabled="Boolean(busyId)"
      @click="emit('switchUser')"
    >
      <Avatar :name="userName" :index="1" :avatar-url="userAvatarUrl" :size="32" />
      <span class="min-w-0 flex-1 truncate text-label text-foreground">{{ userName }}</span>
      <span v-if="currentAgentId === ''" class="text-micro text-accent">当前</span>
      <span v-else class="text-micro text-tertiary-foreground">用户账号</span>
    </button>

    <button
      v-for="agent in agents"
      :key="agent.agentId"
      type="button"
      class="flex h-9 items-center gap-2 rounded-[6px] px-2 text-left transition-colors disabled:opacity-60"
      :class="currentAgentId === agent.agentId ? 'bg-accent-subtle' : 'hover:bg-item-hover'"
      :disabled="Boolean(busyId)"
      @click="emit('switchAgent', agent.agentId)"
    >
      <Avatar
        :name="agent.nickname"
        :index="avatarIndexOf(agent.nickname)"
        :avatar-url="agent.avatarUrl"
        :size="32"
      />
      <span class="min-w-0 flex-1 truncate text-label text-foreground">{{ agent.nickname }}</span>
      <span v-if="currentAgentId === agent.agentId" class="text-micro text-accent">当前</span>
      <span v-else-if="busyId === agent.agentId" class="text-micro text-tertiary-foreground">
        切换中…
      </span>
      <span v-else class="text-micro text-tertiary-foreground"
        >Agent · {{ shortId(agent.agentId) }}</span
      >
    </button>

    <div class="my-1 h-px w-full bg-divider" />

    <button
      type="button"
      class="flex h-8 items-center rounded-[6px] px-2 text-caption text-link transition-colors hover:bg-item-hover"
      @click="emit('manage')"
    >
      管理我的 Agent →
    </button>
  </div>
</template>
