import { apiRequest } from '@renderer/api/http'
import { buildArrayQuery } from '@renderer/api/query'
import type { OnlineStatus } from '@renderer/api/contracts'

export function getPresence(token: string, userId: string): Promise<OnlineStatus> {
  return apiRequest<OnlineStatus>(`/presence/${encodeURIComponent(userId)}`, { token })
}

export function getPresenceBatch(token: string, userIds: string[]): Promise<OnlineStatus[]> {
  if (userIds.length === 0) return Promise.resolve([])
  return apiRequest<OnlineStatus[]>(`/presence${buildArrayQuery('userIds', userIds)}`, { token })
}
