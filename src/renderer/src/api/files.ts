import { API_BASE_URL, ApiError, apiRequest } from '@renderer/api/http'
import type { FileInfo } from '@renderer/api/contracts'

/**
 * 上传文件：Electron 下走主进程 multipart 代理，浏览器预览环境直接 fetch FormData。
 * fileType: 1=图片 2=语音 3=视频 4=普通文件（与后端约定一致）。
 */
export async function uploadFile(token: string, file: File, fileType?: number): Promise<FileInfo> {
  const url = `${API_BASE_URL}/files`
  const fields: Record<string, string> = {}
  if (fileType !== undefined) fields.fileType = String(fileType)
  const bridge = typeof window !== 'undefined' ? window.api : undefined

  let result: { ok: boolean; status: number; text: string; error?: string }

  if (bridge?.upload) {
    result = await bridge.upload({
      url,
      token,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      data: await file.arrayBuffer(),
      fields,
      timeout: 60000
    })
  } else {
    const form = new FormData()
    for (const [key, value] of Object.entries(fields)) form.append(key, value)
    form.append('file', file)
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    })
    result = { ok: response.ok, status: response.status, text: await response.text() }
  }

  if (result.status === 0) {
    throw new ApiError(-2, `文件上传失败：${result.error ?? '无法连接后端服务'}`)
  }
  let envelope: { code: number; message: string; data: FileInfo } | null
  try {
    envelope = result.text ? JSON.parse(result.text) : null
  } catch {
    envelope = null
  }
  if (!envelope) throw new ApiError(10500, `文件上传返回异常（HTTP ${result.status}）`)
  if (envelope.code !== 0) throw new ApiError(envelope.code, envelope.message || '上传失败')
  return envelope.data
}

export function getFileInfo(token: string, fileId: string): Promise<FileInfo> {
  return apiRequest<FileInfo>(`/files/${encodeURIComponent(fileId)}`, { token })
}

export function fileContentUrl(fileId: string): string {
  return `${API_BASE_URL}/files/${encodeURIComponent(fileId)}/content`
}
