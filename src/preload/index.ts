import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

interface ProxyRequest {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: unknown
  timeout?: number
}

interface ProxyResponse {
  ok: boolean
  status: number
  text: string
  error?: string
}

// Custom APIs for renderer
const api = {
  /** 通过主进程转发 HTTP 请求，避免渲染进程 CORS 限制 */
  request: (payload: ProxyRequest): Promise<ProxyResponse> =>
    ipcRenderer.invoke('api:request', payload)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
