import { defineStore } from 'pinia'
import type { AuthSession, AuthUser, TokenPair } from '@renderer/api/auth'
import { refreshSession } from '@renderer/api/auth'
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
    accessToken: initialSession?.accessToken ?? '',
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
      this.accessToken = tokens.accessToken
      this.refreshToken = tokens.refreshToken
      this.authenticated = true
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
        .then((tokens) => {
          this.applyTokens(tokens)
          return tokens.accessToken
        })
        .catch(() => null)
        .finally(() => {
          refreshTask = null
        })
      return refreshTask
    },

    logout(): void {
      refreshTask = null
      setTokenRefresher(null)
      this.authenticated = false
      this.accessToken = ''
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
