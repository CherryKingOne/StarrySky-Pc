import { apiRequest } from '@renderer/api/http'
import { buildQuery } from '@renderer/api/query'
import type { BotCredential, BotEventConfig, BotItem, BotSummary } from '@renderer/api/contracts'

const botPath = (botId: string): string => `/bots/${encodeURIComponent(botId)}`

/** 机器人目录：普通用户发现机器人，单次最多 20 条；创建/删除只能在开发者后台 */
export function listBotDirectory(token: string, keyword?: string): Promise<BotSummary[]> {
  return apiRequest<BotSummary[]>(`/bots/directory${buildQuery({ keyword })}`, { token })
}

/** 当前账号在开发者后台拥有的机器人 */
export function listMyBots(token: string): Promise<BotItem[]> {
  return apiRequest<BotItem[]>('/bots', { token })
}

export function getBot(token: string, botId: string): Promise<BotItem> {
  return apiRequest<BotItem>(botPath(botId), { token })
}

export function getBotCredentials(token: string, botId: string): Promise<BotCredential> {
  return apiRequest<BotCredential>(`${botPath(botId)}/credentials`, { token })
}

export function getBotEventConfig(token: string, botId: string): Promise<BotEventConfig> {
  return apiRequest<BotEventConfig>(`${botPath(botId)}/event-config`, { token })
}
