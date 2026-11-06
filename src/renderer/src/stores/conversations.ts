import { defineStore } from 'pinia'
import { conversations as seed } from '@renderer/data/mock'
import type { ChatMessage, Conversation, MemberInfo } from '@renderer/types'

export type ConversationFilter = 'all' | 'unread' | 'group' | 'channel'

function nowTime(): string {
  const date = new Date()
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

let sequence = 1

function nextId(prefix: string): string {
  return `${prefix}-${sequence++}`
}

export const useConversationsStore = defineStore('conversations', {
  state: () => ({
    list: seed as Conversation[],
    activeId: seed[0].id,
    filter: 'all' as ConversationFilter,
    /** P20 消息上下文：需要高亮定位的消息 */
    highlightId: '',
    /** 最近一次搜索关键字，用于 P10 结果页 */
    lastKeyword: ''
  }),
  getters: {
    activeConversation(state): Conversation | undefined {
      return state.list.find((item) => item.id === state.activeId) ?? state.list[0]
    },
    totalUnread(state): number {
      return state.list.reduce((total, item) => total + item.unread, 0)
    },
    sortedList(state): Conversation[] {
      return [...state.list].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
    },
    filteredList(): Conversation[] {
      const list = this.sortedList as Conversation[]
      switch (this.filter) {
        case 'unread':
          return list.filter((item) => item.unread > 0)
        case 'group':
          return list.filter((item) => item.group)
        case 'channel':
          return list.filter((item) => item.channel)
        default:
          return list
      }
    },
    imageMessages(state): ChatMessage[] {
      const conversation = state.list.find((item) => item.id === state.activeId)
      return conversation?.messages.filter((message) => message.kind === 'image') ?? []
    }
  },
  actions: {
    setActive(id: string): void {
      this.activeId = id
      this.markRead(id)
    },
    markRead(id: string): void {
      const target = this.list.find((item) => item.id === id)
      if (target) target.unread = 0
    },
    markAllRead(): void {
      this.list.forEach((item) => {
        item.unread = 0
      })
    },
    setFilter(filter: ConversationFilter): void {
      this.filter = filter
    },
    togglePin(id: string): boolean {
      const target = this.list.find((item) => item.id === id)
      if (!target) return false
      target.pinned = !target.pinned
      return Boolean(target.pinned)
    },
    toggleMute(id: string): boolean {
      const target = this.list.find((item) => item.id === id)
      if (!target) return false
      target.muted = !target.muted
      return Boolean(target.muted)
    },
    deleteConversation(id: string): void {
      const index = this.list.findIndex((item) => item.id === id)
      if (index < 0) return
      this.list.splice(index, 1)
      if (this.activeId === id) this.activeId = this.list[0]?.id ?? ''
    },
    clearMessages(id: string): void {
      const target = this.list.find((item) => item.id === id)
      if (!target) return
      target.messages.splice(0, target.messages.length)
      target.preview = '暂无消息'
    },
    /** 从通讯录进入时，找到或创建与某位联系人的会话 */
    ensureConversation(name: string, avatarIndex: number): string {
      const existed = this.list.find((item) => item.name === name)
      if (existed) {
        this.setActive(existed.id)
        return existed.id
      }

      const conversation: Conversation = {
        id: nextId('local'),
        name,
        avatarIndex,
        preview: '开始新的对话吧',
        time: nowTime(),
        unread: 0,
        messages: []
      }
      this.list.unshift(conversation)
      this.setActive(conversation.id)
      return conversation.id
    },
    createGroup(name: string, members: MemberInfo[], avatarIndex = 2): string {
      const memberNames = members.map((member) => member.name).join('、')
      const conversation: Conversation = {
        id: nextId('group'),
        name,
        avatarIndex,
        preview: '群聊已创建',
        time: nowTime(),
        unread: 0,
        group: true,
        owner: '林晓',
        notice: '暂无群公告',
        members: [{ name: '林晓', index: 1, role: '群主' }, ...members],
        messages: [
          {
            id: nextId('m'),
            direction: 'in',
            kind: 'notification',
            time: nowTime(),
            text: `你创建了群聊，成员：${memberNames || '仅自己'}`
          }
        ]
      }
      this.list.unshift(conversation)
      this.setActive(conversation.id)
      return conversation.id
    },
    pushMessage(conversationId: string, message: ChatMessage): void {
      const conversation = this.list.find((item) => item.id === conversationId)
      if (!conversation) return
      conversation.messages.push(message)
      conversation.time = message.time
      const sender = message.sender ? `${message.sender}：` : '我：'
      const text =
        message.text ??
        message.fileName ??
        (message.kind === 'image' ? '[图片]' : undefined) ??
        (message.kind === 'audio' ? '[语音]' : undefined) ??
        message.forwardTitle ??
        '[消息]'
      conversation.preview = message.direction === 'out' ? `我：${text}` : `${sender}${text}`
      if (message.direction === 'in' && conversation.id !== this.activeId) conversation.unread += 1
    },
    sendMessage(text: string, quoted?: string): void {
      const conversation = this.activeConversation
      if (!conversation || !text.trim()) return

      conversation.messages.push({
        id: nextId('m'),
        direction: 'out',
        kind: quoted ? 'quote' : 'text',
        time: nowTime(),
        quoted,
        quotedSender: quoted ? '林晓' : undefined,
        text: text.trim()
      })
      conversation.preview = `我：${text.trim()}`
      conversation.time = nowTime()
    },
    sendFile(conversationId: string, fileName: string, fileSize: string): void {
      this.pushMessage(conversationId, {
        id: nextId('m'),
        direction: 'out',
        kind: 'file',
        time: nowTime(),
        fileName,
        fileSize
      })
    },
    sendImage(conversationId: string, label: string, tone = 1): void {
      this.pushMessage(conversationId, {
        id: nextId('m'),
        direction: 'out',
        kind: 'image',
        time: nowTime(),
        imageLabel: label,
        imageTone: tone
      })
    },
    sendAudio(conversationId: string, duration: string): void {
      this.pushMessage(conversationId, {
        id: nextId('m'),
        direction: 'out',
        kind: 'audio',
        time: nowTime(),
        duration
      })
    },
    sendPoll(conversationId: string, title: string): void {
      this.pushMessage(conversationId, {
        id: nextId('m'),
        direction: 'out',
        kind: 'poll',
        time: nowTime(),
        text: title,
        options: [
          { label: '周五 15:00（设计评审）', votes: 1 },
          { label: '周四 10:00（需求预评审）', votes: 0 }
        ]
      })
    },
    sendCard(conversationId: string, name: string, desc: string): void {
      this.pushMessage(conversationId, {
        id: nextId('m'),
        direction: 'out',
        kind: 'card',
        time: nowTime(),
        cardTitle: name,
        cardSubtitle: desc,
        cardDesc: '个人名片 · 野火科技',
        cardIcon: 'ion:person'
      })
    },
    sendForward(conversationId: string, title: string, lines: string[]): void {
      this.pushMessage(conversationId, {
        id: nextId('m'),
        direction: 'out',
        kind: 'forward',
        time: nowTime(),
        forwardTitle: title,
        forwardLines: lines
      })
    },
    vote(conversationId: string, messageId: string, optionIndex: number): number | undefined {
      const conversation = this.list.find((item) => item.id === conversationId)
      const message = conversation?.messages.find((item) => item.id === messageId)
      if (!message || !message.options) return undefined
      if (message.votedIndex !== undefined) return message.options[message.votedIndex]?.votes
      const option = message.options[optionIndex]
      if (!option) return undefined
      option.votes += 1
      message.votedIndex = optionIndex
      return option.votes
    },
    recall(conversationId: string, messageId: string): void {
      const conversation = this.list.find((item) => item.id === conversationId)
      const message = conversation?.messages.find((item) => item.id === messageId)
      if (!message) return
      conversation!.messages.splice(conversation!.messages.indexOf(message), 1, {
        id: message.id,
        direction: 'in',
        kind: 'notification',
        time: nowTime(),
        text: '你撤回了一条消息'
      })
    },
    removeMessage(conversationId: string, messageId: string): void {
      const conversation = this.list.find((item) => item.id === conversationId)
      if (!conversation) return
      const index = conversation.messages.findIndex((item) => item.id === messageId)
      if (index > -1) conversation.messages.splice(index, 1)
    },
    updateGroupNotice(id: string, notice: string): void {
      const target = this.list.find((item) => item.id === id)
      if (target) target.notice = notice
    },
    updateGroupName(id: string, name: string): void {
      const target = this.list.find((item) => item.id === id)
      if (target) target.name = name
    },
    removeMember(id: string, name: string): void {
      const target = this.list.find((item) => item.id === id)
      if (!target?.members) return
      target.members.splice(
        target.members.findIndex((member) => member.name === name),
        1
      )
    },
    simulateReply(conversationId?: string): void {
      const conversation =
        this.list.find((item) => item.id === (conversationId ?? this.activeId)) ??
        this.activeConversation
      if (!conversation) return

      const message: ChatMessage = {
        id: nextId('m'),
        direction: 'in',
        sender: conversation.group ? '林晓' : conversation.name,
        kind: 'text',
        time: nowTime(),
        text: '收到，稍后同步给你。'
      }
      conversation.messages.push(message)
      conversation.preview = `${message.sender}：${message.text ?? ''}`
      conversation.time = message.time
      // 当前打开的会话不累计未读数
      if (conversation.id !== this.activeId) conversation.unread += 1
    },
    /** P10 聊天记录搜索：跨会话检索消息 */
    searchMessages(keyword: string): {
      conversationId: string
      conversationName: string
      avatarIndex: number
      messageId: string
      text: string
      sender: string
      time: string
    }[] {
      const kw = keyword.trim().toLowerCase()
      this.lastKeyword = keyword
      if (!kw) return []
      const results: {
        conversationId: string
        conversationName: string
        avatarIndex: number
        messageId: string
        text: string
        sender: string
        time: string
      }[] = []
      for (const conversation of this.list) {
        for (const message of conversation.messages) {
          const text =
            message.text ?? message.fileName ?? message.forwardTitle ?? message.imageLabel ?? ''
          if (!text.toLowerCase().includes(kw)) continue
          results.push({
            conversationId: conversation.id,
            conversationName: conversation.name,
            avatarIndex: conversation.avatarIndex,
            messageId: message.id,
            text,
            sender: message.sender ?? (message.direction === 'out' ? '我' : conversation.name),
            time: message.time
          })
        }
      }
      return results
    },
    setHighlight(messageId: string): void {
      this.highlightId = messageId
    },
    clearHighlight(): void {
      this.highlightId = ''
    }
  }
})
