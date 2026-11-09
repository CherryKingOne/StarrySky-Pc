import { defineStore } from 'pinia'
import { ApiError } from '@renderer/api/http'
import * as conversationApi from '@renderer/api/conversations'
import * as groupApi from '@renderer/api/groups'
import * as messageApi from '@renderer/api/messages'
import { listMyBots } from '@renderer/api/bots'
import { getUsersBatch } from '@renderer/api/users'
import { uploadFile } from '@renderer/api/files'
import { wsClient, type TypingReceivedData } from '@renderer/api/ws'
import type { ConversationItem, MessageContentType, MessageItem } from '@renderer/api/contracts'
import { useAppStore } from '@renderer/stores/app'
import {
  avatarIndexOf,
  formatListTime,
  formatMessageTime,
  humanFileSize,
  mapConversation,
  mapMessage,
  resolveMediaUrl
} from '@renderer/utils/chat'
import type { ChatMessage, Conversation, MemberInfo } from '@renderer/types'

export type ConversationFilter = 'all' | 'unread' | 'group' | 'channel'

interface SearchResult {
  conversationId: string
  conversationName: string
  avatarIndex: number
  messageId: string
  text: string
  sender: string
  time: string
}

const HIDDEN_CONVERSATIONS_KEY = 'starrysky-hidden-conversations'

/** 用户身份与每个 Agent 身份各自维护「不显示」列表，避免互相污染 */
function hiddenKey(): string {
  const agentId = useAppStore().actingAgent?.agentId
  return `${HIDDEN_CONVERSATIONS_KEY}:${agentId || 'user'}`
}

function readHiddenIds(): string[] {
  try {
    const raw = localStorage.getItem(hiddenKey())
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function writeHiddenIds(ids: string[]): void {
  try {
    localStorage.setItem(hiddenKey(), JSON.stringify(ids))
  } catch {
    /* 隐私模式下忽略持久化失败 */
  }
}

let localSequence = 1
function localId(prefix: string): string {
  // 统一使用 local- 前缀，服务端消息到达时才能识别并替换本地乐观消息
  return `local-${prefix}-${Date.now()}-${localSequence++}`
}

/** 会话列表加载中的共享任务，允许多个窗口等待同一次加载完成 */
let loadTask: { token: string; promise: Promise<void> } | null = null

function emptyConversation(): Conversation[] {
  return []
}

export const useConversationsStore = defineStore('conversations', {
  state: () => ({
    list: emptyConversation(),
    /** 用户手动「不显示」的会话 ID，持久化在本地 */
    hiddenIds: readHiddenIds(),
    activeId: '',
    filter: 'all' as ConversationFilter,
    loading: false,
    loaded: false,
    /** 当前会话内是否已经把「我拥有的机器人」补进会话列表 */
    ownedBotsSynced: false,
    /** P20 消息上下文：需要高亮定位的消息 */
    highlightId: '',
    /** 最近一次搜索关键字，用于 P10 结果页 */
    lastKeyword: '',
    /** 消息发送者资料缓存 */
    profiles: {} as Record<
      string,
      { nickname: string; username: string; avatarUrl: string | null }
    >,
    /** conversationId -> 收到对方输入状态的时间戳 */
    typing: {} as Record<string, number>,
    /** conversationId -> 本端最后一次发送 typing 的时间戳（节流用） */
    typingSentAt: {} as Record<string, number>,
    /** 正在加载历史的会话 */
    loadingHistory: {} as Record<string, boolean>
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
    },
    isTyping(state): (id: string) => boolean {
      return (id: string) => Boolean(state.typing[id])
    }
  },
  actions: {
    /** 登录后/WS 重连后拉取会话列表；并发调用会等待同一次加载 */
    async load(force = false): Promise<void> {
      const token = useAppStore().accessToken
      if (!token) return
      if (loadTask) {
        // 同一身份的加载直接复用；身份已变化时先等旧任务结束，再用新 token 重新加载
        if (loadTask.token === token) {
          await loadTask.promise
          return
        }
        await loadTask.promise.catch(() => undefined)
      }
      if (this.loaded && !force) return
      this.loading = true
      const task = (async () => {
        try {
          // 服务端单页固定 50 条，按 offset 拉取全部会话
          const items: ConversationItem[] = []
          let offset = 0
          while (true) {
            const page = await conversationApi.listConversations(token, offset)
            items.push(...page)
            if (page.length < conversationApi.CONVERSATION_PAGE_SIZE) break
            offset += conversationApi.CONVERSATION_PAGE_SIZE
          }
          // 加载期间身份已切换：丢弃旧身份的结果，避免覆盖新身份的会话
          if (useAppStore().accessToken !== token) return
          const previousActive = this.activeId
          const incoming = items
            .map(mapConversation)
            .filter((conversation) => !this.hiddenIds.includes(conversation.id))
          for (const conversation of incoming) {
            const old = this.list.find((item) => item.id === conversation.id)
            if (old) {
              conversation.messages = old.messages
              conversation.loaded = old.loaded
              conversation.hasMore = old.hasMore
              conversation.notice = old.notice
              conversation.members = old.members
              conversation.owner = old.owner
            }
          }
          this.list = incoming
          this.loaded = true
          if (previousActive && incoming.some((item) => item.id === previousActive)) {
            this.activeId = previousActive
          } else if (incoming.length > 0) {
            this.activeId = incoming[0].id
          } else {
            this.activeId = ''
          }
          if (!this.ownedBotsSynced) {
            this.ownedBotsSynced = true
            // 机器人管理接口只接受用户 Token，Agent 身份下跳过
            if (!useAppStore().actingAgent) {
              void this.syncOwnedBots().catch(() => undefined)
            }
          }
        } finally {
          this.loading = false
        }
      })()
      loadTask = { token, promise: task }
      try {
        await task
      } finally {
        if (loadTask?.promise === task) loadTask = null
      }
    },

    /**
     * 开发者后台创建机器人后，把当前账号拥有的机器人补进会话列表。
     * 客户端不创建机器人本身，只是为已有机器人建立会话入口。
     */
    async syncOwnedBots(): Promise<void> {
      const token = useAppStore().accessToken
      if (!token) return
      const bots = await listMyBots(token)
      const existing = new Set(
        this.list.filter((item) => item.targetType === 'BOT').map((item) => item.bot?.botId)
      )
      const missing = bots.filter((bot) => !existing.has(bot.botId))
      for (const bot of missing) {
        if (bot.status !== 'ACTIVE') continue
        try {
          const item = await conversationApi.createBotConversation(token, bot.botId)
          if (this.hiddenIds.includes(item.conversationId)) continue
          this.upsertConversation(item)
        } catch {
          /* 单个机器人失败不影响其它机器人 */
        }
      }
      if (missing.length > 0) {
        this.list = [...this.list]
        if (!this.activeId && this.list.length > 0) this.activeId = this.list[0].id
      }
    },

    async refresh(): Promise<void> {
      this.loaded = false
      await this.load(true)
    },

    reset(): void {
      this.list = []
      this.activeId = ''
      this.loaded = false
      this.loading = false
      this.ownedBotsSynced = false
      this.profiles = {}
      this.typing = {}
      this.typingSentAt = {}
      this.loadingHistory = {}
      this.highlightId = ''
      this.hiddenIds = readHiddenIds()
    },

    /** 选中会话：标记已读并按需拉历史 */
    async setActive(id: string): Promise<void> {
      this.activeId = id
      const conversation = this.list.find((item) => item.id === id)
      if (!conversation) return
      void this.markRead(id)
      if (!conversation.loaded) await this.loadHistory(id)
    },

    async loadHistory(id: string, beforeId?: string): Promise<void> {
      const token = useAppStore().accessToken
      const conversation = this.list.find((item) => item.id === id)
      if (!token || !conversation || this.loadingHistory[id]) return
      this.loadingHistory[id] = true
      try {
        const items = await messageApi.getMessageHistory(token, id, beforeId)
        await this.ensureProfiles(items)
        const mapped = items
          .slice()
          .reverse()
          .map((item) => this.mapItem(item, conversation))
        if (beforeId) {
          conversation.messages = [...mapped, ...conversation.messages]
        } else {
          const pending = conversation.messages.filter((message) => message.id.startsWith('local-'))
          conversation.messages = [...mapped, ...pending]
        }
        conversation.messages = conversation.messages.filter(
          (message, index, all) => all.findIndex((item) => item.id === message.id) === index
        )
        conversation.loaded = true
        conversation.hasMore = items.length >= messageApi.MESSAGE_HISTORY_PAGE_SIZE
      } finally {
        this.loadingHistory[id] = false
      }
    },

    async loadMoreHistory(id: string): Promise<void> {
      const conversation = this.list.find((item) => item.id === id)
      if (!conversation?.hasMore) return
      const first = conversation.messages.find((message) => !message.id.startsWith('local-'))
      await this.loadHistory(id, first?.id)
    },

    /**
     * 历史消息页专用：翻页拉取指定会话的全部历史，
     * 以便按日期统计哪些天有消息。服务端每页固定 20 条，单次最多 40 页（约 800 条）。
     */
    async loadAllHistory(id: string, maxPages = 40): Promise<void> {
      const conversation = this.list.find((item) => item.id === id)
      if (!conversation) return
      if (!conversation.loaded) await this.loadHistory(id)
      let pages = 0
      while (conversation.hasMore && pages < maxPages) {
        const first = conversation.messages.find((message) => !message.id.startsWith('local-'))
        if (!first) break
        const before = first.id
        await this.loadHistory(id, before)
        const nextFirst = conversation.messages.find((message) => !message.id.startsWith('local-'))
        if (!nextFirst || nextFirst.id === before) break
        pages += 1
      }
    },

    async markRead(id: string): Promise<void> {
      const conversation = this.list.find((item) => item.id === id)
      if (conversation) conversation.unread = 0
      const token = useAppStore().accessToken
      if (!token) return
      await conversationApi.markConversationRead(token, id).catch(() => undefined)
    },

    /** 标为未读：本地先显示角标，服务端同步 unread_count=1 */
    async markUnread(id: string): Promise<void> {
      const conversation = this.list.find((item) => item.id === id)
      if (!conversation) return
      const previous = conversation.unread
      conversation.unread = 1
      const token = useAppStore().accessToken
      if (!token) return
      await conversationApi.markConversationUnread(token, id).catch(() => {
        conversation.unread = previous
      })
    },

    /** 「不显示聊天」：仅从本机会话列表隐藏，保留服务端会话与历史 */
    hideConversation(id: string): void {
      if (!this.hiddenIds.includes(id)) {
        this.hiddenIds.push(id)
        writeHiddenIds(this.hiddenIds)
      }
      const index = this.list.findIndex((item) => item.id === id)
      if (index >= 0) this.list.splice(index, 1)
      if (this.activeId === id) this.activeId = this.list[0]?.id ?? ''
    },

    unhideConversation(id: string): void {
      const index = this.hiddenIds.indexOf(id)
      if (index < 0) return
      this.hiddenIds.splice(index, 1)
      writeHiddenIds(this.hiddenIds)
    },

    markAllRead(): void {
      for (const conversation of this.list) {
        if (conversation.unread > 0) void this.markRead(conversation.id)
      }
    },

    setFilter(filter: ConversationFilter): void {
      this.filter = filter
    },

    async togglePin(id: string): Promise<boolean> {
      const target = this.list.find((item) => item.id === id)
      if (!target) return false
      const pinned = !target.pinned
      target.pinned = pinned
      const token = useAppStore().accessToken
      if (token) {
        await conversationApi.updateConversationSetting(token, id, { pinned }).catch(() => {
          target.pinned = !pinned
        })
      }
      return pinned
    },

    async toggleMute(id: string): Promise<boolean> {
      const target = this.list.find((item) => item.id === id)
      if (!target) return false
      const muted = !target.muted
      target.muted = muted
      const token = useAppStore().accessToken
      if (token) {
        await conversationApi.updateConversationSetting(token, id, { muted }).catch(() => {
          target.muted = !muted
        })
      }
      return muted
    },

    async deleteConversation(id: string): Promise<void> {
      this.unhideConversation(id)
      const token = useAppStore().accessToken
      if (token) await conversationApi.deleteConversation(token, id).catch(() => undefined)
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

    /** 打开与某个用户 / Agent 的单聊（targetId 为 userId 或 agentId） */
    async openWithUser(targetId: string): Promise<string> {
      const token = useAppStore().accessToken
      if (!token) throw new ApiError(10100, '未登录')
      const item = await conversationApi.createConversation(token, targetId)
      this.upsertConversation(item)
      await this.setActive(item.conversationId)
      return item.conversationId
    },

    /** 打开与自己的会话（文件传输/备忘）；Agent 身份下以自己的 Agent ID 为准 */
    async openWithSelf(): Promise<string> {
      const app = useAppStore()
      const me = app.actingAgent?.agentId ?? app.user?.userId
      if (!me) throw new ApiError(10100, '未登录')
      return this.openWithUser(me)
    },

    /** 打开与机器人的单聊 */
    async openWithBot(botId: string): Promise<string> {
      const token = useAppStore().accessToken
      if (!token) throw new ApiError(10100, '未登录')
      const item = await conversationApi.createBotConversation(token, botId)
      this.upsertConversation(item)
      await this.setActive(item.conversationId)
      return item.conversationId
    },

    upsertConversation(item: Parameters<typeof mapConversation>[0]): Conversation {
      this.unhideConversation(item.conversationId)
      const mapped = mapConversation(item)
      const existing = this.list.find((conversation) => conversation.id === mapped.id)
      if (existing) {
        Object.assign(existing, {
          ...mapped,
          messages: existing.messages,
          loaded: existing.loaded,
          hasMore: existing.hasMore
        })
        return existing
      }
      this.list.unshift(mapped)
      return mapped
    },

    /** 创建群聊并返回群会话 ID */
    async createGroup(name: string, memberIds: string[]): Promise<string> {
      const token = useAppStore().accessToken
      if (!token) throw new ApiError(10100, '未登录')
      const group = await groupApi.createGroup(token, { name, memberIds })
      const conversationId = `group:${group.groupId}`
      await this.refresh()
      await this.setActive(conversationId)
      void this.loadGroupInfo(conversationId)
      return conversationId
    },

    /** 群资料 / 群成员 */
    async loadGroupInfo(conversationId: string): Promise<void> {
      const token = useAppStore().accessToken
      const conversation = this.list.find((item) => item.id === conversationId)
      if (!token || !conversation?.group) return
      const groupId = conversationId.replace(/^group:/, '')
      try {
        const [detail, members] = await Promise.all([
          groupApi.getGroup(token, groupId),
          groupApi.listGroupMembers(token, groupId)
        ])
        conversation.notice = detail.notice ?? '暂无群公告'
        conversation.owner = detail.owner?.nickname ?? ''
        conversation.myRole = detail.myRole
        conversation.members = members.map((member, index) => {
          // Agent 成员没有 profile，资料来自 agent 摘要；userId 字段实际是 agentId
          const nickname = member.agent?.nickname ?? member.profile?.nickname
          const avatarUrl = member.agent?.avatarUrl ?? member.profile?.avatarUrl ?? null
          return {
            userId: member.userId,
            name: nickname ?? `成员${index + 1}`,
            index: avatarIndexOf(nickname ?? ''),
            avatarUrl,
            targetType: member.agent ? 'AGENT' : 'USER',
            role: member.role === 2 ? '群主' : member.role === 1 ? '管理员' : '成员'
          } as MemberInfo
        })
        // 群成员资料直接预填缓存：users/batch 查不到 Agent，群消息发送者昵称/头像依赖这里
        for (const member of members) {
          const nickname = member.agent?.nickname ?? member.profile?.nickname
          if (!nickname) continue
          this.profiles[member.userId] = {
            nickname,
            username: member.profile?.username ?? member.userId,
            avatarUrl: member.agent?.avatarUrl ?? member.profile?.avatarUrl ?? null
          }
        }
      } catch {
        /* 群资料加载失败不阻塞聊天 */
      }
    },

    /** 发送文本消息 */
    async sendMessage(text: string): Promise<void> {
      const conversation = this.activeConversation
      if (!conversation || !text.trim()) return
      await this.deliver(conversation.id, 1, text.trim())
    },

    async sendTextTo(conversationId: string, text: string): Promise<void> {
      if (!text.trim()) return
      await this.deliver(conversationId, 1, text.trim())
    },

    /** 发送任意 content；contentType 2-8 时 content 必须是包含 url 字段的 JSON 字符串 */
    async sendContent(id: string, contentType: number, content: string): Promise<void> {
      await this.deliver(id, contentType, content)
    },

    /** 上传图片并发送 */
    async sendImageFile(id: string, file: File): Promise<void> {
      const token = useAppStore().accessToken
      if (!token) throw new ApiError(10100, '未登录')
      const info = await uploadFile(token, file, 1)
      await this.deliver(
        id,
        2,
        JSON.stringify({ url: info.url, name: info.fileName, size: info.size, fileId: info.fileId })
      )
    },

    /** 上传普通文件并发送 */
    async sendFileAttachment(id: string, file: File): Promise<void> {
      const token = useAppStore().accessToken
      if (!token) throw new ApiError(10100, '未登录')
      const info = await uploadFile(token, file, 4)
      await this.deliver(
        id,
        5,
        JSON.stringify({ url: info.url, name: info.fileName, size: info.size, fileId: info.fileId })
      )
    },

    /** 上传语音并发送 */
    async sendAudioBlob(id: string, blob: Blob, durationSeconds: number): Promise<void> {
      const token = useAppStore().accessToken
      if (!token) throw new ApiError(10100, '未登录')
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || 'audio/webm' })
      const info = await uploadFile(token, file, 2)
      await this.deliver(
        id,
        3,
        JSON.stringify({
          url: info.url,
          name: info.fileName,
          size: info.size,
          fileId: info.fileId,
          duration: durationSeconds
        })
      )
    },

    /** 发送名片（contentType=7）；非文本消息的 content 必须包含 url 字段 */
    async sendCard(id: string, name: string, desc: string, subtitle = '个人名片'): Promise<void> {
      await this.deliver(
        id,
        7,
        JSON.stringify({
          url: 'starrysky://card',
          title: name,
          subtitle,
          desc,
          icon: 'ion:person'
        })
      )
    },

    /** 投票后端暂未提供，仅本地演示 */
    sendPoll(id: string, title: string): void {
      this.pushMessage(id, {
        id: localId('poll'),
        direction: 'out',
        kind: 'poll',
        time: formatMessageTime(new Date().toISOString()),
        text: title,
        options: [
          { label: '周五 15:00（设计评审）', votes: 1 },
          { label: '周四 10:00（需求预评审）', votes: 0 }
        ]
      })
    },

    /** 合并转发后端暂未提供，仅本地演示 */
    sendForward(id: string, title: string, lines: string[]): void {
      this.pushMessage(id, {
        id: localId('forward'),
        direction: 'out',
        kind: 'forward',
        time: formatMessageTime(new Date().toISOString()),
        forwardTitle: title,
        forwardLines: lines
      })
    },

    async recall(id: string, messageId: string): Promise<void> {
      const conversation = this.list.find((item) => item.id === id)
      if (!conversation) return
      if (messageId.startsWith('local-')) {
        this.removeMessage(id, messageId)
        return
      }
      const token = useAppStore().accessToken
      if (!token) return
      try {
        const item = wsClient.isConnected()
          ? await wsClient.send<MessageItem>('message.recall', { messageId })
          : await messageApi.recallMessage(token, messageId)
        this.applyRecall(item)
      } catch {
        const message = conversation.messages.find((entry) => entry.id === messageId)
        if (message) {
          message.kind = 'notification'
          message.text = '撤回失败'
        }
      }
    },

    removeMessage(conversationId: string, messageId: string): void {
      const conversation = this.list.find((item) => item.id === conversationId)
      if (!conversation) return
      const index = conversation.messages.findIndex((item) => item.id === messageId)
      if (index > -1) conversation.messages.splice(index, 1)
    },

    async updateGroupNotice(id: string, notice: string): Promise<void> {
      const token = useAppStore().accessToken
      if (token && id.startsWith('group:')) {
        await groupApi.updateGroupNotice(token, id.replace(/^group:/, ''), notice)
      }
      const target = this.list.find((item) => item.id === id)
      if (target) target.notice = notice
    },

    async updateGroupName(id: string, name: string): Promise<void> {
      const token = useAppStore().accessToken
      if (token && id.startsWith('group:')) {
        await groupApi.updateGroup(token, id.replace(/^group:/, ''), { name })
      }
      const target = this.list.find((item) => item.id === id)
      if (target) target.name = name
    },

    async removeGroupMember(id: string, userId: string, name: string): Promise<void> {
      const token = useAppStore().accessToken
      if (!token || !id.startsWith('group:')) throw new ApiError(10100, '未登录')
      await groupApi.removeGroupMember(token, id.replace(/^group:/, ''), userId)
      this.removeMember(id, name)
    },

    async setGroupAdmin(id: string, userId: string, admin: boolean): Promise<void> {
      const token = useAppStore().accessToken
      if (!token || !id.startsWith('group:')) throw new ApiError(10100, '未登录')
      await groupApi.setGroupAdmin(token, id.replace(/^group:/, ''), userId, admin)
      await this.loadGroupInfo(id)
    },

    async muteGroupMember(id: string, userId: string, minutes: number): Promise<void> {
      const token = useAppStore().accessToken
      if (!token || !id.startsWith('group:')) throw new ApiError(10100, '未登录')
      await groupApi.muteGroupMember(token, id.replace(/^group:/, ''), userId, minutes)
      await this.loadGroupInfo(id)
    },

    async transferGroupOwner(id: string, newOwnerId: string): Promise<void> {
      const token = useAppStore().accessToken
      if (!token || !id.startsWith('group:')) throw new ApiError(10100, '未登录')
      await groupApi.transferGroupOwner(token, id.replace(/^group:/, ''), newOwnerId)
      await this.loadGroupInfo(id)
    },

    async disbandGroup(id: string): Promise<void> {
      const token = useAppStore().accessToken
      if (!token || !id.startsWith('group:')) throw new ApiError(10100, '未登录')
      await groupApi.disbandGroup(token, id.replace(/^group:/, ''))
      await this.deleteConversation(id)
    },

    async inviteGroupMembers(id: string, userIds: string[]): Promise<void> {
      const token = useAppStore().accessToken
      if (!token || !id.startsWith('group:')) throw new ApiError(10100, '未登录')
      await groupApi.inviteGroupMembers(token, id.replace(/^group:/, ''), userIds)
      await this.loadGroupInfo(id)
    },

    removeMember(id: string, name: string): void {
      const target = this.list.find((item) => item.id === id)
      if (!target?.members) return
      target.members.splice(
        target.members.findIndex((member) => member.name === name),
        1
      )
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

    pushMessage(conversationId: string, message: ChatMessage): void {
      const conversation = this.list.find((item) => item.id === conversationId)
      if (!conversation) return
      conversation.messages.push(message)
      this.touchConversation(conversation, message)
    },

    /** 输入中状态：3 秒节流 */
    sendTyping(conversationId: string): void {
      const now = Date.now()
      const last = this.typingSentAt[conversationId] ?? 0
      if (now - last < 3000) return
      this.typingSentAt[conversationId] = now
      if (wsClient.isConnected()) {
        void wsClient.send('typing.send', { conversationId }, 5000).catch(() => undefined)
      }
    },

    /** P10 聊天记录搜索：跨会话检索已加载的消息 */
    searchMessages(keyword: string): SearchResult[] {
      const kw = keyword.trim().toLowerCase()
      this.lastKeyword = keyword
      if (!kw) return []
      const results: SearchResult[] = []
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

    /** 搜索前预拉所有会话的最近一页历史（服务端固定 20 条） */
    async prefetchHistories(): Promise<void> {
      const token = useAppStore().accessToken
      if (!token) return
      const pending = this.list.filter((conversation) => !conversation.loaded)
      await Promise.all(
        pending.map(async (conversation) => {
          try {
            const items = await messageApi.getMessageHistory(token, conversation.id)
            await this.ensureProfiles(items)
            conversation.messages = items
              .slice()
              .reverse()
              .map((item) => this.mapItem(item, conversation))
            conversation.loaded = true
            conversation.hasMore = items.length >= messageApi.MESSAGE_HISTORY_PAGE_SIZE
          } catch {
            /* 单个会话失败不影响其它会话 */
          }
        })
      )
    },

    setHighlight(messageId: string): void {
      this.highlightId = messageId
    },

    clearHighlight(): void {
      this.highlightId = ''
    },

    /** 绑定 WS 下行事件，forward 用于把事件转发给独立会话窗口，返回解绑函数 */
    bindRealtime(forward?: (type: string, data: unknown) => void): () => void {
      const offNew = wsClient.on<MessageItem>('message.new', (data) => {
        this.receiveMessage(data)
        forward?.('message.new', data)
      })
      const offSync = wsClient.on<MessageItem>('message.sync', (data) => {
        this.receiveMessage(data, true)
        forward?.('message.sync', data)
      })
      const offRecall = wsClient.on<MessageItem>('message.recalled', (data) => {
        this.applyRecall(data)
        forward?.('message.recalled', data)
      })
      const offTyping = wsClient.on<TypingReceivedData>('typing.received', (data) => {
        this.receiveTyping(data.conversationId)
        forward?.('typing.received', data)
      })
      return () => {
        offNew()
        offSync()
        offRecall()
        offTyping()
      }
    },

    receiveMessage(item: MessageItem, isSync = false): void {
      // 隐藏的会话收到新消息后重新显示
      this.unhideConversation(item.conversationId)
      const conversation = this.list.find((entry) => entry.id === item.conversationId)
      if (!conversation) {
        void this.refresh().then(() => {
          const target = this.list.find((entry) => entry.id === item.conversationId)
          if (target) this.appendServerMessage(target, item, isSync)
        })
        return
      }
      this.appendServerMessage(conversation, item, isSync)
    },

    appendServerMessage(conversation: Conversation, item: MessageItem, isSync: boolean): void {
      const mapped = this.mapItem(item, conversation)
      const optimistic = conversation.messages.find(
        (message) =>
          message.status === 'sending' &&
          message.direction === mapped.direction &&
          message.kind === mapped.kind &&
          (mapped.text === undefined || message.text === mapped.text) &&
          (mapped.fileName === undefined || message.fileName === mapped.fileName)
      )
      if (optimistic) {
        const index = conversation.messages.indexOf(optimistic)
        conversation.messages.splice(index, 1, mapped)
      } else if (!conversation.messages.some((message) => message.id === mapped.id)) {
        conversation.messages.push(mapped)
      }
      // 兼容旧版本本地 ID（m-xxx）：同一内容已有服务端消息时移除本地副本
      const serverMessages = conversation.messages.filter((message) => /^\d+$/.test(message.id))
      conversation.messages = conversation.messages.filter((message) => {
        if (message.id.startsWith('local-') || /^\d+$/.test(message.id)) return true
        return !serverMessages.some(
          (server) =>
            server.direction === message.direction &&
            server.kind === message.kind &&
            (server.text ?? '') === (message.text ?? '') &&
            (server.fileName ?? '') === (message.fileName ?? '')
        )
      })
      if (mapped.direction === 'in' && !conversation.bot) {
        void this.ensureProfiles([item]).catch(() => undefined)
      }
      this.touchConversation(conversation, mapped, isSync)
      conversation.time = formatListTime(item.createdAt)
      conversation.lastMessageAt = item.createdAt
      if (conversation.id === this.activeId && mapped.direction === 'in') {
        void this.markRead(conversation.id)
      }
    },

    applyRecall(item: MessageItem): void {
      const conversation = this.list.find((entry) => entry.id === item.conversationId)
      if (!conversation) return
      const index = conversation.messages.findIndex((message) => message.id === item.id)
      if (index < 0) return
      const direction = conversation.messages[index].direction
      conversation.messages[index] = {
        id: item.id,
        direction,
        kind: 'notification',
        time: formatMessageTime(item.recalledAt ?? item.createdAt),
        createdAt: item.recalledAt ?? item.createdAt,
        text: direction === 'out' ? '你撤回了一条消息' : '对方撤回了一条消息',
        recalled: true
      }
    },

    receiveTyping(conversationId: string): void {
      const conversation = this.list.find((item) => item.id === conversationId)
      if (!conversation) return
      this.typing[conversationId] = Date.now()
      window.setTimeout(() => {
        if (Date.now() - (this.typing[conversationId] ?? 0) >= 3000) {
          delete this.typing[conversationId]
        }
      }, 3200)
    },

    async ensureProfiles(items: MessageItem[]): Promise<void> {
      const token = useAppStore().accessToken
      if (!token) return
      const app = useAppStore()
      const me = app.actingAgent?.agentId ?? app.user?.userId
      const missing = new Set<string>()
      for (const item of items) {
        if (item.senderId === me) continue
        if (this.profiles[item.senderId]) continue
        const conversation = this.list.find((entry) => entry.id === item.conversationId)
        if (conversation?.bot?.botId === item.senderId) continue
        if (conversation?.agent?.agentId === item.senderId) continue
        missing.add(item.senderId)
      }
      if (missing.size === 0) return
      try {
        const users = await getUsersBatch(token, [...missing])
        for (const user of users) {
          this.profiles[user.userId] = {
            nickname: user.nickname,
            username: user.username,
            avatarUrl: user.avatarUrl
          }
        }
      } catch {
        /* 资料加载失败时降级显示会话名称 */
      }
    },

    mapItem(item: MessageItem, conversation: Conversation): ChatMessage {
      const app = useAppStore()
      // 会话方向必须按「当前生效身份」判断：Agent 身份下自己发出的消息 senderId 是 agentId
      const me = app.actingAgent?.agentId ?? app.user?.userId ?? ''
      return mapMessage(item, {
        userId: me,
        senderName: (senderId) => {
          if (conversation.bot?.botId === senderId) return conversation.bot.nickname
          if (conversation.targetUserId === senderId) return conversation.name
          return this.profiles[senderId]?.nickname ?? conversation.name
        }
      })
    },

    touchConversation(conversation: Conversation, message: ChatMessage, isSync = false): void {
      conversation.preview =
        message.direction === 'out'
          ? `我：${previewOf(message)}`
          : `${message.sender ?? conversation.name}：${previewOf(message)}`
      conversation.time = formatListTime(new Date().toISOString())
      conversation.lastMessageAt = new Date().toISOString()
      if (message.direction === 'in' && !isSync && conversation.id !== this.activeId) {
        conversation.unread += 1
      }
      this.list = [...this.list]
    },

    async deliver(conversationId: string, contentType: number, content: string): Promise<void> {
      const token = useAppStore().accessToken
      if (!token) throw new ApiError(10100, '未登录')
      const conversation = this.list.find((item) => item.id === conversationId)
      if (!conversation) throw new ApiError(60001, '会话不存在')

      const optimistic: ChatMessage = this.optimisticMessage(contentType, content)
      conversation.messages.push(optimistic)
      this.touchConversation(conversation, optimistic)

      try {
        const item = wsClient.isConnected()
          ? await wsClient.send<MessageItem>('message.send', {
              conversationId,
              contentType,
              content
            })
          : await messageApi.sendMessage(token, {
              conversationId,
              content,
              contentType: contentType as MessageContentType
            })
        await this.ensureProfiles([item])
        this.appendServerMessage(conversation, item, true)
      } catch (error) {
        optimistic.status = 'failed'
        this.list = [...this.list]
        throw error
      }
    },

    optimisticMessage(contentType: number, content: string): ChatMessage {
      const parsed = parseContentForOptimistic(content)
      const now = new Date().toISOString()
      const base: ChatMessage = {
        id: localId('m'),
        direction: 'out',
        kind: 'text',
        time: formatMessageTime(now),
        createdAt: now,
        status: 'sending',
        contentType
      }
      switch (contentType) {
        case 2:
          return {
            ...base,
            kind: 'image',
            imageUrl: resolveMediaUrl(parsed?.url),
            imageLabel: parsed?.name ?? '图片',
            imageTone: 2
          }
        case 3:
          return {
            ...base,
            kind: 'audio',
            audioUrl: resolveMediaUrl(parsed?.url),
            duration: parsed?.duration
              ? `${Math.floor(parsed.duration / 60)}:${String(Math.round(parsed.duration % 60)).padStart(2, '0')}`
              : '0:00'
          }
        case 5:
        case 4:
          return {
            ...base,
            kind: 'file',
            fileName: parsed?.name ?? '文件',
            fileSize: humanFileSize(parsed?.size)
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
        default:
          return { ...base, kind: 'text', text: content }
      }
    }
  }
})

function previewOf(message: ChatMessage): string {
  if (message.text) return message.text
  if (message.fileName) return `[文件] ${message.fileName}`
  if (message.kind === 'image') return '[图片]'
  if (message.kind === 'audio') return '[语音]'
  if (message.forwardTitle) return `[聊天记录] ${message.forwardTitle}`
  return '[消息]'
}

function parseContentForOptimistic(content: string): {
  url?: string
  name?: string
  size?: number
  duration?: number
  title?: string
  subtitle?: string
  desc?: string
  icon?: string
} | null {
  const trimmed = content.trim()
  if (!trimmed.startsWith('{')) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}
