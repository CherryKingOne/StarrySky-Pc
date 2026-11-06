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
    if (this.socket && this.token === token && this.currentStatus === 'connected') return
    this.token = token
    this.manualClose = false
    this.open()
  }

  disconnect(): void {
    this.manualClose = true
    this.stopHeartbeat()
    this.clearReconnect()
    this.rejectAll('连接已关闭')
    this.socket?.close(1000, 'client logout')
    this.socket = null
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
    this.socket?.close(1000, 'reconnect')
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
      this.reconnectAttempts = 0
      this.setStatus('connected')
      this.startHeartbeat()
    }

    socket.onmessage = (event: MessageEvent<string>) => {
      let frame: WsFrame
      try {
        frame = JSON.parse(event.data) as WsFrame
      } catch {
        return
      }
      this.dispatch(frame)
    }

    socket.onclose = () => {
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
      if (this.currentStatus === 'connected') this.setStatus('reconnecting')
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
    if (this.manualClose || this.reconnectTimer) return
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000)
    this.reconnectAttempts += 1
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined
      if (!this.manualClose) this.open()
    }, delay)
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
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
