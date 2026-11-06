import { apiRequest } from '@renderer/api/http'
import { buildArrayQuery, buildQuery } from '@renderer/api/query'
import type { ApiUser, UpdateProfilePayload } from '@renderer/api/contracts'

export function getCurrentUser(token: string): Promise<ApiUser> {
  return apiRequest<ApiUser>('/users/me', { token })
}

export function updateCurrentUser(token: string, payload: UpdateProfilePayload): Promise<ApiUser> {
  return apiRequest<ApiUser>('/users/me', { method: 'PUT', token, body: payload })
}

export function searchUsers(token: string, keyword: string, limit = 20): Promise<ApiUser[]> {
  return apiRequest<ApiUser[]>(`/users/search${buildQuery({ keyword, limit })}`, { token })
}

export function getUsersBatch(token: string, ids: string[]): Promise<ApiUser[]> {
  if (ids.length === 0) return Promise.resolve([])
  return apiRequest<ApiUser[]>(`/users/batch${buildArrayQuery('ids', ids)}`, { token })
}

export function getUser(token: string, userId: string): Promise<ApiUser> {
  return apiRequest<ApiUser>(`/users/${encodeURIComponent(userId)}`, { token })
}
