import { defineStore } from 'pinia'
import { conversations as seed } from '@renderer/data/mock'
import type { ChatMessage, Conversation } from '@renderer/types'

function nowTime(): string {
  const date = new Date()
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

let sequence = 1

export const useConversationsStore = defineStore('conversations', {
  state: () => ({
    list: seed as Conversation[],
    activeId: seed[0].id
  }),
  getters: {
    activeConversation(state): Conversation {
      return state.list.find((item) => item.id === state.activeId) ?? state.list[0]
    },
    totalUnread(state): number {
      return state.list.reduce((total, item) => total + item.unread, 0)
    }
  },
  actions: {
    setActive(id: string): void {
      this.activeId = id
      const target = this.list.find((item) => item.id === id)
      if (target) target.unread = 0
    },
    /** 从通讯录进入时，找到或创建与某位联系人的会话 */
    ensureConversation(name: string, avatarIndex: number): string {
      const existed = this.list.find((item) => item.name === name)
      if (existed) {
        this.setActive(existed.id)
        return existed.id
      }

      const conversation: Conversation = {
        id: `local-${sequence++}`,
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
    sendMessage(text: string): void {
      const conversation = this.activeConversation
      if (!conversation || !text.trim()) return

      const message: ChatMessage = {
        id: `local-${sequence++}`,
        direction: 'out',
        kind: 'text',
        time: nowTime(),
        text: text.trim()
      }
      conversation.messages.push(message)
      conversation.preview = `我：${text.trim()}`
      conversation.time = message.time
    },
    simulateReply(): void {
      const conversation = this.activeConversation
      if (!conversation) return

      const message: ChatMessage = {
        id: `local-${sequence++}`,
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
    }
  }
})
