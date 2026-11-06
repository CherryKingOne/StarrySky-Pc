import { defineStore } from 'pinia'

export type Theme = 'light' | 'dark'
export type LoginMode = 'qr' | 'password' | 'captcha' | 'register'

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

function readInitialAuth(): boolean {
  return readStored('starrysky-authenticated') === '1'
}

export const useAppStore = defineStore('app', {
  state: () => ({
    authenticated: readInitialAuth(),
    theme: readInitialTheme() as Theme,
    loginMode: 'qr' as LoginMode,
    qrScanned: false,
    locked: false,
    nickname: '林晓',
    accountId: 'linxiao',
    phone: '138****8888',
    avatarIndex: 1,
    language: '简体中文'
  }),
  actions: {
    login(): void {
      this.authenticated = true
      this.locked = false
      writeStored('starrysky-authenticated', '1')
    },
    logout(): void {
      this.authenticated = false
      this.locked = false
      removeStored('starrysky-authenticated')
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
    setLoginMode(mode: LoginMode): void {
      this.loginMode = mode
      this.qrScanned = false
    },
    setQrScanned(scanned: boolean): void {
      this.qrScanned = scanned
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
