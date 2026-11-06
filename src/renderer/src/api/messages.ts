import { apiRequest } from '@renderer/api/http'
import { buildQuery } from '@renderer/api/query'
import type { MessageContentType, MessageItem } from '@renderer/api/contracts'

export function sendMessage(
  token: string,
  payload: {
    conversationId: string
    content: string
    contentType?: MessageContentType
  }
): Promise<MessageItem> {
  return apiRequest<MessageItem>('/messages', { method: 'POST', token, body: payload })
}

export function getMessageHistory(
  token: string,
  conversationId: string,
  beforeId?: string,
  limit = 50
): Promise<MessageItem[]> {
  return apiRequest<MessageItem[]>(
    `/messages/history${buildQuery({ conversationId, beforeId, limit })}`,
    { token }
  )
}

export function recallMessage(token: string, messageId: string): Promise<MessageItem> {
  return apiRequest<MessageItem>(`/messages/${encodeURIComponent(messageId)}/recall`, {
    method: 'POST',
    token
  })
}
