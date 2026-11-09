import { apiRequest } from '@renderer/api/http'
import { buildQuery } from '@renderer/api/query'
import type {
  BotAccessMode,
  BotCredential,
  BotEventConfig,
  BotEventMode,
  BotEventType,
  BotItem,
  BotSummary,
  CreatedBot
} from '@renderer/api/contracts'

const botPath = (botId: string): string => `/bots/${encodeURIComponent(botId)}`

export interface CreateBotPayload {
  nickname: string
  avatarUrl?: string | null
  description: string
}

export type UpdateBotPayload = Partial<CreateBotPayload>

export interface UpdateBotEventConfigPayload {
  accessMode: BotAccessMode
  /** accessMode=WEBHOOK 时必填且必须是 https 绝对地址 */
  callbackUrl?: string | null
  eventMode: BotEventMode
  /** eventMode=PARTIAL 时至少包含一个事件类型 */
  eventTypes?: BotEventType[]
}

/** 机器人目录：普通用户发现机器人，单次最多 20 条；创建/删除只能在开发者后台 */
export function listBotDirectory(token: string, keyword?: string): Promise<BotSummary[]> {
  return apiRequest<BotSummary[]>(`/bots/directory${buildQuery({ keyword })}`, { token })
}

/** 当前账号在开发者后台拥有的机器人 */
export function listMyBots(token: string): Promise<BotItem[]> {
  return apiRequest<BotItem[]>('/bots', { token })
}

/** 创建机器人；响应中的 appSecret 只返回一次 */
export function createBot(token: string, payload: CreateBotPayload): Promise<CreatedBot> {
  return apiRequest<CreatedBot>('/bots', { method: 'POST', token, body: payload })
}

export function getBot(token: string, botId: string): Promise<BotItem> {
  return apiRequest<BotItem>(botPath(botId), { token })
}

export function updateBot(
  token: string,
  botId: string,
  payload: UpdateBotPayload
): Promise<BotItem> {
  return apiRequest<BotItem>(botPath(botId), { method: 'PUT', token, body: payload })
}

export function deleteBot(token: string, botId: string): Promise<null> {
  return apiRequest<null>(botPath(botId), { method: 'DELETE', token })
}

export function getBotCredentials(token: string, botId: string): Promise<BotCredential> {
  return apiRequest<BotCredential>(`${botPath(botId)}/credentials`, { token })
}

/** 重置 AppSecret：旧密钥与旧机器人 Token 立即失效 */
export function resetBotCredentials(token: string, botId: string): Promise<BotCredential> {
  return apiRequest<BotCredential>(`${botPath(botId)}/credentials/reset`, {
    method: 'POST',
    token
  })
}

export function getBotEventConfig(token: string, botId: string): Promise<BotEventConfig> {
  return apiRequest<BotEventConfig>(`${botPath(botId)}/event-config`, { token })
}

export function updateBotEventConfig(
  token: string,
  botId: string,
  payload: UpdateBotEventConfigPayload
): Promise<BotEventConfig> {
  return apiRequest<BotEventConfig>(`${botPath(botId)}/event-config`, {
    method: 'PUT',
    token,
    body: payload
  })
}
