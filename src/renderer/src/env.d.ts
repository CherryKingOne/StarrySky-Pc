/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端 HTTP 主机 */
  readonly VITE_API_HOST?: string
  /** 后端 HTTP 端口 */
  readonly VITE_API_PORT?: string
  /** 完整 API Base URL，配置后优先于 HOST/PORT */
  readonly VITE_API_BASE_URL?: string
  /** WebSocket 主机（预留） */
  readonly VITE_WS_HOST?: string
  /** WebSocket 端口（预留） */
  readonly VITE_WS_PORT?: string
  /** 请求超时毫秒数 */
  readonly VITE_API_TIMEOUT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
