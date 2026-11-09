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

/** 历史消息单页固定 20 条，通过 beforeId 向前翻页 */
export const MESSAGE_HISTORY_PAGE_SIZE = 20

export function getMessageHistory(
  token: string,
  conversationId: string,
  beforeId?: string
): Promise<MessageItem[]> {
  return apiRequest<MessageItem[]>(`/messages/history${buildQuery({ conversationId, beforeId })}`, {
    token
  })
}

export function recallMessage(token: string, messageId: string): Promise<MessageItem> {
  return apiRequest<MessageItem>(`/messages/${encodeURIComponent(messageId)}/recall`, {
    method: 'POST',
    token
  })
}
