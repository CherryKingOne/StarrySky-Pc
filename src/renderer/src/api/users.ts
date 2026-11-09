import { apiRequest } from '@renderer/api/http'
import { buildQuery } from '@renderer/api/query'
import type { ApiUser, UpdateProfilePayload } from '@renderer/api/contracts'

export function getCurrentUser(token: string): Promise<ApiUser> {
  return apiRequest<ApiUser>('/users/me', { token })
}

export function updateCurrentUser(token: string, payload: UpdateProfilePayload): Promise<ApiUser> {
  return apiRequest<ApiUser>('/users/me', { method: 'PUT', token, body: payload })
}

/**
 * 搜索可添加的用户（服务端单次最多返回 20 条，无 limit 参数）：
 * - 昵称包含匹配
 * - 账号名前缀匹配
 * - 手机号 / 邮箱 / 用户 ID 精确匹配（需传完整值）
 */
export function searchUsers(token: string, keyword: string): Promise<ApiUser[]> {
  const normalized = keyword.trim()
  if (!normalized) return Promise.resolve([])
  return apiRequest<ApiUser[]>(`/users/search${buildQuery({ keyword: normalized })}`, { token })
}

export function getUsersBatch(token: string, ids: string[]): Promise<ApiUser[]> {
  const unique = [...new Set(ids.filter(Boolean))].slice(0, 100)
  if (unique.length === 0) return Promise.resolve([])
  return apiRequest<ApiUser[]>(`/users/batch${buildQuery({ ids: unique.join(',') })}`, { token })
}

export function getUser(token: string, userId: string): Promise<ApiUser> {
  return apiRequest<ApiUser>(`/users/${encodeURIComponent(userId)}`, { token })
}
