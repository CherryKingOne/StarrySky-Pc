<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import FloatingPanel from '@renderer/components/FloatingPanel.vue'
import SwitchToggle from '@renderer/components/SwitchToggle.vue'
import Toast from '@renderer/components/Toast.vue'
import { useAgentsStore } from '@renderer/stores/agents'
import { useContactsStore } from '@renderer/stores/contacts'
import { getAgent, type AgentChatPermission, type AgentItem } from '@renderer/api/agents'
import { avatarIndexOf } from '@renderer/utils/chat'

const REJECT_REPLY_KEY = 'starrysky-agent-reject-reply'

const route = useRoute()
const router = useRouter()
const agents = useAgentsStore()
const contacts = useContactsStore()

const agentId = computed(() => String(route.params.agentId ?? ''))
const agent = ref<AgentItem | null>(null)
const keyword = ref('')
const pickerType = ref<'USER' | 'GROUP' | ''>('')
const userButton = ref<HTMLButtonElement | null>(null)
const groupButton = ref<HTMLButtonElement | null>(null)
const pickerAnchor = computed(() =>
  pickerType.value === 'USER' ? userButton.value : groupButton.value
)
const toastMessage = ref('')
const pendingKeys = ref<string[]>([])
const rejectReply = ref(readRejectReply())

function readRejectReply(): boolean {
  try {
    const raw = localStorage.getItem(REJECT_REPLY_KEY)
    return raw === null ? true : raw === '1'
  } catch {
    return true
  }
}

function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}

const granted = computed<AgentChatPermission[]>(() => agents.permissions[agentId.value] ?? [])

function isGranted(type: 'USER' | 'GROUP', id: string): boolean {
  return granted.value.some((item) => item.targetType === type && item.targetId === id)
}

function keyOf(type: string, id: string): string {
  return `${type}:${id}`
}

function matches(name: string): boolean {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return true
  return name.toLowerCase().includes(query)
}

/** 本地示例模式下用于展示两栏对比的候选对象 */
const DEMO_USER_OPTIONS = [
  { id: 'demo-user-3', name: '王琳', desc: '账号 · 外部联系人' },
  { id: 'demo-user-4', name: '赵一', desc: '账号 · 项目协作' }
]
const DEMO_GROUP_OPTIONS = [
  { id: 'demo-group-2', name: '全员大群', desc: '128 人' },
  { id: 'demo-group-3', name: '外部合作群', desc: '36 人' }
]

/** 可添加的账号：当前账号的好友（后端会校验是否为 Agent 好友，无效返回 86009） */
const userCandidates = computed(() => {
  if (agents.demo && contacts.friends.length === 0) {
    return DEMO_USER_OPTIONS.filter((item) => matches(item.name))
      .filter((item) => !isGranted('USER', item.id))
      .map((item) => ({ ...item, avatarIndex: avatarIndexOf(item.name), avatarUrl: null }))
  }
  return contacts.friends
    .filter((item) => item.userId && matches(item.name))
    .filter((item) => !isGranted('USER', item.userId as string))
    .map((item) => ({
      id: item.userId as string,
      name: item.name,
      desc: item.desc,
      avatarIndex: item.avatarIndex,
      avatarUrl: item.avatarUrl ?? null
    }))
})

const groupCandidates = computed(() => {
  if (agents.demo && contacts.groups.length === 0) {
    return DEMO_GROUP_OPTIONS.filter((item) => matches(item.name))
      .filter((item) => !isGranted('GROUP', item.id))
      .map((item) => ({ ...item, avatarIndex: avatarIndexOf(item.name), avatarUrl: null }))
  }
  return contacts.groups
    .filter((item) => matches(item.name))
    .filter((item) => !isGranted('GROUP', item.groupId ?? item.id))
    .map((item) => ({
      id: item.groupId ?? item.id,
      name: item.name,
      desc: `${item.memberCount ?? 0} 人`,
      avatarIndex: item.avatarIndex,
      avatarUrl: item.avatarUrl ?? null
    }))
})

function demoTarget(id: string): { name: string; avatarUrl: null } | null {
  const item = [...DEMO_USER_OPTIONS, ...DEMO_GROUP_OPTIONS].find((entry) => entry.id === id)
  return item ? { name: item.name, avatarUrl: null } : null
}

const filteredCandidates = computed(() =>
  pickerType.value === 'USER' ? userCandidates.value : groupCandidates.value
)

const deniedList = computed(() => [
  ...userCandidates.value.map((item) => ({ ...item, targetType: 'USER' as const })),
  ...groupCandidates.value.map((item) => ({ ...item, targetType: 'GROUP' as const }))
])

function nameOf(record: AgentChatPermission): string {
  if (record.target && 'nickname' in record.target) return record.target.nickname
  if (record.target && 'name' in record.target) return record.target.name
  const person = contacts.friends.find((item) => item.userId === record.targetId)
  if (person) return person.name
  const group = contacts.groups.find((item) => (item.groupId ?? item.id) === record.targetId)
  if (group) return group.name
  return demoTarget(record.targetId)?.name ?? record.targetId
}

function avatarIndexOfRecord(record: AgentChatPermission): number {
  const person = contacts.friends.find((item) => item.userId === record.targetId)
  if (person) return person.avatarIndex
  const target = record.target
  if (target && 'nickname' in target) return avatarIndexOf(target.nickname)
  if (target && 'name' in target) return avatarIndexOf(target.name)
  return avatarIndexOf(nameOf(record))
}

function avatarUrlOf(record: AgentChatPermission): string | null {
  const person = contacts.friends.find((item) => item.userId === record.targetId)
  if (person) return person.avatarUrl ?? null
  return record.target?.avatarUrl ?? null
}

async function grant(type: 'USER' | 'GROUP', id: string, name: string): Promise<void> {
  const key = keyOf(type, id)
  if (pendingKeys.value.includes(key)) return
  pendingKeys.value = [...pendingKeys.value, key]
  try {
    await agents.grant(agentId.value, type, id)
    showToast(`已允许 ${name} 与它聊天`)
    pickerType.value = ''
  } catch (error) {
    showToast(error instanceof Error ? error.message : '添加白名单失败')
  } finally {
    pendingKeys.value = pendingKeys.value.filter((item) => item !== key)
  }
}

async function revoke(type: 'USER' | 'GROUP', id: string, name: string): Promise<void> {
  try {
    await agents.revoke(agentId.value, type, id)
    showToast(`已移出白名单：${name}`)
  } catch (error) {
    showToast(error instanceof Error ? error.message : '移出白名单失败')
  }
}

function toggleRejectReply(value: boolean): void {
  rejectReply.value = value
  try {
    localStorage.setItem(REJECT_REPLY_KEY, value ? '1' : '0')
  } catch {
    /* 忽略持久化失败 */
  }
}

function closePicker(): void {
  pickerType.value = ''
}

function back(): void {
  void router.push('/agents')
}

async function init(): Promise<void> {
  const cached = agents.list.find((item) => item.agentId === agentId.value)
  if (cached) agent.value = cached
  if (!cached && !agents.demo) {
    try {
      agent.value = await getAgent(agents.userToken(), agentId.value)
    } catch (error) {
      showToast(error instanceof Error ? error.message : '加载 Agent 失败')
    }
  }
  await agents.loadPermissions(agentId.value).catch((error) => {
    showToast(error instanceof Error ? error.message : '加载白名单失败')
  })
  await contacts.load().catch(() => undefined)
}

onMounted(() => {
  void agents.load().then(init)
})
</script>

<template>
  <div class="flex h-full min-w-0 flex-1 flex-col bg-tertiary">
    <!-- 页头 -->
    <header class="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-6">
      <button
        v-tooltip="'返回'"
        type="button"
        class="icon-button h-8 w-8 border border-border bg-background"
        @click="back"
      >
        <AppIcon name="ion:chevron-back" :size="18" />
      </button>
      <div class="min-w-0">
        <h1 class="text-page text-foreground">Agent 设置 · 白名单</h1>
        <p class="text-caption text-tertiary-foreground">
          只有白名单内的账号与群聊可以主动和它聊天
        </p>
      </div>

      <div
        v-if="agent"
        class="ml-auto flex shrink-0 items-center gap-2.5 rounded-md border border-border bg-input px-3 py-1.5"
      >
        <Avatar
          :name="agent.nickname"
          :index="avatarIndexOf(agent.nickname)"
          :avatar-url="agent.avatarUrl"
          :size="32"
        />
        <div class="min-w-0">
          <p class="truncate text-label text-foreground">{{ agent.nickname }}</p>
          <p class="truncate text-micro text-tertiary-foreground">
            {{ agent.status === 'ACTIVE' ? '正常' : '已停用' }} · {{ agent.agentId }}
          </p>
        </div>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto p-6">
      <div
        v-if="agents.demo"
        class="mb-4 flex items-center gap-2 rounded-md border border-[#FD802E33] bg-[#FD802E14] px-4 py-2.5 text-caption text-warning"
      >
        <AppIcon name="ion:information-circle-outline" :size="16" />
        后端未连接，当前白名单为本地示例数据，接口恢复后以服务端记录为准。
      </div>

      <!-- 工具栏 -->
      <div class="mb-4 flex items-center gap-3">
        <div
          class="flex h-10 w-[280px] items-center gap-2 rounded-sm border border-border bg-input px-3"
        >
          <AppIcon name="ion:search" :size="16" class="shrink-0 text-placeholder-foreground" />
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索账号或群聊"
            class="h-full w-full bg-transparent text-small text-foreground outline-none placeholder:text-placeholder-foreground"
          />
        </div>

        <button
          ref="userButton"
          type="button"
          class="inline-flex h-10 items-center gap-1.5 rounded-sm border border-border bg-background px-4 text-small text-foreground transition-colors hover:bg-item-hover"
          @click="pickerType = pickerType === 'USER' ? '' : 'USER'"
        >
          <AppIcon name="ion:person-add" :size="16" />
          添加账号
        </button>

        <button
          ref="groupButton"
          type="button"
          class="inline-flex h-10 items-center gap-1.5 rounded-sm border border-border bg-background px-4 text-small text-foreground transition-colors hover:bg-item-hover"
          @click="pickerType = pickerType === 'GROUP' ? '' : 'GROUP'"
        >
          <AppIcon name="ion:people" :size="16" />
          添加群聊
        </button>

        <!-- 候选列表浮层：挂到 body，避免被两栏容器裁切 -->
        <FloatingPanel :open="pickerType !== ''" :anchor="pickerAnchor" @close="closePicker">
          <div
            class="flex max-h-[320px] w-[300px] flex-col overflow-y-auto rounded-md bg-background p-1 shadow-popover"
          >
            <p class="px-2 py-1.5 text-caption text-tertiary-foreground">
              {{
                pickerType === 'USER'
                  ? '从通讯录选择；需为 Agent 好友，否则服务端返回 86009'
                  : '从群列表选择；需 Agent 已在群内，否则服务端返回 86009'
              }}
            </p>
            <p
              v-if="filteredCandidates.length === 0"
              class="px-2 py-4 text-center text-caption text-tertiary-foreground"
            >
              {{ pickerType === 'USER' ? '没有可添加的好友' : '没有可添加的群聊' }}
            </p>
            <button
              v-for="item in filteredCandidates"
              :key="item.id"
              type="button"
              class="flex items-center gap-2 rounded-sm px-2 py-2 text-left hover:bg-item-hover"
              @click="grant(pickerType === 'USER' ? 'USER' : 'GROUP', item.id, item.name)"
            >
              <Avatar
                :name="item.name"
                :index="item.avatarIndex"
                :avatar-url="item.avatarUrl"
                :size="28"
              />
              <span class="min-w-0 flex-1 truncate text-small text-foreground">{{
                item.name
              }}</span>
              <span class="text-micro text-link">添加</span>
            </button>
          </div>
        </FloatingPanel>

        <span class="ml-auto text-caption text-tertiary-foreground">
          可聊 {{ granted.length }} · 不可聊 {{ userCandidates.length + groupCandidates.length }}
        </span>
      </div>

      <!-- 两栏 -->
      <div class="grid grid-cols-2 items-start gap-5">
        <section class="overflow-hidden rounded-lg bg-background shadow-card">
          <div class="flex items-center gap-2 border-b border-divider px-4 py-3">
            <span class="h-1.5 w-1.5 rounded-full bg-status-success" />
            <h2 class="text-section text-foreground">可聊</h2>
            <span class="text-caption text-tertiary-foreground">（{{ granted.length }}）</span>
            <span class="ml-auto text-micro text-status-success">授权通过</span>
          </div>

          <div
            v-for="record in granted"
            :key="keyOf(record.targetType, record.targetId)"
            class="flex items-center gap-3 border-b border-divider px-4 py-2.5 last:border-b-0"
          >
            <Avatar
              :name="nameOf(record)"
              :index="avatarIndexOfRecord(record)"
              :avatar-url="avatarUrlOf(record)"
              :size="36"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-label text-foreground">{{ nameOf(record) }}</p>
              <p class="truncate text-caption text-tertiary-foreground">
                {{ record.targetType === 'USER' ? '账号' : '群聊' }} · {{ record.targetId }}
              </p>
            </div>
            <button
              type="button"
              class="text-caption text-tertiary-foreground transition-colors hover:text-danger"
              @click="revoke(record.targetType, record.targetId, nameOf(record))"
            >
              移出
            </button>
          </div>

          <div
            v-if="granted.length === 0"
            class="flex flex-col items-center gap-2 px-4 py-12 text-center"
          >
            <AppIcon name="ion:lock-closed" :size="28" class="text-tertiary-foreground" />
            <p class="text-caption text-tertiary-foreground">还没有可聊对象</p>
            <p class="text-micro text-tertiary-foreground">未授权对象发起会话会被拒绝</p>
          </div>
        </section>

        <section class="overflow-hidden rounded-lg bg-background shadow-card">
          <div class="flex items-center gap-2 border-b border-divider px-4 py-3">
            <span class="h-1.5 w-1.5 rounded-full bg-status-error" />
            <h2 class="text-section text-foreground">不可聊</h2>
            <span class="text-caption text-tertiary-foreground">
              （{{ userCandidates.length + groupCandidates.length }}）
            </span>
            <span class="ml-auto text-micro text-status-error">发起会话将被拒绝</span>
          </div>

          <div
            v-for="item in deniedList"
            :key="keyOf(item.targetType, item.id)"
            class="flex items-center gap-3 border-b border-divider px-4 py-2.5 last:border-b-0"
          >
            <Avatar
              :name="item.name"
              :index="item.avatarIndex"
              :avatar-url="item.avatarUrl"
              :size="36"
              class="opacity-60"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-label text-tertiary-foreground">{{ item.name }}</p>
              <p class="truncate text-caption text-tertiary-foreground">{{ item.desc }}</p>
            </div>
            <button
              type="button"
              class="text-caption text-link transition-colors hover:text-link-hover"
              @click="grant(item.targetType, item.id, item.name)"
            >
              添加
            </button>
          </div>

          <div
            v-if="deniedList.length === 0"
            class="flex flex-col items-center gap-2 px-4 py-12 text-center"
          >
            <AppIcon name="ion:checkmark-circle-outline" :size="28" class="text-status-success" />
            <p class="text-caption text-tertiary-foreground">通讯录中的对象均已授权</p>
          </div>
        </section>
      </div>

      <!-- 拒绝策略说明 -->
      <section
        class="mt-5 overflow-hidden rounded-lg border border-[#F9556933] bg-background shadow-card"
      >
        <div class="flex items-start gap-3 border-b border-[#F9556933] bg-[#F955690A] px-5 py-4">
          <AppIcon name="ion:shield-outline" :size="22" class="mt-0.5 shrink-0 text-status-error" />
          <div class="min-w-0">
            <h3 class="text-section text-foreground">未授权对象无法发起会话</h3>
            <p class="mt-1 text-caption text-tertiary-foreground">
              白名单外的账号或群聊向该 Agent 发起会话时，请求会被拒绝并返回错误码
              86006，消息不会送达。 该策略由服务端强制执行，不因客户端状态而改变。
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 px-5 py-4">
          <div class="min-w-0 flex-1">
            <p class="text-label text-foreground">拒绝时自动回复提示</p>
            <p class="mt-1 text-caption text-tertiary-foreground">
              本地开关，仅影响自己在客户端看到的提示文案，不改变服务端拒绝策略。
            </p>
          </div>
          <SwitchToggle :model-value="rejectReply" @update:model-value="toggleRejectReply" />
        </div>
      </section>

      <p
        v-if="agents.permissionsLoading"
        class="mt-6 text-center text-caption text-tertiary-foreground"
      >
        正在加载白名单…
      </p>
    </div>

    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
