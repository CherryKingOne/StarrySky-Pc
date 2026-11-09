/** 健康检查接口；路径在后端根路径下，不带 /api/v1 */
import { apiOriginRequest } from '@renderer/api/http'

export type HealthState = 'UP' | 'DOWN'

export interface WebSocketHealth {
  /** 运行中为 UP，未启用或未启动为 DISABLED */
  status: 'UP' | 'DISABLED'
  connections: number
  onlineUsers: number
}

export interface HealthComponents {
  database: string
  redis: string
  messageStore: string
  websocket: WebSocketHealth
}

export interface HealthStatus {
  /** 数据库、Redis 与消息存储均正常时为 UP */
  status: HealthState
  components: HealthComponents
  timestamp: number
}

export interface LivenessStatus {
  status: 'UP'
  timestamp: number
}

/** 完整健康检查：会访问数据库和 Redis，不要用高频探针 */
export function getHealth(): Promise<HealthStatus> {
  return apiOriginRequest<HealthStatus>('/health')
}

/** 存活检查：不访问外部依赖 */
export function getLiveness(): Promise<LivenessStatus> {
  return apiOriginRequest<LivenessStatus>('/health/live')
}

/** 就绪检查：包含数据库、Redis 与 WebSocket 状态 */
export function getReadiness(): Promise<HealthStatus> {
  return apiOriginRequest<HealthStatus>('/health/ready')
}
