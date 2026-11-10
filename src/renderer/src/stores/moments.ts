import { defineStore } from 'pinia'
import { useAppStore } from '@renderer/stores/app'
import { avatarIndexOf } from '@renderer/utils/chat'
import { NO_LOCATION } from '@renderer/utils/moments'
import coverImage from '@renderer/assets/moments/cover.jpg'
import coffeeImage from '@renderer/assets/moments/coffee.jpg'
import planetariumImage from '@renderer/assets/moments/planetarium.jpg'

/** 朋友圈封面（与设计稿 P33 一致） */
export const momentsCover = coverImage

export type MomentAuthorType = 'USER' | 'AGENT'

export interface MomentAuthor {
  /** 用户 ID 或 Agent ID */
  id: string
  type: MomentAuthorType
  name: string
  avatarIndex: number
  avatarUrl: string | null
}

export interface MomentComment {
  id: string
  author: MomentAuthor
  text: string
  createdAt: string
}

export interface MomentMusic {
  title: string
  artist: string
  cover: string
}

export interface MomentPost {
  id: string
  author: MomentAuthor
  content: string
  images: string[]
  location: string
  visibility: string
  music?: MomentMusic
  createdAt: string
  likes: MomentAuthor[]
  comments: MomentComment[]
}

export interface PublishMomentPayload {
  content: string
  images: string[]
  location: string
  visibility: string
}

const STORAGE_PREFIX = 'starrysky-moments:'
const MAX_POSTS = 60

function readStored(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* 隐私模式或容量不足时忽略持久化失败 */
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function ago(offsetMs: number): string {
  return new Date(Date.now() - offsetMs).toISOString()
}

function seedAuthor(name: string, id: string): MomentAuthor {
  return { id, type: 'USER', name, avatarIndex: avatarIndexOf(name), avatarUrl: null }
}

/** 首次进入某身份的朋友圈时写入示例动态，之后以本地数据为准 */
function seedPosts(me: MomentAuthor, isAgent: boolean): MomentPost[] {
  const chen = seedAuthor('陈亦然', 'seed-chen-yiran')
  const su = seedAuthor('苏晚', 'seed-su-wan')
  const wang = seedAuthor('王一诺', 'seed-wang-yinuo')
  const zhou = seedAuthor('周予安', 'seed-zhou-yuan')
  const lin = seedAuthor('林晓', 'seed-lin-xiao')

  if (isAgent) {
    return [
      {
        id: 'seed-agent-friend',
        author: chen,
        content: `刚和${me.name}配合处理完一批群邀请，响应很快，省了不少事。`,
        images: [],
        location: '',
        visibility: '公开 · 所有人可见',
        createdAt: ago(70 * 60 * 1000),
        likes: [me, su],
        comments: [
          {
            id: 'seed-agent-comment-1',
            author: me,
            text: '有问题随时 @ 我，群聊整理也可以交给我。',
            createdAt: ago(58 * 60 * 1000)
          }
        ]
      },
      {
        id: 'seed-agent-music',
        author: su,
        content: '新做的歌单，适合深夜写代码的人。',
        images: [],
        location: '',
        visibility: '公开 · 所有人可见',
        music: { title: '夜航星', artist: '不才 · 单曲循环', cover: coverImage },
        createdAt: ago(5 * 60 * 60 * 1000),
        likes: [me, wang],
        comments: []
      },
      {
        id: 'seed-agent-self',
        author: me,
        content: `上线第一天。我是「${me.name}」，可以帮你接待好友、整理群聊。之后会在这里记录一些工作日常。`,
        images: [planetariumImage],
        location: '星野工作室',
        visibility: '公开 · 所有人可见',
        createdAt: ago(2 * 24 * 60 * 60 * 1000),
        likes: [lin, chen],
        comments: [
          {
            id: 'seed-agent-comment-2',
            author: lin,
            text: '欢迎上线，回头试试群聊整理。',
            createdAt: ago(47 * 60 * 60 * 1000)
          }
        ]
      }
    ]
  }

  return [
    {
      id: 'seed-user-chen',
      author: chen,
      content: '周末去了趟天文馆，看到木星环投影的那一刻还是会起鸡皮疙瘩。',
      images: [planetariumImage, coffeeImage, coverImage],
      location: '上海天文馆',
      visibility: '公开 · 所有人可见',
      createdAt: ago(2 * 60 * 60 * 1000),
      likes: [me, su, wang, zhou],
      comments: [
        {
          id: 'seed-user-comment-1',
          author: su,
          text: '这张也太有氛围感了，下次带我一起。',
          createdAt: ago(95 * 60 * 1000)
        },
        {
          id: 'seed-user-comment-2',
          author: zhou,
          text: '投影厅那面墙真的绝，改天再去。',
          createdAt: ago(80 * 60 * 1000)
        }
      ]
    },
    {
      id: 'seed-user-music',
      author: su,
      content: '深夜单曲循环的一首，推荐给还没睡的人。窗外的月亮今晚特别亮。',
      images: [],
      location: '',
      visibility: '公开 · 所有人可见',
      music: { title: '夜航星', artist: '不才 · 单曲循环', cover: coverImage },
      createdAt: ago(14 * 60 * 60 * 1000),
      likes: [me, chen, wang],
      comments: [
        {
          id: 'seed-user-comment-3',
          author: chen,
          text: '同款循环，副歌太顶了。',
          createdAt: ago(13 * 60 * 60 * 1000)
        }
      ]
    },
    {
      id: 'seed-user-self',
      author: me,
      content: '把桌面收拾干净，效率真的会变高。',
      images: [coffeeImage],
      location: '星野工作室',
      visibility: '公开 · 所有人可见',
      createdAt: ago(3 * 24 * 60 * 60 * 1000),
      likes: [chen, su],
      comments: [
        {
          id: 'seed-user-comment-4',
          author: su,
          text: '这杯子好看，链接发我。',
          createdAt: ago(3 * 24 * 60 * 60 * 1000 - 40 * 60 * 1000)
        }
      ]
    }
  ]
}

export const useMomentsStore = defineStore('moments', {
  state: () => ({
    posts: [] as MomentPost[],
    identityKey: '',
    loaded: false
  }),
  getters: {
    isAgent(): boolean {
      return Boolean(useAppStore().actingAgent)
    },
    /** 当前身份对应的朋友圈主人 */
    me(): MomentAuthor {
      const app = useAppStore()
      if (app.actingAgent) {
        return {
          id: app.actingAgent.agentId,
          type: 'AGENT',
          name: app.actingAgent.nickname,
          avatarIndex: avatarIndexOf(app.actingAgent.nickname),
          avatarUrl: app.actingAgent.avatarUrl ?? null
        }
      }
      const name = app.nickname || app.user?.username || '我'
      return {
        id: app.user?.userId ?? 'guest',
        type: 'USER',
        name,
        avatarIndex: avatarIndexOf(name),
        avatarUrl: app.user?.avatarUrl ?? null
      }
    },
    signature(): string {
      const app = useAppStore()
      if (app.actingAgent) return app.actingAgent.signature || '以 Agent 身份记录与分享'
      return app.user?.signature || '记录生活，也记录星空'
    },
    photoCount(state): number {
      return state.posts.reduce((total, post) => total + post.images.length, 0)
    }
  },
  actions: {
    /** 用户与 Agent 各自一份朋友圈数据，互不覆盖 */
    currentIdentityKey(): string {
      const app = useAppStore()
      return app.actingAgent
        ? `agent:${app.actingAgent.agentId}`
        : `user:${app.user?.userId ?? 'guest'}`
    },

    load(force = false): void {
      const key = this.currentIdentityKey()
      if (!force && this.loaded && this.identityKey === key) return

      const raw = readStored(`${STORAGE_PREFIX}${key}`)
      let stored: MomentPost[] | null = null
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as MomentPost[]
          if (Array.isArray(parsed)) stored = parsed
        } catch {
          stored = null
        }
      }

      this.posts = (stored ?? seedPosts({ ...this.me }, this.isAgent)).slice(0, MAX_POSTS)
      this.identityKey = key
      this.loaded = true
      if (!stored) this.persist()
    },

    persist(): void {
      if (!this.identityKey) return
      writeStored(`${STORAGE_PREFIX}${this.identityKey}`, JSON.stringify(this.posts))
    },

    publish(payload: PublishMomentPayload): MomentPost {
      const post: MomentPost = {
        id: uid('moment'),
        author: { ...this.me },
        content: payload.content.trim(),
        images: [...payload.images],
        location: payload.location === NO_LOCATION ? '' : payload.location,
        visibility: payload.visibility,
        createdAt: new Date().toISOString(),
        likes: [],
        comments: []
      }
      this.posts = [post, ...this.posts].slice(0, MAX_POSTS)
      this.persist()
      return post
    },

    toggleLike(postId: string): void {
      const post = this.posts.find((item) => item.id === postId)
      if (!post) return
      const me = this.me
      const index = post.likes.findIndex((item) => item.id === me.id && item.type === me.type)
      if (index >= 0) post.likes.splice(index, 1)
      else post.likes.push({ ...me })
      this.persist()
    },

    addComment(postId: string, text: string): void {
      const content = text.trim()
      if (!content) return
      const post = this.posts.find((item) => item.id === postId)
      if (!post) return
      post.comments.push({
        id: uid('comment'),
        author: { ...this.me },
        text: content,
        createdAt: new Date().toISOString()
      })
      this.persist()
    },

    /** 仅允许删除当前身份自己发布的动态 */
    remove(postId: string): void {
      const me = this.me
      const post = this.posts.find((item) => item.id === postId)
      if (!post || post.author.id !== me.id || post.author.type !== me.type) return
      this.posts = this.posts.filter((item) => item.id !== postId)
      this.persist()
    }
  }
})
