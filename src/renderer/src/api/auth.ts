import { apiRequest } from '@renderer/api/http'

export type AuthChannel = 'phone' | 'email'
export type CodeScene = 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD'

export interface AuthUser {
  userId: string
  username: string
  nickname: string
  avatarUrl: string | null
  gender: number
  signature: string | null
  createdAt: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  tokenType: string
  expiresIn: number
}

export interface AuthSession extends TokenPair {
  user: AuthUser
}

/** 新版接口只要求 deviceType，不再传 deviceId */
function devicePayload(): { deviceType: 'PC' } {
  return { deviceType: 'PC' }
}

/** 用户名 + 密码登录（兼容旧接口；手机/邮箱注册的账号 username 为 u{userId}，一般不用） */
export function loginWithUsername(payload: {
  username: string
  password: string
}): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: { ...payload, ...devicePayload() }
  })
}

/** 用户名 + 密码注册（兼容旧接口） */
export function registerWithUsername(payload: {
  username: string
  password: string
  nickname?: string
}): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/register', {
    method: 'POST',
    body: { ...payload, ...devicePayload() }
  })
}

/** 手机号 + 密码 或 手机号 + 验证码，二选一 */
export function loginWithPhone(payload: {
  phone: string
  password?: string
  code?: string
}): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/login/phone', {
    method: 'POST',
    body: { ...payload, ...devicePayload() }
  })
}

/** 邮箱 + 密码 或 邮箱 + 验证码，二选一 */
export function loginWithEmail(payload: {
  email: string
  password?: string
  code?: string
}): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/login/email', {
    method: 'POST',
    body: { ...payload, ...devicePayload() }
  })
}

export function registerWithPhone(payload: {
  nickname: string
  phone: string
  password: string
  confirmPassword: string
  code: string
}): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/register/phone', {
    method: 'POST',
    body: { ...payload, ...devicePayload() }
  })
}

export function registerWithEmail(payload: {
  nickname: string
  email: string
  password: string
  confirmPassword: string
  code: string
}): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/register/email', {
    method: 'POST',
    body: { ...payload, ...devicePayload() }
  })
}

export function sendSmsCode(phone: string, scene: CodeScene): Promise<null> {
  return apiRequest<null>('/auth/code/sms', {
    method: 'POST',
    body: { phone, scene }
  })
}

export function sendEmailCode(email: string, scene: CodeScene): Promise<null> {
  return apiRequest<null>('/auth/code/email', {
    method: 'POST',
    body: { email, scene }
  })
}

export function resetPasswordWithPhone(payload: {
  phone: string
  code: string
  newPassword: string
  confirmPassword: string
}): Promise<null> {
  return apiRequest<null>('/auth/password/reset/phone', {
    method: 'POST',
    body: payload
  })
}

export function resetPasswordWithEmail(payload: {
  email: string
  code: string
  newPassword: string
  confirmPassword: string
}): Promise<null> {
  return apiRequest<null>('/auth/password/reset/email', {
    method: 'POST',
    body: payload
  })
}

/** 用 refreshToken 换新令牌；轮换机制下旧 refreshToken 会立即失效 */
export function refreshSession(refreshToken: string): Promise<TokenPair> {
  return apiRequest<TokenPair>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken }
  })
}

export function logoutSession(accessToken: string): Promise<null> {
  return apiRequest<null>('/auth/logout', {
    method: 'POST',
    token: accessToken
  })
}

/** 发送验证码：根据渠道自动选择短信或邮箱接口 */
export function sendCode(
  channel: AuthChannel,
  identifier: string,
  scene: CodeScene
): Promise<null> {
  return channel === 'phone' ? sendSmsCode(identifier, scene) : sendEmailCode(identifier, scene)
}
