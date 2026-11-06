/** 后端 HTTP 客户端：统一 Base URL、超时、业务错误码处理 */

export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
  timestamp: number
}

const DEFAULT_TIMEOUT = 15000

function resolveBaseUrl(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  const host = import.meta.env.VITE_API_HOST?.trim() || '127.0.0.1'
  const port = import.meta.env.VITE_API_PORT?.trim() || '38678'
  return `http://${host}:${port}/api/v1`
}

export const API_BASE_URL = resolveBaseUrl()

/** 后端根地址（不带 /api/v1），用于拼接文件内容等绝对 URL */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '')

const TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT ?? DEFAULT_TIMEOUT) || DEFAULT_TIMEOUT

/** 与 docs/api/error-codes.md 对齐的默认文案 */
const ERROR_MESSAGES: Record<number, string> = {
  0: 'success',
  10000: '请求参数错误',
  10100: '未登录或登录已过期',
  10101: '无权访问',
  10102: '资源不存在',
  10500: '系统内部错误',
  20001: '账号或密码错误',
  20002: '用户名已存在',
  20003: '访问令牌已过期',
  20004: '访问令牌无效',
  20005: '账号已被禁用',
  20006: '刷新令牌无效或已过期',
  20007: '登录失败次数过多，请稍后再试',
  20008: '手机号已注册',
  20009: '邮箱已注册',
  20010: '验证码错误或已过期',
  20011: '两次输入的密码不一致',
  20012: '验证码发送过于频繁，请稍后再试',
  20013: '验证码错误次数过多，请重新获取',
  30001: '用户不存在'
}

export class ApiError extends Error {
  readonly code: number

  constructor(code: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  token?: string
  timeout?: number
}

type TokenRefresher = () => Promise<string | null>

let tokenRefresher: TokenRefresher | null = null

/** 由 app store 注册；401 时尝试刷新一次并重放请求 */
export function setTokenRefresher(refresher: TokenRefresher | null): void {
  tokenRefresher = refresher
}

interface ProxyResponse {
  ok: boolean
  status: number
  text: string
  error?: string
}

/**
 * Electron 下通过主进程转发 HTTP 请求，避免渲染进程的 CORS 限制；
 * 浏览器预览环境（无 preload）自动回退到 fetch。
 */
async function sendHttp(
  url: string,
  payload: {
    method: string
    headers: Record<string, string>
    body?: unknown
    timeout: number
  }
): Promise<ProxyResponse> {
  const bridge = typeof window !== 'undefined' ? window.api : undefined
  if (bridge?.request) {
    return bridge.request({
      url,
      method: payload.method,
      headers: payload.headers,
      body: payload.body,
      timeout: payload.timeout
    })
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), payload.timeout)
  try {
    const response = await fetch(url, {
      method: payload.method,
      headers: payload.headers,
      body: payload.body === undefined ? undefined : JSON.stringify(payload.body),
      signal: controller.signal
    })
    return { ok: response.ok, status: response.status, text: await response.text() }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      text: '',
      error: error instanceof Error ? error.message : String(error)
    }
  } finally {
    window.clearTimeout(timer)
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (options.token) headers.Authorization = `Bearer ${options.token}`

  const result = await sendHttp(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body,
    timeout: options.timeout ?? TIMEOUT
  })

  if (result.status === 0) {
    throw new ApiError(
      -2,
      `无法连接后端服务（${API_BASE_URL}），请检查 .env 中的 IP / 端口以及后端是否启动`
    )
  }

  let envelope: ApiEnvelope<T> | null
  try {
    envelope = result.text ? (JSON.parse(result.text) as ApiEnvelope<T>) : null
  } catch {
    envelope = null
  }

  if (result.status === 401) {
    if (tokenRefresher && options.token) {
      const nextToken = await tokenRefresher()
      if (nextToken) {
        return apiRequest<T>(path, { ...options, token: nextToken })
      }
    }
    const code = envelope?.code ?? 10100
    throw new ApiError(code, envelope?.message || ERROR_MESSAGES[10100])
  }

  if (!envelope) {
    throw new ApiError(10500, `服务端返回异常（HTTP ${result.status}）`)
  }

  if (envelope.code !== 0) {
    throw new ApiError(
      envelope.code,
      envelope.message || ERROR_MESSAGES[envelope.code] || '请求失败'
    )
  }

  return envelope.data
}
