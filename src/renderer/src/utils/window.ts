/**
 * 登录窗口（卡片窗口）相关工具。
 * 主进程通过 `?loginWindow=1` 标记登录小窗，渲染进程据此切换为“卡片模式”。
 */

export type WindowAction = 'auth:login' | 'auth:logout' | 'window:minimize' | 'window:close'

export function isLoginWindow(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('loginWindow') === '1'
}

/** 当前渲染窗口是否是独立会话窗口 */
export function isPopoutWindow(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hash.startsWith('#/popout/')
}

/** 当前渲染窗口是否是 Agent 独立主窗口 */
export function isAgentWindow(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get('agentWindow') === '1'
}

/** Agent 主窗口 URL 上携带的 Agent ID */
export function agentWindowId(): string {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('agentId') ?? ''
}

/** 打开独立会话窗口；Agent 窗口下会携带 agentId，保证子窗口沿用同一身份 */
export function openPopoutWindow(conversationId: string, agentId = ''): void {
  if (!conversationId) return
  if (hasElectron()) {
    window.electron.ipcRenderer.send('window:open-popout', { conversationId, agentId })
    return
  }
  const base = window.location.href.split('#')[0]
  const query = agentId ? `?agentWindow=1&agentId=${encodeURIComponent(agentId)}` : ''
  window.open(
    `${base}${query}#/popout/${conversationId}`,
    '_blank',
    'width=460,height=700,menubar=no,toolbar=no'
  )
}

/**
 * 以某个 Agent 身份打开一个与用户主窗口一致的独立主窗口；
 * 已打开过则由主进程聚焦，不会重复创建。
 */
export function openAgentWindow(agentId: string): void {
  if (!agentId) return
  if (hasElectron()) {
    window.electron.ipcRenderer.send('window:open-agent', agentId)
    return
  }
  const base = window.location.href.split('#')[0]
  window.open(
    `${base}?agentWindow=1&agentId=${encodeURIComponent(agentId)}#/chats`,
    '_blank',
    'width=1280,height=800,menubar=no,toolbar=no'
  )
}

/** 聚焦用户主窗口（不存在时由主进程重建） */
export function focusMainWindow(): void {
  if (!hasElectron()) return
  window.electron.ipcRenderer.send('window:focus-main')
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
