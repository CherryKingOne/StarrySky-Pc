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

/** Agent 摘要，会话与好友响应中的 agent 字段 */
export interface AgentSummary {
  agentId: string
  nickname: string
  avatarUrl: string | null
  gender: number
  signature: string | null
  status: 'ACTIVE' | 'DISABLED'
}

export type FriendTargetType = 'USER' | 'AGENT'

export interface FriendEntry {
  targetType: FriendTargetType
  userId: string
  remark: string | null
  profile: ApiUser | null
  agent: AgentSummary | null
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

export type ConversationTargetType = 'USER' | 'BOT' | 'AGENT' | 'GROUP'

export interface BotSummary {
  botId: string
  nickname: string
  avatarUrl: string | null
  /** 目录接口固定返回文本；会话内的机器人摘要可能为 null */
  description: string | null
  status: 'ACTIVE' | 'DISABLED'
}

export type BotAccessMode = 'WEBSOCKET' | 'WEBHOOK'
export type BotEventMode = 'ALL' | 'PARTIAL'
/** 机器人可订阅的事件类型 */
export type BotEventType = 'MESSAGE_RECEIVED' | 'GROUP_MESSAGE_RECEIVED' | 'MENTIONED'

export interface BotItem extends Omit<BotSummary, 'description'> {
  appId: string
  ownerId: string
  /** 归属者列表中简介必有值，与会话内的 BotSummary 不同 */
  description: string
  accessMode: BotAccessMode
  eventMode: BotEventMode
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
  accessMode: BotAccessMode
  callbackUrl: string | null
  eventMode: BotEventMode
  eventTypes: BotEventType[]
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
  /** Agent 会话的 Agent 摘要；仅 targetType=AGENT 时返回 */
  agent: AgentSummary | null
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
  /** 人类成员为 userId，Agent 成员为 agentId */
  userId: string
  role: number
  mutedUntil: string | null
  joinedAt: string
  /** 人类成员资料；Agent 成员固定为 null */
  profile: ApiUser | null
  /** Agent 成员摘要；人类成员固定为 null，以 agent != null 判断成员类型 */
  agent: AgentSummary | null
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
