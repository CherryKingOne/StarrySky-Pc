/** 与 docs/api 对齐的接口数据类型。所有雪花 ID 均为字符串。 */

export interface ApiUser {
  userId: string
  username: string
  nickname: string
  avatarUrl: string | null
  gender: number
  signature: string | null
  createdAt: string
}

export interface UpdateProfilePayload {
  nickname?: string
  avatarUrl?: string
  gender?: number
  signature?: string
}

export interface FriendEntry {
  userId: string
  remark: string | null
  profile: ApiUser | null
  createdAt: string
}

export type FriendRequestDirection = 'received' | 'sent'
export type FriendRequestStatus = 0 | 1 | 2

export interface FriendRequestEntry {
  requestId: string
  fromUserId: string
  toUserId: string
  message: string | null
  status: FriendRequestStatus
  fromUser: ApiUser | null
  toUser: ApiUser | null
  createdAt: string
  handledAt: string | null
}

export interface BlockEntry {
  userId: string
  profile: ApiUser | null
  createdAt: string
}

export interface OnlineStatus {
  userId: string
  online: boolean
}

export type ConversationTargetType = 'USER' | 'BOT' | 'GROUP'

export interface BotSummary {
  botId: string
  nickname: string
  avatarUrl: string | null
  description: string
  status: 'ACTIVE' | 'DISABLED'
}

export interface BotItem extends BotSummary {
  appId: string
  ownerId: string
  accessMode: 'WEBSOCKET' | 'WEBHOOK'
  eventMode: 'ALL' | 'PARTIAL'
  createdAt: string
  updatedAt: string
}

export interface CreatedBot extends BotItem {
  appSecret: string
}

export interface BotCredential {
  botId: string
  appId: string
  appSecret: string
}

export interface BotEventConfig {
  botId: string
  accessMode: 'WEBSOCKET' | 'WEBHOOK'
  callbackUrl: string | null
  eventMode: 'ALL' | 'PARTIAL'
  eventTypes: string[]
  updatedAt: string
}

export interface ConversationItem {
  conversationId: string
  type: 1 | 2
  targetType: ConversationTargetType
  title: string | null
  targetId: string
  target: ApiUser | null
  bot: BotSummary | null
  unreadCount: number
  lastReadSeq: string
  pinned: boolean
  muted: boolean
  lastMessageId: string | null
  lastMessageSeq: string | null
  lastMessageSenderId: string | null
  lastMessagePreview: string | null
  lastMessageAt: string | null
  createdAt: string
}

export interface MessageItem {
  id: string
  conversationId: string
  senderId: string
  receiverId: string | null
  contentType: number
  content: string
  seq: string
  recalled: boolean
  recalledAt: string | null
  createdAt: string
}

export interface GroupItem {
  groupId: string
  name: string
  avatarUrl: string | null
  ownerId: string
  memberCount: number
  myRole: number
  createdAt: string
}

export interface GroupDetail extends GroupItem {
  owner: ApiUser | null
  notice: string | null
  maxMembers: number
}

export interface GroupMember {
  userId: string
  role: number
  mutedUntil: string | null
  joinedAt: string
  profile: ApiUser | null
}

export interface FileInfo {
  fileId: string
  fileName: string
  contentType: string
  size: number
  fileType: number
  url: string
  createdAt: string
}

export type MessageContentType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
