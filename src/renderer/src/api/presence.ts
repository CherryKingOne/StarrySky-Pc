import { apiRequest } from '@renderer/api/http'
import { buildQuery } from '@renderer/api/query'
import type { OnlineStatus } from '@renderer/api/contracts'

export function getPresence(token: string, userId: string): Promise<OnlineStatus> {
  return apiRequest<OnlineStatus>(`/presence/${encodeURIComponent(userId)}`, { token })
}

/** 批量查询：userIds 为逗号分隔的 ID 列表，服务端按 Spring List<Long> 绑定 */
export function getPresenceBatch(token: string, userIds: string[]): Promise<OnlineStatus[]> {
  if (userIds.length === 0) return Promise.resolve([])
  return apiRequest<OnlineStatus[]>(`/presence${buildQuery({ userIds: userIds.join(',') })}`, {
    token
  })
}
