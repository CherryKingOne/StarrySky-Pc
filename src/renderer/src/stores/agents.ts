import { defineStore } from 'pinia'
import * as agentApi from '@renderer/api/agents'
import type {
  AgentChatPermission,
  AgentItem,
  AgentPermissionTargetType,
  CreateAgentPayload,
  UpdateAgentPayload
} from '@renderer/api/agents'
import { ApiError } from '@renderer/api/http'
import { useAppStore } from '@renderer/stores/app'

/** 当前选中的 Agent 身份（空串表示用户账号） */
const IDENTITY_KEY = 'starrysky-agent-identity'
/** 后端不可用时的本地示例 Agent 列表 */
const DEMO_KEY = 'starrysky-agents-demo'
export const AGENT_LIMIT = 5

function readStored(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function writeStored(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    /* 隐私模式下忽略持久化失败 */
  }
}

/** 服务端时间格式 yyyy-MM-ddTHH:mm:ss（本地时区） */
function localStamp(offsetMs = 0): string {
  const date = new Date(Date.now() + offsetMs)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function buildDemoAgents(userId: string): AgentItem[] {
  const base = {
    userId,
    gender: 0,
    avatarUrl: null,
    status: 'ACTIVE' as const
  }
  return [
    {
      ...base,
      agentId: 'demo-agent-1',
      nickname: '小野',
      signature: '你的贴心助理，随时在线',
      createdAt: localStamp(-3 * 24 * 60 * 60 * 1000),
      updatedAt: localStamp(-2 * 60 * 1000)
    },
    {
      ...base,
      agentId: 'demo-agent-2',
      nickname: '阿禾',
      signature: '帮你整理群聊与日程',
      createdAt: localStamp(-2 * 24 * 60 * 60 * 1000),
      updatedAt: localStamp(-60 * 60 * 1000)
    },
    {
      ...base,
      agentId: 'demo-agent-3',
      nickname: '星野',
      signature: '夜间值守，白天休息',
      createdAt: localStamp(-26 * 60 * 60 * 1000),
      updatedAt: localStamp(-24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000)
    }
  ]
}

function readDemoAgents(userId: string): AgentItem[] {
  const raw = readStored(DEMO_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AgentItem[]
      if (Array.isArray(parsed)) return parsed
    } catch {
      /* 解析失败回退到默认示例 */
    }
  }
  return buildDemoAgents(userId)
}

function writeDemoAgents(list: AgentItem[]): void {
  writeStored(DEMO_KEY, JSON.stringify(list))
}

function demoPermissions(agentId: string): AgentChatPermission[] {
  if (agentId !== 'demo-agent-1') return []
  return [
    {
      targetType: 'USER',
      targetId: 'demo-user-2',
      target: {
        userId: 'demo-user-2',
        username: 'u_demo_user_2',
        nickname: '陈默',
        avatarUrl: null,
        gender: 0,
        signature: '设计协作',
        createdAt: localStamp(-30 * 24 * 60 * 60 * 1000)
      },
      createdAt: localStamp(-24 * 60 * 60 * 1000)
    },
    {
      targetType: 'GROUP',
      targetId: 'demo-group-1',
      target: {
        groupId: 'demo-group-1',
        name: '产品讨论群',
        avatarUrl: null,
        ownerId: 'demo-user-3',
        memberCount: 18,
        myRole: 0,
        createdAt: localStamp(-40 * 24 * 60 * 60 * 1000)
      },
      createdAt: localStamp(-12 * 60 * 60 * 1000)
    }
  ]
}

/** 网络不可用（ApiError -2）时启用本地示例 */
function isNetworkFailure(error: unknown): boolean {
  return error instanceof ApiError && error.code === -2
}

let initialized = false

export const useAgentsStore = defineStore('agents', {
  state: () => ({
    list: [] as AgentItem[],
    loading: false,
    loaded: false,
    /** 后端不可用时的本地示例标记 */
    demo: false,
    error: '',
    switching: '',
    permissions: {} as Record<string, AgentChatPermission[]>,
    permissionsLoading: false
  }),
  getters: {
    activeCount(state): number {
      return state.list.filter((agent) => agent.status === 'ACTIVE').length
    },
    remaining(): number {
      return Math.max(AGENT_LIMIT - this.activeCount, 0)
    },
    canCreate(): boolean {
      return this.activeCount < AGENT_LIMIT
    },
    activeAgents(state): AgentItem[] {
      return state.list.filter((agent) => agent.status === 'ACTIVE')
    },
    usingAgent(): AgentItem | null {
      return useAppStore().actingAgent
    },
    activeAgentId(): string {
      return useAppStore().actingAgent?.agentId ?? ''
    }
  },
  actions: {
    /** 管理类接口只接受用户 Token，Agent Token 会返回 10101 */
    userToken(): string {
      const app = useAppStore()
      return app.userAccessToken || app.accessToken
    },

    async init(): Promise<void> {
      if (initialized) return
      initialized = true
      await this.load()
      const saved = readStored(IDENTITY_KEY)
      if (
        saved &&
        this.list.some((agent) => agent.agentId === saved && agent.status === 'ACTIVE')
      ) {
        await this.switchToAgent(saved).catch(() => undefined)
      }
    },

    async load(force = false): Promise<void> {
      const token = this.userToken()
      if (!token || this.loading) return
      if (this.loaded && !force) return
      this.loading = true
      this.error = ''
      try {
        const list = await agentApi.listAgents(token)
        this.list = list
        this.demo = false
      } catch (error) {
        if (isNetworkFailure(error)) {
          this.demo = true
          this.list = readDemoAgents(useAppStore().user?.userId ?? '')
        } else {
          this.error = error instanceof Error ? error.message : '加载 Agent 列表失败'
        }
      } finally {
        this.loading = false
        this.loaded = true
      }
    },

    /** 切换到用户账号 */
    switchToUser(): void {
      const app = useAppStore()
      if (app.actingAgent) app.endAgentSession()
      writeStored(IDENTITY_KEY, '')
    },

    /** 切换到某个 Agent；后端不可用时降级为本地身份，仅改变界面标识 */
    async switchToAgent(agentId: string): Promise<void> {
      const agent = this.list.find((item) => item.agentId === agentId)
      if (!agent) throw new ApiError(86001, 'Agent 不存在或已删除')
      if (agent.status !== 'ACTIVE') throw new ApiError(86004, 'Agent 已停用，不能切换视角')

      const app = useAppStore()
      this.switching = agentId
      try {
        if (this.demo) {
          app.beginAgentSession(agent)
        } else {
          const token = await agentApi.exchangeAgentToken(this.userToken(), agentId)
          app.beginAgentSession(agent, token.accessToken)
        }
        writeStored(IDENTITY_KEY, agentId)
      } finally {
        this.switching = ''
      }
    },

    async create(payload: CreateAgentPayload): Promise<AgentItem> {
      if (this.demo) {
        const app = useAppStore()
        const agent: AgentItem = {
          agentId: `demo-agent-${Date.now()}`,
          userId: app.user?.userId ?? '',
          nickname: payload.nickname.trim(),
          avatarUrl: payload.avatarUrl ?? null,
          gender: payload.gender ?? 0,
          signature: payload.signature ?? null,
          status: 'ACTIVE',
          createdAt: localStamp(),
          updatedAt: localStamp()
        }
        this.list = [agent, ...this.list]
        writeDemoAgents(this.list)
        return agent
      }
      const agent = await agentApi.createAgent(this.userToken(), payload)
      this.list = [agent, ...this.list]
      return agent
    },

    async update(agentId: string, payload: UpdateAgentPayload): Promise<AgentItem> {
      if (this.demo) {
        const current = this.list.find((item) => item.agentId === agentId)
        if (!current) throw new ApiError(86001, 'Agent 不存在或已删除')
        const next: AgentItem = {
          ...current,
          ...payload,
          nickname: payload.nickname?.trim() || current.nickname,
          updatedAt: localStamp()
        }
        this.list = this.list.map((item) => (item.agentId === agentId ? next : item))
        writeDemoAgents(this.list)
        const app = useAppStore()
        if (app.actingAgent?.agentId === agentId) app.actingAgent = next
        return next
      }
      const agent = await agentApi.updateAgent(this.userToken(), agentId, payload)
      this.list = this.list.map((item) => (item.agentId === agentId ? agent : item))
      const app = useAppStore()
      if (app.actingAgent?.agentId === agentId) app.actingAgent = agent
      return agent
    },

    async setStatus(agentId: string, status: 'ACTIVE' | 'DISABLED'): Promise<void> {
      if (this.demo) {
        if (status === 'ACTIVE' && this.activeCount >= AGENT_LIMIT) {
          throw new ApiError(86003, 'Agent 数量已达上限（最多 5 个）')
        }
        const current = this.list.find((item) => item.agentId === agentId)
        if (!current) throw new ApiError(86001, 'Agent 不存在或已删除')
        const next = { ...current, status, updatedAt: localStamp() }
        this.list = this.list.map((item) => (item.agentId === agentId ? next : item))
        writeDemoAgents(this.list)
        if (status === 'DISABLED' && useAppStore().actingAgent?.agentId === agentId) {
          this.switchToUser()
        }
        return
      }
      const agent = await agentApi.updateAgentStatus(this.userToken(), agentId, status)
      this.list = this.list.map((item) => (item.agentId === agentId ? agent : item))
      if (status === 'DISABLED' && useAppStore().actingAgent?.agentId === agentId) {
        this.switchToUser()
      }
    },

    async remove(agentId: string): Promise<void> {
      if (this.demo) {
        this.list = this.list.filter((item) => item.agentId !== agentId)
        writeDemoAgents(this.list)
      } else {
        await agentApi.deleteAgent(this.userToken(), agentId)
        this.list = this.list.filter((item) => item.agentId !== agentId)
      }
      if (useAppStore().actingAgent?.agentId === agentId) this.switchToUser()
    },

    async loadPermissions(agentId: string, force = false): Promise<void> {
      if (!force && this.permissions[agentId]) return
      if (this.demo) {
        this.permissions[agentId] = demoPermissions(agentId)
        return
      }
      this.permissionsLoading = true
      try {
        const list = await agentApi.listChatPermissions(this.userToken(), agentId)
        this.permissions[agentId] = list
      } finally {
        this.permissionsLoading = false
      }
    },

    async grant(
      agentId: string,
      targetType: AgentPermissionTargetType,
      targetId: string
    ): Promise<AgentChatPermission> {
      if (this.demo) {
        const record: AgentChatPermission = {
          targetType,
          targetId,
          target: null,
          createdAt: localStamp()
        }
        const current = this.permissions[agentId] ?? []
        if (current.some((item) => item.targetId === targetId && item.targetType === targetType)) {
          throw new ApiError(86008, '白名单记录已存在')
        }
        this.permissions[agentId] = [...current, record]
        return record
      }
      const record = await agentApi.grantChatPermission(
        this.userToken(),
        agentId,
        targetType,
        targetId
      )
      this.permissions[agentId] = [...(this.permissions[agentId] ?? []), record]
      return record
    },

    async revoke(
      agentId: string,
      targetType: AgentPermissionTargetType,
      targetId: string
    ): Promise<void> {
      if (this.demo) {
        this.permissions[agentId] = (this.permissions[agentId] ?? []).filter(
          (item) => !(item.targetId === targetId && item.targetType === targetType)
        )
        return
      }
      await agentApi.revokeChatPermission(this.userToken(), agentId, targetType, targetId)
      this.permissions[agentId] = (this.permissions[agentId] ?? []).filter(
        (item) => !(item.targetId === targetId && item.targetType === targetType)
      )
    }
  }
})
