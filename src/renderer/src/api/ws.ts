import { ApiError } from '@renderer/api/http'

/** WebSocket 帧：请求/应答与下行共用同一结构 */
export interface WsFrame<T = unknown> {
  id: string | null
  command: string
  code: number
  message: string
  data: T
  timestamp: number
}

export type WsHandler<T = unknown> = (data: T, frame: WsFrame<T>) => void
export type WsStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed'

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: ApiError) => void
  timer: number
}

function resolveWsUrl(token: string): string {
  const explicit = import.meta.env.VITE_WS_URL?.trim()
  const base = explicit
    ? explicit.replace(/\/$/, '')
    : (() => {
        const host = import.meta.env.VITE_WS_HOST?.trim() || '127.0.0.1'
        const port = import.meta.env.VITE_WS_PORT?.trim() || '1883'
        return `ws://${host}:${port}`
      })()
  return `${base}/ws?token=${encodeURIComponent(token)}`
}

let requestSequence = 0

class WsClient {
  private socket: WebSocket | null = null
  private token = ''
  private handlers = new Map<string, Set<WsHandler>>()
  private statusHandlers = new Set<(status: WsStatus) => void>()
  private pending = new Map<string, PendingRequest>()
  private heartbeatTimer: number | undefined
  private reconnectTimer: number | undefined
  private reconnectAttempts = 0
  private manualClose = false
  private currentStatus: WsStatus = 'idle'

  get status(): WsStatus {
    return this.currentStatus
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  connect(token: string): void {
    if (!token) return
    // 相同 token 且连接仍在建立/已连接时直接复用，避免重复建连
    if (
      this.socket &&
      this.token === token &&
      (this.currentStatus === 'connected' ||
        this.currentStatus === 'connecting' ||
        this.currentStatus === 'reconnecting')
    ) {
      return
    }
    this.token = token
    this.manualClose = false
    this.reconnectAttempts = 0
    this.clearReconnect()
    this.open()
  }

  disconnect(): void {
    this.manualClose = true
    this.stopHeartbeat()
    this.clearReconnect()
    this.rejectAll('连接已关闭')
    this.detachSocket('client logout')
    this.setStatus('closed')
  }

  on<T = unknown>(command: string, handler: WsHandler<T>): () => void {
    const set = this.handlers.get(command) ?? new Set<WsHandler>()
    set.add(handler as WsHandler)
    this.handlers.set(command, set)
    return () => {
      set.delete(handler as WsHandler)
      if (set.size === 0) this.handlers.delete(command)
    }
  }

  onStatus(handler: (status: WsStatus) => void): () => void {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }

  /** 发送请求并等待同 id 的应答；未连接时立即失败，由调用方降级到 HTTP */
  send<T = unknown>(command: string, data: unknown, timeout = 10000): Promise<T> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new ApiError(-3, 'WebSocket 未连接'))
    }
    const id = `c-${Date.now()}-${++requestSequence}`
    return new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id)
        reject(new ApiError(-4, 'WebSocket 请求超时'))
      }, timeout)
      this.pending.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer
      })
      try {
        this.socket?.send(JSON.stringify({ id, command, data }))
      } catch {
        window.clearTimeout(timer)
        this.pending.delete(id)
        reject(new ApiError(-3, 'WebSocket 发送失败'))
      }
    })
  }

  private open(): void {
    // 先摘掉旧连接的全部回调再关闭，避免旧连接的 onclose 把新连接状态改成重连
    this.clearReconnectTimer()
    this.detachSocket('reconnect')
    // 旧连接上的请求不会再有应答，立即失败让调用方降级到 HTTP
    this.rejectAll('WebSocket 连接已切换')
    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting')
    let socket: WebSocket
    try {
      socket = new WebSocket(resolveWsUrl(this.token))
    } catch {
      this.scheduleReconnect()
      return
    }
    this.socket = socket

    socket.onopen = () => {
      if (this.socket !== socket) return
      this.reconnectAttempts = 0
      this.clearReconnectTimer()
      this.setStatus('connected')
      this.startHeartbeat()
    }

    socket.onmessage = (event: MessageEvent<string>) => {
      if (this.socket !== socket) return
      let frame: WsFrame
      try {
        frame = JSON.parse(event.data) as WsFrame
      } catch {
        return
      }
      this.dispatch(frame)
    }

    socket.onclose = () => {
      if (this.socket !== socket) return
      this.socket = null
      this.stopHeartbeat()
      this.rejectAll('WebSocket 连接已断开')
      if (this.manualClose) {
        this.setStatus('closed')
        return
      }
      this.setStatus('reconnecting')
      this.scheduleReconnect()
    }

    socket.onerror = () => {
      // onclose 会紧接着触发，这里只保证状态可见
      if (this.socket === socket && this.currentStatus === 'connected') {
        this.setStatus('reconnecting')
      }
    }
  }

  /** 解绑并关闭当前 socket：回调会被移除，旧连接的关闭不会影响新连接 */
  private detachSocket(reason: string): void {
    const socket = this.socket
    this.socket = null
    if (!socket) return
    socket.onopen = null
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null
    try {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close(1000, reason)
      }
    } catch {
      /* 连接已经关闭时忽略 */
    }
  }

  private dispatch(frame: WsFrame): void {
    if (frame.id) {
      const pending = this.pending.get(frame.id)
      if (pending) {
        this.pending.delete(frame.id)
        window.clearTimeout(pending.timer)
        if (frame.code === 0) pending.resolve(frame.data)
        else pending.reject(new ApiError(frame.code, frame.message || 'WebSocket 请求失败'))
        return
      }
    }

    const set = this.handlers.get(frame.command)
    if (!set) return
    for (const handler of set) {
      try {
        handler(frame.data, frame)
      } catch (error) {
        console.error(`[ws] handler ${frame.command} failed`, error)
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatTimer = window.setInterval(() => {
      if (!this.isConnected()) return
      this.send('heartbeat.ping', {}, 8000).catch(() => undefined)
    }, 30000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
  }

  private scheduleReconnect(): void {
    if (this.manualClose || this.reconnectTimer || this.socket) return
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000)
    this.reconnectAttempts += 1
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined
      if (!this.manualClose) this.open()
    }, delay)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
  }

  private clearReconnect(): void {
    this.clearReconnectTimer()
    this.reconnectAttempts = 0
  }

  private rejectAll(message: string): void {
    for (const [id, pending] of this.pending) {
      window.clearTimeout(pending.timer)
      pending.reject(new ApiError(-3, message))
      this.pending.delete(id)
    }
  }

  private setStatus(status: WsStatus): void {
    if (this.currentStatus === status) return
    this.currentStatus = status
    for (const handler of this.statusHandlers) {
      try {
        handler(status)
      } catch {
        /* 状态监听失败不影响连接 */
      }
    }
  }
}

export const wsClient = new WsClient()
