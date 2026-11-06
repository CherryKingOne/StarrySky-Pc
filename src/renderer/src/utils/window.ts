/**
 * 登录窗口（卡片窗口）相关工具。
 * 主进程通过 `?loginWindow=1` 标记登录小窗，渲染进程据此切换为“卡片模式”。
 */

export type WindowAction = 'auth:login' | 'auth:logout' | 'window:minimize' | 'window:close'

export function isLoginWindow(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('loginWindow') === '1'
}

/** 主进程会在登录小窗 URL 上带 platform 参数，用于渲染 macOS / Windows 各自的窗口控件 */
export function isMacPlatform(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('platform') === 'darwin'
}

export function hasElectron(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(window.electron?.ipcRenderer)
}

export function sendWindowAction(action: WindowAction): void {
  if (!hasElectron()) return
  window.electron.ipcRenderer.send(action)
}
