<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import ConfirmDialog from '@renderer/components/ConfirmDialog.vue'
import FloatingPanel from '@renderer/components/FloatingPanel.vue'
import IdentityPicker from '@renderer/components/IdentityPicker.vue'
import Toast from '@renderer/components/Toast.vue'
import { useAgentsStore, AGENT_LIMIT } from '@renderer/stores/agents'
import { useAppStore } from '@renderer/stores/app'
import type { AgentItem } from '@renderer/api/agents'
import { avatarIndexOf, formatListTime } from '@renderer/utils/chat'
import { focusMainWindow, openAgentWindow } from '@renderer/utils/window'

const router = useRouter()
const app = useAppStore()
const agents = useAgentsStore()

const toastMessage = ref('')
const showIdentityMenu = ref(false)
const identityButton = ref<HTMLButtonElement | null>(null)
const menuAgentId = ref('')
const rowMenuAnchor = ref<HTMLElement | null>(null)
const pendingDelete = ref<AgentItem | null>(null)

const userName = computed(() => app.nickname)
const currentAgent = computed(() => app.actingAgent)
const quotaFull = computed(() => !agents.canCreate)
const menuAgent = computed(
  () => agents.list.find((item) => item.agentId === menuAgentId.value) ?? null
)

/** 最近活跃：当天精确到分钟，跨天显示日期 */
function activeText(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const diff = Date.now() - date.getTime()
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60 / 1000)} 分钟前`
  if (diff < 24 * 60 * 60 * 1000 && new Date().getDate() === date.getDate()) {
    return `${Math.floor(diff / 60 / 60 / 1000)} 小时前`
  }
  return `${formatListTime(value)} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`
}

function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

onMounted(() => {
  void agents.load()
})

/** 行操作菜单：同一时刻只允许一个，锚点为当前点击的 ... 按钮 */
function toggleRowMenu(agent: AgentItem, event: MouseEvent): void {
  if (menuAgentId.value === agent.agentId) {
    closeRowMenu()
    return
  }
  rowMenuAnchor.value = event.currentTarget as HTMLElement
  menuAgentId.value = agent.agentId
}

function closeRowMenu(): void {
  menuAgentId.value = ''
  rowMenuAnchor.value = null
}

function openCreate(): void {
  if (quotaFull.value) {
    showToast(`已达到 ${AGENT_LIMIT} 个 Agent 上限，停用或删除后可继续创建`)
    return
  }
  void router.push('/agents/new')
}

function openEdit(agent: AgentItem): void {
  closeRowMenu()
  void router.push(`/agents/${agent.agentId}/edit`)
}

function openPermissions(agent: AgentItem): void {
  closeRowMenu()
  void router.push(`/agents/${agent.agentId}/permissions`)
}

async function toggleStatus(agent: AgentItem): Promise<void> {
  closeRowMenu()
  try {
    await agents.setStatus(agent.agentId, agent.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE')
    showToast(agent.status === 'ACTIVE' ? '已停用该 Agent' : '已启用该 Agent')
  } catch (error) {
    showToast(errorText(error, '操作失败'))
  }
}

function askDelete(agent: AgentItem): void {
  closeRowMenu()
  pendingDelete.value = agent
}

async function confirmDelete(): Promise<void> {
  const agent = pendingDelete.value
  pendingDelete.value = null
  if (!agent) return
  try {
    await agents.remove(agent.agentId)
    showToast(`已删除 ${agent.nickname}`)
  } catch (error) {
    showToast(errorText(error, '删除失败'))
  }
}

function onSwitchAgent(agentId: string): void {
  showIdentityMenu.value = false
  if (app.actingAgent?.agentId === agentId) return
  // Agent 身份在独立主窗口中运行，用户主窗口保持用户身份
  openAgentWindow(agentId)
  const name = agents.list.find((item) => item.agentId === agentId)?.nickname ?? 'Agent'
  showToast(`已在独立窗口打开 ${name}`)
}

function onSwitchUser(): void {
  showIdentityMenu.value = false
  if (!app.actingAgent) return
  focusMainWindow()
  showToast('已切换到用户账号窗口')
}
</script>

<template>
  <div class="flex h-full min-w-0 flex-1 flex-col bg-tertiary">
    <!-- 页头 -->
    <header class="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-6">
      <div class="min-w-0">
        <h1 class="text-page text-foreground">Agent 管理</h1>
        <p class="text-caption text-tertiary-foreground">创建 Agent，让它替你接待好友、管理群聊</p>
      </div>

      <div class="ml-auto flex shrink-0 items-center gap-2">
        <span
          v-if="agents.demo"
          class="rounded-badge border border-warning px-2 py-1 text-micro text-warning"
        >
          本地示例
        </span>

        <span
          class="inline-flex h-7 items-center gap-1 rounded-badge px-2.5 text-caption"
          :class="quotaFull ? 'bg-[#FD802E14] text-warning' : 'bg-accent-subtle text-accent'"
        >
          <span
            class="h-1.5 w-1.5 rounded-full"
            :class="quotaFull ? 'bg-status-warning' : 'bg-status-success'"
          />
          已创建 {{ agents.activeCount }}/{{ AGENT_LIMIT }}
        </span>

        <!-- 切换视角 -->
        <div class="relative">
          <button
            ref="identityButton"
            type="button"
            class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
            @click="showIdentityMenu = !showIdentityMenu"
          >
            <Avatar
              v-if="currentAgent"
              :name="currentAgent.nickname"
              :index="avatarIndexOf(currentAgent.nickname)"
              :avatar-url="currentAgent.avatarUrl"
              :size="28"
            />
            <Avatar
              v-else
              :name="userName"
              :index="app.avatarIndex"
              :avatar-url="app.user?.avatarUrl"
              :size="28"
            />
            <span class="max-w-[96px] truncate">{{ currentAgent?.nickname ?? userName }}</span>
            <AppIcon name="ion:chevron-down" :size="14" class="text-tertiary-foreground" />
          </button>

          <FloatingPanel
            :open="showIdentityMenu"
            :anchor="identityButton"
            align="right"
            @close="showIdentityMenu = false"
          >
            <IdentityPicker
              :agents="agents.activeAgents"
              :current-agent-id="currentAgent?.agentId ?? ''"
              :user-name="userName"
              :user-avatar-url="app.user?.avatarUrl ?? null"
              :busy-id="agents.switching"
              @switch-user="onSwitchUser"
              @switch-agent="onSwitchAgent"
              @manage="showIdentityMenu = false"
            />
          </FloatingPanel>
        </div>

        <button
          v-tooltip="quotaFull ? '名额已满，停用或删除后可继续创建' : ''"
          type="button"
          class="btn-primary h-8 gap-1 px-3"
          :class="quotaFull ? 'cursor-not-allowed opacity-40' : ''"
          :aria-disabled="quotaFull"
          @click="openCreate"
        >
          <AppIcon name="ion:add" :size="16" />
          创建 Agent
        </button>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto p-6">
      <!-- 满额提示 -->
      <div
        v-if="quotaFull"
        class="mb-4 flex items-center gap-2 rounded-md border border-[#FD802E33] bg-[#FD802E14] px-4 py-2.5 text-caption text-warning"
      >
        <AppIcon name="ion:information-circle-outline" :size="16" />
        Agent 名额已满（{{ AGENT_LIMIT }}/{{ AGENT_LIMIT }}）。停用或删除一个 Agent 后可继续创建。
      </div>

      <!-- 接口错误（非网络降级） -->
      <div
        v-if="agents.error && !agents.demo"
        class="mx-auto mt-24 flex max-w-[420px] flex-col items-center gap-3 text-center"
      >
        <div
          class="flex h-16 w-16 items-center justify-center rounded-full bg-input text-tertiary-foreground"
        >
          <AppIcon name="ion:cloud-offline" :size="32" />
        </div>
        <p class="text-section text-foreground">Agent 列表加载失败</p>
        <p class="text-caption text-tertiary-foreground">{{ agents.error }}</p>
        <button type="button" class="btn-primary mt-2 h-8 px-4" @click="agents.load(true)">
          重新加载
        </button>
      </div>

      <!-- 空态 P31 -->
      <div
        v-else-if="agents.loaded && agents.list.length === 0"
        class="mx-auto mt-16 flex w-full max-w-[560px] flex-col items-center gap-3 rounded-[16px] bg-background px-10 py-12 text-center shadow-card"
      >
        <div
          class="mb-2 flex h-[88px] w-[88px] items-center justify-center rounded-full bg-accent-subtle text-accent"
        >
          <AppIcon name="ion:add" :size="36" />
        </div>
        <h2 class="text-[24px] leading-8 font-medium text-foreground">还没有 Agent</h2>
        <p class="max-w-[400px] text-caption text-tertiary-foreground">
          创建一个 Agent，用独立的身份接待好友、参与群聊；白名单之外的对象发起会话会被拒绝。
        </p>
        <button type="button" class="btn-primary mt-3 h-9 px-6" @click="openCreate">
          创建第一个 Agent
        </button>
      </div>

      <!-- 列表 P28 / P30 -->
      <div v-else class="overflow-hidden rounded-lg bg-background shadow-card">
        <div
          class="grid grid-cols-[minmax(0,1.6fr)_110px_170px_minmax(0,1fr)_130px] items-center gap-3 border-b border-divider px-6 py-2.5 text-caption text-tertiary-foreground"
        >
          <span>Agent</span>
          <span>状态</span>
          <span>最近活跃</span>
          <span>归属</span>
          <span class="text-right">操作</span>
        </div>

        <div
          v-for="agent in agents.list"
          :key="agent.agentId"
          class="relative grid grid-cols-[minmax(0,1.6fr)_110px_170px_minmax(0,1fr)_130px] items-center gap-3 border-b border-divider px-6 py-3 transition-colors last:border-b-0 hover:bg-item-hover"
        >
          <div class="flex min-w-0 items-center gap-3">
            <Avatar
              :name="agent.nickname"
              :index="avatarIndexOf(agent.nickname)"
              :avatar-url="agent.avatarUrl"
              :size="40"
              :class="agent.status !== 'ACTIVE' ? 'opacity-50' : ''"
            />
            <div class="min-w-0">
              <p class="flex items-center gap-2 truncate text-label text-foreground">
                {{ agent.nickname }}
                <span
                  v-if="currentAgent?.agentId === agent.agentId"
                  class="rounded-sm bg-accent-subtle px-1.5 py-0.5 text-micro text-accent"
                >
                  当前身份
                </span>
              </p>
              <p class="truncate text-caption text-tertiary-foreground">
                {{ agent.signature || '暂无签名' }}
              </p>
            </div>
          </div>

          <span
            class="inline-flex items-center gap-1.5 text-caption"
            :class="agent.status === 'ACTIVE' ? 'text-status-success' : 'text-tertiary-foreground'"
          >
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="agent.status === 'ACTIVE' ? 'bg-status-success' : 'bg-item-top'"
            />
            {{ agent.status === 'ACTIVE' ? '正常' : '已停用' }}
          </span>

          <span class="text-caption text-tertiary-foreground">{{
            activeText(agent.updatedAt)
          }}</span>

          <div class="flex min-w-0 items-center gap-2">
            <Avatar
              :name="userName"
              :index="app.avatarIndex"
              :avatar-url="app.user?.avatarUrl"
              :size="28"
            />
            <span class="truncate text-small text-muted-foreground">{{ userName }}</span>
          </div>

          <div class="flex items-center justify-end gap-3 text-caption">
            <button type="button" class="text-link hover:text-link-hover" @click="openEdit(agent)">
              编辑
            </button>
            <button
              type="button"
              class="text-link hover:text-link-hover"
              @click="openPermissions(agent)"
            >
              白名单
            </button>
            <button type="button" class="icon-button h-6 w-6" @click="toggleRowMenu(agent, $event)">
              <AppIcon name="ion:ellipsis-horizontal" :size="16" />
            </button>
          </div>
        </div>
      </div>

      <p v-if="agents.loading" class="mt-6 text-center text-caption text-tertiary-foreground">
        正在加载 Agent…
      </p>
    </div>

    <!-- 行操作菜单：挂到 body，避免被列表容器裁切 -->
    <FloatingPanel
      :open="Boolean(menuAgent)"
      :anchor="rowMenuAnchor"
      align="right"
      @close="closeRowMenu"
    >
      <div v-if="menuAgent" class="flex w-32 flex-col rounded-md bg-background p-1 shadow-popover">
        <button
          type="button"
          class="flex h-8 items-center rounded-sm px-2 text-caption text-foreground hover:bg-item-hover"
          @click="toggleStatus(menuAgent)"
        >
          {{ menuAgent.status === 'ACTIVE' ? '停用' : '启用' }}
        </button>
        <button
          type="button"
          class="flex h-8 items-center rounded-sm px-2 text-caption text-danger hover:bg-item-hover"
          @click="askDelete(menuAgent)"
        >
          删除
        </button>
      </div>
    </FloatingPanel>

    <ConfirmDialog
      :visible="Boolean(pendingDelete)"
      title="删除 Agent"
      :description="`删除后「${pendingDelete?.nickname ?? ''}」将无法恢复，历史会话不受影响。确定删除吗？`"
      confirm-text="删除"
      danger
      @cancel="pendingDelete = null"
      @confirm="confirmDelete"
    />

    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
