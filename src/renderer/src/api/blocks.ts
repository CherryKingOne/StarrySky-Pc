import { apiRequest } from '@renderer/api/http'
import type { BlockEntry } from '@renderer/api/contracts'

export function listBlocks(token: string): Promise<BlockEntry[]> {
  return apiRequest<BlockEntry[]>('/blocks', { token })
}

export function blockUser(token: string, blockedUserId: string): Promise<null> {
  return apiRequest<null>('/blocks', { method: 'POST', token, body: { blockedUserId } })
}

export function unblockUser(token: string, blockedUserId: string): Promise<null> {
  return apiRequest<null>(`/blocks/${encodeURIComponent(blockedUserId)}`, {
    method: 'DELETE',
    token
  })
}
