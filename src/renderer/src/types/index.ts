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
  time: string
  text?: string
  quoted?: string
  quotedSender?: string
  fileName?: string
  fileSize?: string
  duration?: string
  options?: PollOption[]
  votedIndex?: number
  forwardTitle?: string
  forwardLines?: string[]
  /** 占位图片的标题与色板序号（设计稿约定图片为规范占位） */
  imageLabel?: string
  imageTone?: number
  cardTitle?: string
  cardDesc?: string
  cardIcon?: string
  cardSubtitle?: string
}

export interface MemberInfo {
  name: string
  index: number
  role?: '群主' | '管理员' | '成员'
}

export interface Conversation {
  id: string
  name: string
  avatarIndex: number
  preview: string
  time: string
  unread: number
  pinned?: boolean
  group?: boolean
  muted?: boolean
  channel?: boolean
  notice?: string
  owner?: string
  members?: MemberInfo[]
  messages: ChatMessage[]
}

export interface ContactEntry {
  id: string
  name: string
  avatarIndex: number
  desc: string
  group?: string
  online?: boolean
  department?: string
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
  name: string
  avatarIndex: number
  memberCount: number
  owner: string
  notice: string
  conversationId: string
}

export interface FriendRequest {
  id: string
  name: string
  avatarIndex: number
  message: string
  time: string
  status: 'pending' | 'accepted' | 'ignored'
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
