import { apiRequest } from '@renderer/api/http'
import type { GroupDetail, GroupItem, GroupMember } from '@renderer/api/contracts'

const groupPath = (groupId: string): string => `/groups/${encodeURIComponent(groupId)}`
const memberPath = (groupId: string, userId: string): string =>
  `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`

export function listGroups(token: string): Promise<GroupItem[]> {
  return apiRequest<GroupItem[]>('/groups', { token })
}

export function createGroup(
  token: string,
  payload: { name: string; avatarUrl?: string; memberIds: string[] }
): Promise<GroupDetail> {
  return apiRequest<GroupDetail>('/groups', { method: 'POST', token, body: payload })
}

export function getGroup(token: string, groupId: string): Promise<GroupDetail> {
  return apiRequest<GroupDetail>(groupPath(groupId), { token })
}

export function updateGroup(
  token: string,
  groupId: string,
  payload: { name?: string; avatarUrl?: string }
): Promise<null> {
  return apiRequest<null>(groupPath(groupId), { method: 'PUT', token, body: payload })
}

export function updateGroupNotice(token: string, groupId: string, notice: string): Promise<null> {
  return apiRequest<null>(`${groupPath(groupId)}/notice`, {
    method: 'PUT',
    token,
    body: { notice }
  })
}

export function disbandGroup(token: string, groupId: string): Promise<null> {
  return apiRequest<null>(groupPath(groupId), { method: 'DELETE', token })
}

export function listGroupMembers(token: string, groupId: string): Promise<GroupMember[]> {
  return apiRequest<GroupMember[]>(`${groupPath(groupId)}/members`, { token })
}

export function inviteGroupMembers(
  token: string,
  groupId: string,
  userIds: string[]
): Promise<null> {
  return apiRequest<null>(`${groupPath(groupId)}/members`, {
    method: 'POST',
    token,
    body: { userIds }
  })
}

export function leaveGroup(token: string, groupId: string): Promise<null> {
  return apiRequest<null>(`${groupPath(groupId)}/members/me`, { method: 'DELETE', token })
}

export function removeGroupMember(token: string, groupId: string, userId: string): Promise<null> {
  return apiRequest<null>(memberPath(groupId, userId), { method: 'DELETE', token })
}

export function setGroupAdmin(
  token: string,
  groupId: string,
  userId: string,
  admin: boolean
): Promise<null> {
  return apiRequest<null>(`${memberPath(groupId, userId)}/role`, {
    method: 'PUT',
    token,
    body: { admin }
  })
}

export function muteGroupMember(
  token: string,
  groupId: string,
  userId: string,
  minutes: number
): Promise<null> {
  return apiRequest<null>(`${memberPath(groupId, userId)}/mute`, {
    method: 'PUT',
    token,
    body: { minutes }
  })
}

export function transferGroupOwner(
  token: string,
  groupId: string,
  newOwnerId: string
): Promise<null> {
  return apiRequest<null>(`${groupPath(groupId)}/transfer-owner`, {
    method: 'POST',
    token,
    body: { newOwnerId }
  })
}
