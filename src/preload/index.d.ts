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

export interface ApiUploadRequest {
  url: string
  token?: string
  fileName?: string
  contentType?: string
  data: ArrayBuffer
  fields?: Record<string, string>
  timeout?: number
}

export interface ApiBridge {
  request: (payload: ApiProxyRequest) => Promise<ApiProxyResponse>
  upload: (payload: ApiUploadRequest) => Promise<ApiProxyResponse>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: ApiBridge
  }
}
