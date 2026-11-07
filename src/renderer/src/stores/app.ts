import { defineStore } from 'pinia'
import type { AuthSession, AuthUser, TokenPair } from '@renderer/api/auth'
import { refreshSession } from '@renderer/api/auth'
import { exchangeAgentToken, type AgentItem } from '@renderer/api/agents'
import { setTokenRefresher } from '@renderer/api/http'

export type Theme = 'light' | 'dark'

const SESSION_KEY = 'starrysky-session'
const ACCOUNT_KEY = 'starrysky-account'
/** 旧版本演示登录标记，读取到会被清理 */
const LEGACY_AUTH_KEY = 'starrysky-authenticated'

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* 隐私模式下忽略持久化失败 */
  }
}

function removeStored(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* 隐私模式下忽略持久化失败 */
  }
}

function readInitialTheme(): Theme {
  return readStored('starrysky-theme') === 'dark' ? 'dark' : 'light'
}

function readSession(): AuthSession | null {
  const raw = readStored(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.accessToken || !parsed?.user) return null
    return parsed
  } catch {
    return null
  }
}

const initialSession = readSession()
if (!initialSession) removeStored(LEGACY_AUTH_KEY)

let refreshTask: Promise<string | null> | null = null

export const useAppStore = defineStore('app', {
  state: () => ({
    authenticated: Boolean(initialSession?.accessToken),
    /** 当前生效的令牌：用户身份为用户 Token，Agent 身份为 Agent Token */
    accessToken: initialSession?.accessToken ?? '',
    /** 用户 Token 始终保留，切回用户身份或管理 Agent 时使用 */
    userAccessToken: initialSession?.accessToken ?? '',
    /** Agent 视角的短期令牌（2 小时），仅 Agent 身份生效 */
    agentAccessToken: '',
    /** 当前正在使用的 Agent 身份；null 表示用户账号 */
    actingAgent: null as AgentItem | null,
    refreshToken: initialSession?.refreshToken ?? '',
    user: initialSession?.user ?? (null as AuthUser | null),
    theme: readInitialTheme() as Theme,
    locked: false,
    nickname: initialSession?.user?.nickname || '未登录',
    accountId: initialSession?.user?.username || '',
    /** 登录账号（手机号或邮箱），用于设置页展示 */
    phone: readStored(ACCOUNT_KEY) ?? '',
    avatarIndex: 1,
    language: '简体中文'
  }),
  actions: {
    /** 登录 / 注册成功后写入会话并持久化 */
    applySession(session: AuthSession, identifier?: string): void {
      this.accessToken = session.accessToken
      this.userAccessToken = session.accessToken
      this.agentAccessToken = ''
      this.actingAgent = null
      this.refreshToken = session.refreshToken
      this.user = session.user
      this.authenticated = true
      this.locked = false
      this.nickname = session.user.nickname || session.user.username
      this.accountId = session.user.username
      if (identifier) {
        this.phone = identifier
        writeStored(ACCOUNT_KEY, identifier)
      }
      writeStored(SESSION_KEY, JSON.stringify(session))
      removeStored(LEGACY_AUTH_KEY)
    },
    /** 刷新令牌后只替换 token 字段，并持久化 */
    applyTokens(tokens: TokenPair): void {
      this.userAccessToken = tokens.accessToken
      this.refreshToken = tokens.refreshToken
      this.authenticated = true
      // Agent 身份下继续使用 Agent Token，避免把视角切回用户
      if (!this.actingAgent) this.accessToken = tokens.accessToken
      const session: AuthSession = {
        ...tokens,
        user: this.user as AuthUser
      }
      if (this.user) writeStored(SESSION_KEY, JSON.stringify(session))
    },

    /** 资料更新后同步昵称并持久化 */
    updateUser(user: AuthUser): void {
      this.user = user
      this.nickname = user.nickname || user.username
      this.accountId = user.username
      writeStored(
        SESSION_KEY,
        JSON.stringify({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken,
          tokenType: 'Bearer',
          expiresIn: 7200,
          user
        })
      )
    },

    async refreshAccessToken(): Promise<string | null> {
      if (refreshTask) return refreshTask
      if (!this.refreshToken) return null
      refreshTask = refreshSession(this.refreshToken)
        .then(async (tokens) => {
          this.applyTokens(tokens)
          if (!this.actingAgent) return tokens.accessToken

          // Agent 身份：用户 Token 续期后重新换取 Agent Token
          try {
            const agentToken = await exchangeAgentToken(
              tokens.accessToken,
              this.actingAgent.agentId
            )
            this.agentAccessToken = agentToken.accessToken
            this.accessToken = agentToken.accessToken
            return agentToken.accessToken
          } catch {
            this.endAgentSession()
            return tokens.accessToken
          }
        })
        .catch(() => null)
        .finally(() => {
          refreshTask = null
        })
      return refreshTask
    },

    /** 切换到某个 Agent 视角；token 为空时降级为本地演示身份 */
    beginAgentSession(agent: AgentItem, token = ''): void {
      if (!this.actingAgent) this.userAccessToken = this.accessToken
      this.actingAgent = agent
      this.agentAccessToken = token
      if (token) this.accessToken = token
    },

    /** 切回用户账号，丢弃 Agent Token */
    endAgentSession(): void {
      if (this.actingAgent && this.userAccessToken) this.accessToken = this.userAccessToken
      this.actingAgent = null
      this.agentAccessToken = ''
    },

    logout(): void {
      refreshTask = null
      setTokenRefresher(null)
      this.authenticated = false
      this.accessToken = ''
      this.userAccessToken = ''
      this.agentAccessToken = ''
      this.actingAgent = null
      this.refreshToken = ''
      this.user = null
      this.locked = false
      this.nickname = '未登录'
      this.accountId = ''
      this.phone = ''
      removeStored(SESSION_KEY)
      removeStored(ACCOUNT_KEY)
      removeStored(LEGACY_AUTH_KEY)
    },
    lock(): void {
      if (!this.authenticated) return
      this.locked = true
    },
    unlock(password: string): boolean {
      if (!password.trim()) return false
      this.locked = false
      return true
    },
    toggleTheme(): void {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      writeStored('starrysky-theme', this.theme)
    },
    setAvatar(index: number): void {
      this.avatarIndex = index
    },
    setLanguage(language: string): void {
      this.language = language
    }
  }
})
