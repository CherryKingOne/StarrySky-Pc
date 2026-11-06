import { ElectronAPI } from '@electron-toolkit/preload'

export interface ApiProxyRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
}

export interface ApiProxyResponse {
  ok: boolean
  status: number
  text: string
  error?: string
}

export interface ApiBridge {
  request: (payload: ApiProxyRequest) => Promise<ApiProxyResponse>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ApiBridge
  }
}
