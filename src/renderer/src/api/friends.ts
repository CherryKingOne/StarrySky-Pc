import { apiRequest } from '@renderer/api/http'
import { buildQuery } from '@renderer/api/query'
import type {
  FriendEntry,
  FriendRequestDirection,
  FriendRequestEntry,
  FriendRequestStatus
} from '@renderer/api/contracts'

export function listFriends(token: string): Promise<FriendEntry[]> {
  return apiRequest<FriendEntry[]>('/friends', { token })
}

export function sendFriendRequest(
  token: string,
  payload: { toUserId: string; message?: string }
): Promise<null> {
  return apiRequest<null>('/friends/requests', { method: 'POST', token, body: payload })
}

export function listFriendRequests(
  token: string,
  direction: FriendRequestDirection = 'received',
  status?: FriendRequestStatus
): Promise<FriendRequestEntry[]> {
  return apiRequest<FriendRequestEntry[]>(`/friends/requests${buildQuery({ direction, status })}`, {
    token
  })
}

export function acceptFriendRequest(token: string, requestId: string): Promise<null> {
  return apiRequest<null>(`/friends/requests/${encodeURIComponent(requestId)}/accept`, {
    method: 'POST',
    token
  })
}

export function rejectFriendRequest(token: string, requestId: string): Promise<null> {
  return apiRequest<null>(`/friends/requests/${encodeURIComponent(requestId)}/reject`, {
    method: 'POST',
    token
  })
}

export function updateFriendRemark(token: string, friendId: string, remark: string): Promise<null> {
  return apiRequest<null>(`/friends/${encodeURIComponent(friendId)}`, {
    method: 'PUT',
    token,
    body: { remark }
  })
}

export function deleteFriend(token: string, friendId: string): Promise<null> {
  return apiRequest<null>(`/friends/${encodeURIComponent(friendId)}`, { method: 'DELETE', token })
}
