import { defineStore } from 'pinia'

type Theme = 'light' | 'dark'

function readInitialTheme(): Theme {
  try {
    return localStorage.getItem('starrysky-theme') === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function readInitialAuth(): boolean {
  try {
    return localStorage.getItem('starrysky-authenticated') === '1'
  } catch {
    return false
  }
}

export const useAppStore = defineStore('app', {
  state: () => ({
    authenticated: readInitialAuth(),
    theme: readInitialTheme() as Theme,
    loginMode: 'qr' as 'qr' | 'password' | 'captcha' | 'register',
    qrScanned: false
  }),
  actions: {
    login(): void {
      this.authenticated = true
      try {
        localStorage.setItem('starrysky-authenticated', '1')
      } catch {
        /* 隐私模式下忽略持久化失败 */
      }
    },
    logout(): void {
      this.authenticated = false
      try {
        localStorage.removeItem('starrysky-authenticated')
      } catch {
        /* 隐私模式下忽略持久化失败 */
      }
    },
    setLoginMode(mode: 'qr' | 'password' | 'captcha' | 'register'): void {
      this.loginMode = mode
      this.qrScanned = false
    },
    setQrScanned(scanned: boolean): void {
      this.qrScanned = scanned
    },
    toggleTheme(): void {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
      try {
        localStorage.setItem('starrysky-theme', this.theme)
      } catch {
        /* 隐私模式下忽略持久化失败 */
      }
    }
  }
})
