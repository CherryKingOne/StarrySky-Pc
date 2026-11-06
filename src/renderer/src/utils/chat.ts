import { API_ORIGIN } from '@renderer/api/http'
import type { ApiUser, ConversationItem, MessageItem } from '@renderer/api/contracts'
import type { ChatMessage, Conversation } from '@renderer/types'

/** 根据名称稳定映射到 1-6 的头像色板序号 */
export function avatarIndexOf(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997
  return (hash % 6) + 1
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** 会话列表时间：今天 HH:mm / 昨天 / MM-DD */
export function formatListTime(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return ''
  const now = new Date()
  if (isSameDay(date, now)) return `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(date, yesterday)) return '昨天'
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 消息时间：今天 HH:mm / 昨天 HH:mm / MM-DD HH:mm */
export function formatMessageTime(value: string | null | undefined): string {
  const date = parseDate(value)
  if (!date) return ''
  const now = new Date()
  const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  if (isSameDay(date, now)) return clock
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(date, yesterday)) return `昨天 ${clock}`
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${clock}`
}

/** 后端返回的媒体地址可能是 /api/v1/files/{id}/content，需要补全 origin */
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  return url.startsWith('/') ? `${API_ORIGIN}${url}` : `${API_ORIGIN}/${url}`
}

export function humanFileSize(size: number | null | undefined): string {
  if (!size || size < 0) return ''
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`
  return `${Math.max(1, Math.round(size / 1024))} KB`
}

interface ParsedContent {
  url?: string
  name?: string
  fileName?: string
  size?: number
  duration?: number
  title?: string
  subtitle?: string
  desc?: string
  icon?: string
  text?: string
}

function parseContent(content: string): ParsedContent | null {
  const trimmed = content?.trim()
  if (!trimmed || !trimmed.startsWith('{')) return null
  try {
    return JSON.parse(trimmed) as ParsedContent
  } catch {
    return null
  }
}

/** 把后端会话映射成 UI 使用的 Conversation */
export function mapConversation(item: ConversationItem): Conversation {
  const name =
    item.title ||
    item.bot?.nickname ||
    item.target?.nickname ||
    item.target?.username ||
    (item.type === 2 ? '群聊' : '会话')
  return {
    id: item.conversationId,
    name,
    avatarIndex: avatarIndexOf(name),
    avatarUrl: item.bot?.avatarUrl ?? item.target?.avatarUrl ?? null,
    preview: item.lastMessagePreview ?? '',
    time: formatListTime(item.lastMessageAt) || (item.lastMessageAt ? '' : ''),
    unread: item.unreadCount ?? 0,
    pinned: item.pinned,
    muted: item.muted,
    group: item.type === 2,
    targetType: item.targetType,
    targetUserId: item.target?.userId ?? item.bot?.botId,
    targetUsername: item.target?.username,
    targetSignature: item.target?.signature,
    bot: item.bot ?? undefined,
    messages: [],
    loaded: false,
    hasMore: false,
    lastMessageId: item.lastMessageId,
    lastMessageAt: item.lastMessageAt,
    createdAt: item.createdAt
  }
}

/** 消息时间分隔阈值：5 分钟（对齐微信） */
export const MESSAGE_TIME_GAP_MS = 5 * 60 * 1000

/**
 * 是否需要在该消息上方显示时间：
 * 首条消息、与上一条间隔超过 5 分钟、或缺少原始时间时按分钟变化降级判断。
 */
export function shouldShowMessageTime(message: ChatMessage, previous?: ChatMessage): boolean {
  if (!previous) return true
  const current = parseDate(message.createdAt)
  const previousDate = parseDate(previous.createdAt)
  if (current && previousDate) {
    return current.getTime() - previousDate.getTime() >= MESSAGE_TIME_GAP_MS
  }
  return message.time !== previous.time
}

export interface MessageMapContext {
  userId: string
  senderName: (senderId: string) => string | undefined
}

/** 把后端消息映射成 MessageBubble 可渲染的 ChatMessage */
export function mapMessage(item: MessageItem, context: MessageMapContext): ChatMessage {
  const direction = item.senderId === context.userId ? 'out' : 'in'
  const base: ChatMessage = {
    id: item.id,
    direction,
    kind: 'text',
    time: formatMessageTime(item.createdAt),
    createdAt: item.createdAt,
    senderId: item.senderId,
    sender: direction === 'in' ? context.senderName(item.senderId) : undefined,
    status: 'sent',
    contentType: item.contentType,
    recalled: item.recalled
  }

  if (item.recalled) {
    return {
      ...base,
      kind: 'notification',
      text: direction === 'out' ? '你撤回了一条消息' : '对方撤回了一条消息'
    }
  }

  const parsed = parseContent(item.content)

  switch (item.contentType) {
    case 2:
      return {
        ...base,
        kind: 'image',
        imageUrl: resolveMediaUrl(parsed?.url),
        imageLabel: parsed?.name ?? parsed?.fileName ?? '图片',
        imageTone: 2
      }
    case 3:
      return {
        ...base,
        kind: 'audio',
        audioUrl: resolveMediaUrl(parsed?.url),
        duration: parsed?.duration ? formatDuration(parsed.duration) : '0:00'
      }
    case 4:
      return {
        ...base,
        kind: 'file',
        fileName: parsed?.name ?? '视频',
        fileSize: humanFileSize(parsed?.size),
        fileUrl: resolveMediaUrl(parsed?.url),
        fileId: extractFileId(parsed?.url)
      }
    case 5:
      return {
        ...base,
        kind: 'file',
        fileName: parsed?.name ?? parsed?.fileName ?? '文件',
        fileSize: humanFileSize(parsed?.size),
        fileUrl: resolveMediaUrl(parsed?.url),
        fileId: extractFileId(parsed?.url)
      }
    case 6:
      return {
        ...base,
        kind: 'text',
        text: parsed?.title ?? parsed?.text ?? '[位置]'
      }
    case 7:
      return {
        ...base,
        kind: 'card',
        cardTitle: parsed?.title ?? '名片',
        cardSubtitle: parsed?.subtitle ?? '',
        cardDesc: parsed?.desc ?? '',
        cardIcon: parsed?.icon ?? 'ion:person'
      }
    case 8:
      return { ...base, kind: 'notification', text: item.content }
    default:
      return { ...base, kind: 'text', text: item.content }
  }
}

function extractFileId(url: string | undefined): string | undefined {
  if (!url) return undefined
  const match = url.match(/\/files\/([0-9]+)\/content/)
  return match?.[1]
}

export function formatDuration(seconds: number): string {
  const mm = Math.floor(seconds / 60)
  const ss = Math.round(seconds % 60)
  return `${mm}:${pad(ss)}`
}

export function profileToContact(
  user: ApiUser,
  remark?: string | null
): {
  id: string
  userId: string
  name: string
  avatarIndex: number
  avatarUrl: string | null
  desc: string
  username: string
  remark?: string
} {
  const name = remark || user.nickname || user.username
  return {
    id: user.userId,
    userId: user.userId,
    name,
    avatarIndex: avatarIndexOf(name),
    avatarUrl: user.avatarUrl,
    desc: user.signature || '暂无签名',
    username: user.username,
    remark: remark ?? undefined
  }
}
