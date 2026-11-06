export type MessageDirection = 'in' | 'out'

export type MessageKind =
  | 'text'
  | 'image'
  | 'file'
  | 'audio'
  | 'quote'
  | 'notification'
  | 'poll'
  | 'forward'

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
  fileName?: string
  fileSize?: string
  duration?: string
  options?: PollOption[]
  forwardTitle?: string
  forwardLines?: string[]
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
  messages: ChatMessage[]
}

export interface ContactEntry {
  id: string
  name: string
  avatarIndex: number
  desc: string
  group?: string
}

export interface FavoriteEntry {
  id: string
  name: string
  avatarIndex: number
  desc: string
}

export interface SettingsNav {
  key: string
  label: string
}
