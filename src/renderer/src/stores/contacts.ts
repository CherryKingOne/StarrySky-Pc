import { defineStore } from 'pinia'
import * as friendApi from '@renderer/api/friends'
import * as groupApi from '@renderer/api/groups'
import * as userApi from '@renderer/api/users'
import { getPresenceBatch } from '@renderer/api/presence'
import { useAppStore } from '@renderer/stores/app'
import { avatarIndexOf, formatListTime, profileToContact } from '@renderer/utils/chat'
import type { ContactEntry, FriendRequest, GroupEntry } from '@renderer/types'

export const useContactsStore = defineStore('contacts', {
  state: () => ({
    friends: [] as ContactEntry[],
    requests: [] as FriendRequest[],
    groups: [] as GroupEntry[],
    searchResults: [] as ContactEntry[],
    checking: false,
    loaded: false,
    loading: false
  }),
  getters: {
    pendingRequests(state): FriendRequest[] {
      return state.requests.filter((item) => item.status === 'pending')
    },
    friendUserIds(state): Set<string> {
      return new Set(state.friends.map((item) => item.userId).filter(Boolean) as string[])
    }
  },
  actions: {
    async load(force = false): Promise<void> {
      const token = useAppStore().accessToken
      if (!token || this.loading) return
      if (this.loaded && !force) return
      this.loading = true
      try {
        const [friends, requests, groups] = await Promise.all([
          friendApi.listFriends(token),
          friendApi.listFriendRequests(token, 'received'),
          groupApi.listGroups(token)
        ])
        this.friends = friends.map((friend) => {
          const contact = profileToContact(
            friend.profile ?? {
              userId: friend.userId,
              username: friend.userId,
              nickname: friend.remark || '好友',
              avatarUrl: null,
              gender: 0,
              signature: null,
              createdAt: friend.createdAt
            },
            friend.remark
          )
          return {
            ...contact,
            group: contact.name.charAt(0).toUpperCase(),
            desc: contact.desc || '好友',
            createdAt: friend.createdAt
          }
        })
        this.requests = requests.map((request) => {
          const profile = request.fromUser
          const name = profile?.nickname || profile?.username || '用户'
          return {
            id: request.requestId,
            requestId: request.requestId,
            userId: request.fromUserId,
            name,
            avatarIndex: avatarIndexOf(name),
            avatarUrl: profile?.avatarUrl ?? null,
            message: request.message || '申请添加你为好友',
            time: formatListTime(request.createdAt),
            status:
              request.status === 0 ? 'pending' : request.status === 1 ? 'accepted' : 'ignored',
            direction: 'received'
          }
        })
        this.groups = groups.map((group) => ({
          id: group.groupId,
          groupId: group.groupId,
          name: group.name,
          avatarIndex: avatarIndexOf(group.name),
          avatarUrl: group.avatarUrl,
          memberCount: group.memberCount,
          owner: group.ownerId,
          notice: '',
          conversationId: `group:${group.groupId}`,
          myRole: group.myRole,
          createdAt: group.createdAt
        }))
        this.loaded = true
        void this.refreshPresence()
      } finally {
        this.loading = false
      }
    },

    async refreshPresence(): Promise<void> {
      const token = useAppStore().accessToken
      if (!token) return
      const ids = this.friends.map((item) => item.userId).filter(Boolean) as string[]
      if (ids.length === 0) return
      try {
        const statuses = await getPresenceBatch(token, ids)
        const online = new Set(statuses.filter((item) => item.online).map((item) => item.userId))
        for (const friend of this.friends) {
          friend.online = friend.userId ? online.has(friend.userId) : false
        }
      } catch {
        /* 在线状态失败不影响通讯录 */
      }
    },

    async searchUsers(keyword: string): Promise<ContactEntry[]> {
      const token = useAppStore().accessToken
      const kw = keyword.trim()
      if (!token || !kw) {
        this.searchResults = []
        return []
      }
      this.checking = true
      try {
        const users = await userApi.searchUsers(token, kw, 20)
        this.searchResults = users.map((user) => ({
          ...profileToContact(user),
          group: '搜索结果',
          desc: user.signature || user.username
        }))
        return this.searchResults
      } finally {
        this.checking = false
      }
    },

    async sendFriendRequest(toUserId: string, message: string): Promise<void> {
      const token = useAppStore().accessToken
      if (!token) return
      await friendApi.sendFriendRequest(token, { toUserId, message })
      await this.load(true)
    },

    async acceptRequest(requestId: string): Promise<void> {
      const token = useAppStore().accessToken
      if (!token) return
      await friendApi.acceptFriendRequest(token, requestId)
      await this.load(true)
    },

    async rejectRequest(requestId: string): Promise<void> {
      const token = useAppStore().accessToken
      if (!token) return
      await friendApi.rejectFriendRequest(token, requestId)
      await this.load(true)
    },

    async removeFriend(friendId: string): Promise<void> {
      const token = useAppStore().accessToken
      if (!token) return
      await friendApi.deleteFriend(token, friendId)
      await this.load(true)
    },

    async createGroup(name: string, memberIds: string[]): Promise<string> {
      const token = useAppStore().accessToken
      if (!token) throw new Error('未登录')
      const group = await groupApi.createGroup(token, { name, memberIds })
      await this.load(true)
      return `group:${group.groupId}`
    }
  }
})
