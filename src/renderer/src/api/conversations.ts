import { apiRequest } from '@renderer/api/http'
import { buildQuery } from '@renderer/api/query'
import type { ConversationItem } from '@renderer/api/contracts'

/** 会话列表单页固定 50 条，通过 offset 翻页 */
export const CONVERSATION_PAGE_SIZE = 50

export function listConversations(token: string, offset = 0): Promise<ConversationItem[]> {
  return apiRequest<ConversationItem[]>(`/conversations${buildQuery({ offset })}`, { token })
}

export function createConversation(token: string, targetUserId: string): Promise<ConversationItem> {
  return apiRequest<ConversationItem>('/conversations', {
    method: 'POST',
    token,
    body: { targetUserId }
  })
}

export function createBotConversation(token: string, botId: string): Promise<ConversationItem> {
  return apiRequest<ConversationItem>('/conversations/bot', {
    method: 'POST',
    token,
    body: { botId }
  })
}

export function getConversation(token: string, conversationId: string): Promise<ConversationItem> {
  return apiRequest<ConversationItem>(`/conversations/detail${buildQuery({ conversationId })}`, {
    token
  })
}

export function updateConversationSetting(
  token: string,
  conversationId: string,
  payload: { pinned?: boolean; muted?: boolean }
): Promise<null> {
  return apiRequest<null>(`/conversations/setting${buildQuery({ conversationId })}`, {
    method: 'PUT',
    token,
    body: payload
  })
}

export function deleteConversation(token: string, conversationId: string): Promise<null> {
  return apiRequest<null>(`/conversations${buildQuery({ conversationId })}`, {
    method: 'DELETE',
    token
  })
}

export function markConversationRead(token: string, conversationId: string): Promise<null> {
  return apiRequest<null>(`/conversations/read${buildQuery({ conversationId })}`, {
    method: 'POST',
    token
  })
}

export function markConversationUnread(token: string, conversationId: string): Promise<null> {
  return apiRequest<null>(`/conversations/unread${buildQuery({ conversationId })}`, {
    method: 'POST',
    token
  })
}

export function getUnreadSummary(token: string): Promise<{ totalUnread: number }> {
  return apiRequest<{ totalUnread: number }>('/conversations/unread', { token })
}
