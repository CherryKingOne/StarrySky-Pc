export type MessageDirection = 'in' | 'out'

export type MessageKind =
  'text' | 'image' | 'file' | 'audio' | 'quote' | 'notification' | 'poll' | 'forward' | 'card'

export interface PollOption {
  label: string
  votes: number
}

export interface ChatMessage {
  id: string
  direction: MessageDirection
  kind: MessageKind
  sender?: string
  senderId?: string
  time: string
  text?: string
  quoted?: string
  quotedSender?: string
  fileName?: string
  fileSize?: string
  fileUrl?: string
  fileId?: string
  duration?: string
  audioUrl?: string
  options?: PollOption[]
  votedIndex?: number
  forwardTitle?: string
  forwardLines?: string[]
  /** 占位图片的标题与色板序号（设计稿约定图片为规范占位） */
  imageLabel?: string
  imageTone?: number
  imageUrl?: string
  cardTitle?: string
  cardDesc?: string
  cardIcon?: string
  cardSubtitle?: string
  /** 本地发送状态，服务端消息为 sent */
  status?: 'sending' | 'sent' | 'failed'
  contentType?: number
  recalled?: boolean
}

export interface MemberInfo {
  userId?: string
  name: string
  index: number
  role?: '群主' | '管理员' | '成员'
}

export interface Conversation {
  id: string
  name: string
  avatarIndex: number
  avatarUrl?: string | null
  preview: string
  time: string
  unread: number
  pinned?: boolean
  group?: boolean
  muted?: boolean
  channel?: boolean
  notice?: string
  owner?: string
  myRole?: number
  members?: MemberInfo[]
  messages: ChatMessage[]
  /** 会话对端类型：真人、机器人或群聊 */
  targetType?: 'USER' | 'BOT' | 'GROUP'
  targetUserId?: string
  targetUsername?: string
  targetSignature?: string | null
  bot?: {
    botId: string
    nickname: string
    avatarUrl: string | null
    description: string
    status: 'ACTIVE' | 'DISABLED'
  }
  /** 历史消息是否已加载 */
  loaded?: boolean
  hasMore?: boolean
  lastMessageId?: string | null
  lastMessageAt?: string | null
}

export interface ContactEntry {
  id: string
  /** 真实用户 ID，来自好友/搜索结果 */
  userId?: string
  name: string
  avatarIndex: number
  avatarUrl?: string | null
  desc: string
  group?: string
  online?: boolean
  department?: string
  remark?: string
  username?: string
}

export interface FavoriteEntry {
  id: string
  name: string
  avatarIndex: number
  desc: string
  kind: '文件' | '链接' | '群公告' | '文本'
  source: string
  time: string
  fileSize?: string
  text?: string
}

export interface SettingsNav {
  key: string
  label: string
}

export interface FileEntry {
  id: string
  name: string
  size: string
  kind: 'pdf' | 'doc' | 'zip' | 'image' | 'ppt'
  from: string
  time: string
  conversationId: string
  starred?: boolean
  url?: string
  fileId?: string
}

export interface ChannelEntry {
  id: string
  name: string
  desc: string
  avatarIndex: number
  following: boolean
  unread: number
  posts: { id: string; title: string; time: string; text: string }[]
}

export interface GroupEntry {
  id: string
  groupId?: string
  name: string
  avatarIndex: number
  avatarUrl?: string | null
  memberCount: number
  owner: string
  notice: string
  conversationId: string
  myRole?: number
}

export interface FriendRequest {
  id: string
  requestId?: string
  userId?: string
  name: string
  avatarIndex: number
  avatarUrl?: string | null
  message: string
  time: string
  status: 'pending' | 'accepted' | 'ignored'
  direction?: 'received' | 'sent'
}

export interface OrgNode {
  id: string
  name: string
  title?: string
  avatarIndex?: number
  children?: OrgNode[]
}

export interface WorkbenchApp {
  id: string
  name: string
  desc: string
  icon: string
  tone: number
}

export type CallMode = 'audio' | 'video' | 'group' | 'meeting' | 'screen' | 'remote'
