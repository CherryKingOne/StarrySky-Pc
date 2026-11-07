/** Agent 管理接口，路径前缀 /api/v1/agents；字段与错误码以 docs/api/agents 为准 */
import { apiRequest } from '@renderer/api/http'
import type { ApiUser } from '@renderer/api/contracts'

export type AgentStatus = 'ACTIVE' | 'DISABLED' | 'DELETED'

/** AgentResponse */
export interface AgentItem {
  agentId: string
  userId: string
  nickname: string
  avatarUrl: string | null
  gender: number
  signature: string | null
  status: AgentStatus
  createdAt: string
  updatedAt: string
}

export interface CreateAgentPayload {
  nickname: string
  avatarUrl?: string | null
  gender?: number
  signature?: string | null
}

export interface UpdateAgentPayload {
  nickname?: string
  avatarUrl?: string | null
  gender?: number
  signature?: string | null
}

export interface AgentTokenResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  agentId: string
  userId: string
  status: AgentStatus
}

export type AgentPermissionTargetType = 'USER' | 'GROUP'

export interface AgentGroupTarget {
  groupId: string
  name: string
  avatarUrl: string | null
  ownerId: string
  memberCount: number
  myRole: number
  createdAt: string
}

export interface AgentChatPermission {
  targetType: AgentPermissionTargetType
  targetId: string
  target: ApiUser | AgentGroupTarget | null
  createdAt: string
}

/** 当前登录用户名下的 Agent（含 ACTIVE / DISABLED，不含 DELETED） */
export function listAgents(token: string): Promise<AgentItem[]> {
  return apiRequest<AgentItem[]>('/agents', { token })
}

export function getAgent(token: string, agentId: string): Promise<AgentItem> {
  return apiRequest<AgentItem>(`/agents/${encodeURIComponent(agentId)}`, { token })
}

export function createAgent(token: string, payload: CreateAgentPayload): Promise<AgentItem> {
  return apiRequest<AgentItem>('/agents', { method: 'POST', token, body: payload })
}

export function updateAgent(
  token: string,
  agentId: string,
  payload: UpdateAgentPayload
): Promise<AgentItem> {
  return apiRequest<AgentItem>(`/agents/${encodeURIComponent(agentId)}`, {
    method: 'PUT',
    token,
    body: payload
  })
}

export function deleteAgent(token: string, agentId: string): Promise<null> {
  return apiRequest<null>(`/agents/${encodeURIComponent(agentId)}`, { method: 'DELETE', token })
}

export function updateAgentStatus(
  token: string,
  agentId: string,
  status: 'ACTIVE' | 'DISABLED'
): Promise<AgentItem> {
  return apiRequest<AgentItem>(`/agents/${encodeURIComponent(agentId)}/status`, {
    method: 'PUT',
    token,
    body: { status }
  })
}

/** 用用户 Token 换取 Agent 视角的短期令牌（2 小时） */
export function exchangeAgentToken(token: string, agentId: string): Promise<AgentTokenResponse> {
  return apiRequest<AgentTokenResponse>(`/agents/${encodeURIComponent(agentId)}/token`, {
    method: 'POST',
    token
  })
}

export function listChatPermissions(
  token: string,
  agentId: string
): Promise<AgentChatPermission[]> {
  return apiRequest<AgentChatPermission[]>(
    `/agents/${encodeURIComponent(agentId)}/chat-permissions`,
    { token }
  )
}

export function grantChatPermission(
  token: string,
  agentId: string,
  targetType: AgentPermissionTargetType,
  targetId: string
): Promise<AgentChatPermission> {
  return apiRequest<AgentChatPermission>(
    `/agents/${encodeURIComponent(agentId)}/chat-permissions`,
    { method: 'POST', token, body: { targetType, targetId } }
  )
}

export function revokeChatPermission(
  token: string,
  agentId: string,
  targetType: AgentPermissionTargetType,
  targetId: string
): Promise<null> {
  const query = `?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`
  return apiRequest<null>(`/agents/${encodeURIComponent(agentId)}/chat-permissions${query}`, {
    method: 'DELETE',
    token
  })
}
