<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'
import ResetPasswordDialog from '@renderer/components/ResetPasswordDialog.vue'
import Toast from '@renderer/components/Toast.vue'
import {
  loginWithEmail,
  loginWithPhone,
  registerWithEmail,
  registerWithPhone,
  sendCode as sendCodeRequest,
  type AuthChannel,
  type CodeScene
} from '@renderer/api/auth'
import { ApiError } from '@renderer/api/http'
import { useAppStore } from '@renderer/stores/app'
import { hasElectron, isMacPlatform, sendWindowAction } from '@renderer/utils/window'

const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const isMac = isMacPlatform()
const app = useAppStore()
const router = useRouter()

type AuthView = 'login' | 'register'

const channel = ref<AuthChannel>('phone')
/** true：选择登录方式；false：进入具体登录方式 */
const picking = ref(true)
const view = ref<AuthView>('login')
/** 登录方式：密码 or 验证码 */
const useCode = ref(false)

const nickname = ref('')
const identifier = ref('')
const password = ref('')
const confirmPassword = ref('')
const code = ref('')

const error = ref('')
const loading = ref(false)
const sending = ref(false)
const countdown = ref(0)
const showReset = ref(false)
const toastMessage = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const agreed = ref(false)
const showDoc = ref(false)
const docType = ref<'terms' | 'privacy'>('terms')
let timer: ReturnType<typeof setInterval> | undefined

const docTitle = computed(() => (docType.value === 'terms' ? '服务条款' : '隐私协议'))
const docLines = computed(() =>
  docType.value === 'terms'
    ? [
        '1. 本客户端用于企业内部沟通与协作演示。',
        '2. 请勿上传或传播违法、侵权、涉密内容。',
        '3. 使用本服务即表示你同意遵守企业沟通规范与相关法律法规。',
        '（当前为演示文本，正式服务条款以官方发布为准。）'
      ]
    : [
        '1. 客户端仅保存登录所需的账号、昵称、令牌等必要信息。',
        '2. 本地设备会保存会话状态用于保持登录，可在退出登录时清除。',
        '3. 我们不会将你的数据用于与服务无关的用途。',
        '（当前为演示文本，正式隐私政策以官方发布为准。）'
      ]
)

function openDoc(type: 'terms' | 'privacy'): void {
  docType.value = type
  showDoc.value = true
}

const channelLabel = computed(() => (channel.value === 'phone' ? '手机号' : '邮箱'))
const identifierPlaceholder = computed(() =>
  channel.value === 'phone' ? '请输入 11 位手机号' : '请输入邮箱地址'
)
const methodTitle = computed(() =>
  view.value === 'register' ? `注册${channelLabel.value}账号` : `${channelLabel.value}登录`
)
const methodSubtitle = computed(() => {
  if (view.value === 'register') return '填写信息，注册后自动登录'
  return `使用${channelLabel.value} + ${useCode.value ? '验证码' : '密码'}登录`
})
const submitLabel = computed(() => {
  if (view.value === 'register') return '注册并登录'
  return useCode.value ? '验证码登录' : '登录'
})
const codeText = computed(() => {
  if (sending.value) return '发送中…'
  return countdown.value > 0 ? `${countdown.value}s` : '获取验证码'
})

function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}

function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return '请求失败，请稍后重试'
}

function validateIdentifier(): string | null {
  const value = identifier.value.trim()
  if (!value) return `请输入${channelLabel.value}`
  if (channel.value === 'phone' && !/^1\d{10}$/.test(value)) return '请输入正确的 11 位手机号'
  if (channel.value === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return '请输入正确的邮箱地址'
  }
  return null
}

function startCountdown(): void {
  countdown.value = 60
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }, 1000)
}

function resetCountdown(): void {
  if (timer) clearInterval(timer)
  timer = undefined
  countdown.value = 0
}

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

async function sendCode(): Promise<void> {
  if (countdown.value > 0 || sending.value) return
  const idError = validateIdentifier()
  if (idError) {
    error.value = idError
    return
  }

  error.value = ''
  sending.value = true
  const scene: CodeScene = view.value === 'register' ? 'REGISTER' : 'LOGIN'
  try {
    await sendCodeRequest(channel.value, identifier.value.trim(), scene)
    startCountdown()
    showToast('验证码已发送，请查收')
  } catch (err) {
    error.value = messageOf(err)
  } finally {
    sending.value = false
  }
}

function finishLogin(): void {
  if (props.compact && hasElectron()) {
    sendWindowAction('auth:login')
    return
  }
  void router.replace('/chats')
}

async function submit(): Promise<void> {
  if (loading.value) return
  error.value = ''

  const idError = validateIdentifier()
  if (idError) {
    error.value = idError
    return
  }

  const account = identifier.value.trim()

  if (view.value === 'register') {
    if (!nickname.value.trim()) {
      error.value = '请输入昵称'
      return
    }
    if (password.value.length < 8) {
      error.value = '密码至少 8 位'
      return
    }
    if (password.value !== confirmPassword.value) {
      error.value = '两次输入的密码不一致'
      return
    }
    if (!/^\d{6}$/.test(code.value)) {
      error.value = '请输入 6 位验证码'
      return
    }
  } else if (useCode.value) {
    if (!/^\d{6}$/.test(code.value)) {
      error.value = '请输入 6 位验证码'
      return
    }
  } else if (!password.value) {
    error.value = '请输入密码'
    return
  }

  if (!agreed.value) {
    error.value = '请先阅读并同意《服务条款》和《隐私协议》'
    return
  }

  loading.value = true
  try {
    const session =
      view.value === 'register'
        ? channel.value === 'phone'
          ? await registerWithPhone({
              nickname: nickname.value.trim(),
              phone: account,
              password: password.value,
              confirmPassword: confirmPassword.value,
              code: code.value
            })
          : await registerWithEmail({
              nickname: nickname.value.trim(),
              email: account,
              password: password.value,
              confirmPassword: confirmPassword.value,
              code: code.value
            })
        : channel.value === 'phone'
          ? await loginWithPhone({
              phone: account,
              ...(useCode.value ? { code: code.value } : { password: password.value })
            })
          : await loginWithEmail({
              email: account,
              ...(useCode.value ? { code: code.value } : { password: password.value })
            })

    app.applySession(session, account)
    finishLogin()
  } catch (err) {
    error.value = messageOf(err)
  } finally {
    loading.value = false
  }
}

function chooseChannel(next: AuthChannel): void {
  channel.value = next
  picking.value = false
  view.value = 'login'
  useCode.value = false
  identifier.value = ''
  password.value = ''
  confirmPassword.value = ''
  code.value = ''
  nickname.value = ''
  error.value = ''
  showPassword.value = false
  showConfirmPassword.value = false
  resetCountdown()
}

function backToPicker(): void {
  picking.value = true
  view.value = 'login'
  useCode.value = false
  identifier.value = ''
  password.value = ''
  confirmPassword.value = ''
  code.value = ''
  nickname.value = ''
  error.value = ''
  showPassword.value = false
  showConfirmPassword.value = false
  resetCountdown()
}

function switchView(next: AuthView): void {
  view.value = next
  error.value = ''
  code.value = ''
  password.value = ''
  confirmPassword.value = ''
  nickname.value = ''
  useCode.value = false
  showPassword.value = false
  showConfirmPassword.value = false
  resetCountdown()
}

function switchLoginMethod(): void {
  useCode.value = !useCode.value
  error.value = ''
  code.value = ''
  password.value = ''
  showPassword.value = false
  resetCountdown()
}

function onFormEnter(event: KeyboardEvent): void {
  // 避免在按钮上按 Enter 时同时触发提交
  if ((event.target as HTMLElement).tagName === 'BUTTON') return
  event.preventDefault()
  void submit()
}

function onResetDone(): void {
  showReset.value = false
  showToast('密码已重置，请使用新密码登录')
}

function minimizeWindow(): void {
  sendWindowAction('window:minimize')
}

function closeWindow(): void {
  if (hasElectron()) {
    sendWindowAction('window:close')
    return
  }
  window.close()
}
</script>

<template>
  <div
    class="app-card relative flex h-[500px] w-[380px] flex-col overflow-hidden"
    :class="props.compact ? 'shadow-popover' : ''"
  >
    <!-- 卡片模式：顶部拖拽区 + 平台窗口控件 -->
    <div
      v-if="props.compact"
      class="app-drag absolute inset-x-0 top-0 z-20 flex h-10 items-center px-3"
      :class="isMac ? 'justify-start' : 'justify-between'"
    >
      <!-- macOS：左上角仅保留红色关闭圆点 -->
      <div v-if="isMac" class="traffic-lights app-no-drag flex items-center">
        <button v-tooltip="'关闭'" type="button" class="mac-dot close" @click="closeWindow">
          <span>×</span>
        </button>
      </div>

      <!-- Windows / Linux：右上角关闭与最小化 -->
      <template v-else>
        <span class="text-micro font-medium text-tertiary-foreground">野火IM</span>
        <div class="app-no-drag flex items-center gap-1">
          <button v-tooltip="'最小化'" type="button" class="window-control" @click="minimizeWindow">
            <AppIcon name="ion:remove" :size="16" />
          </button>
          <button
            v-tooltip="'关闭'"
            type="button"
            class="window-control is-close"
            @click="closeWindow"
          >
            <AppIcon name="ion:close" :size="16" />
          </button>
        </div>
      </template>
    </div>

    <div
      class="flex min-h-0 flex-1 flex-col px-9 pb-4"
      :class="props.compact ? 'pt-10' : 'pt-6'"
      @keydown.enter="onFormEnter"
    >
      <template v-if="picking">
        <div class="flex min-h-0 flex-1 flex-col">
          <!-- 品牌 -->
          <div class="flex shrink-0 items-center gap-2.5">
            <div class="flex h-8 w-8 items-center justify-center rounded-md bg-accent-subtle">
              <AppIcon name="ion:chatboxes" :size="18" class="text-accent" />
            </div>
            <div class="min-w-0">
              <p class="text-label text-foreground">野火IM</p>
              <p class="text-micro text-tertiary-foreground">连接你我，高效协同</p>
            </div>
          </div>

          <div class="flex min-h-0 flex-1 flex-col justify-center pb-4">
            <h2 class="text-page text-foreground">登录野火IM</h2>
            <p class="mt-1 text-caption text-secondary-foreground">请选择一种登录方式</p>

            <div class="mt-6 flex flex-col gap-3">
              <button type="button" class="login-method" @click="chooseChannel('phone')">
                <AppIcon name="ion:call" :size="20" class="login-method-icon" />
                <span class="text-label text-foreground">手机号登录</span>
                <AppIcon name="ion:ios-arrow-forward" :size="16" class="login-method-arrow" />
              </button>
              <button type="button" class="login-method" @click="chooseChannel('email')">
                <AppIcon name="ion:mail" :size="20" class="login-method-icon" />
                <span class="text-label text-foreground">邮箱登录</span>
                <AppIcon name="ion:ios-arrow-forward" :size="16" class="login-method-arrow" />
              </button>
            </div>

            <p class="mt-4 text-center text-micro text-tertiary-foreground">
              首次使用？进入对应方式后可直接注册账号
            </p>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- 返回 + 当前登录方式 -->
        <div class="flex shrink-0 items-center gap-2">
          <button
            v-tooltip="'返回选择登录方式'"
            type="button"
            class="icon-button h-8 w-8 rounded-md"
            @click="backToPicker"
          >
            <AppIcon name="ion:ios-arrow-back" :size="18" />
          </button>
          <div class="min-w-0">
            <h2 class="truncate text-section text-foreground">{{ methodTitle }}</h2>
            <p class="truncate text-micro text-tertiary-foreground">{{ methodSubtitle }}</p>
          </div>
        </div>

        <!-- 表单 -->
        <div class="scrollbar-none mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
          <input
            v-if="view === 'register'"
            v-model="nickname"
            class="app-field h-9 w-full px-2.5"
            placeholder="昵称（最多 32 字）"
            maxlength="32"
          />

          <input
            v-model="identifier"
            class="app-field mt-2 h-9 w-full px-2.5"
            :placeholder="identifierPlaceholder"
            :autocomplete="channel === 'phone' ? 'tel' : 'email'"
            maxlength="128"
          />

          <div v-if="view === 'login' && !useCode" class="relative mt-2">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="app-field h-9 w-full px-2.5 pr-9"
              placeholder="请输入密码"
              autocomplete="current-password"
            />
            <button
              v-tooltip="showPassword ? '隐藏密码' : '显示密码'"
              type="button"
              class="icon-button absolute top-1/2 right-1.5 h-7 w-7 -translate-y-1/2 rounded-sm text-tertiary-foreground"
              @click="showPassword = !showPassword"
            >
              <AppIcon :name="showPassword ? 'ion:eye-off' : 'ion:eye'" :size="16" />
            </button>
          </div>

          <!-- 注册 / 验证码登录：验证码与发送按钮放在密码上方 -->
          <div v-if="view === 'register' || useCode" class="mt-2 flex h-9 items-center gap-2">
            <input
              v-model="code"
              class="app-field h-full flex-1 px-2.5"
              placeholder="6 位验证码"
              maxlength="6"
              inputmode="numeric"
            />
            <button
              type="button"
              class="h-9 w-[104px] shrink-0 rounded-sm border border-border bg-input text-small text-link transition-colors hover:bg-item-hover disabled:opacity-50"
              :disabled="countdown > 0 || sending"
              @click="sendCode"
            >
              {{ codeText }}
            </button>
          </div>

          <!-- 注册：密码与确认密码各占一行 -->
          <div v-if="view === 'register'" class="mt-2 flex flex-col gap-2">
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="app-field h-9 w-full px-2.5 pr-9"
                placeholder="密码（8-64 位）"
                autocomplete="new-password"
              />
              <button
                v-tooltip="showPassword ? '隐藏密码' : '显示密码'"
                type="button"
                class="icon-button absolute top-1/2 right-1.5 h-7 w-7 -translate-y-1/2 rounded-sm text-tertiary-foreground"
                @click="showPassword = !showPassword"
              >
                <AppIcon :name="showPassword ? 'ion:eye-off' : 'ion:eye'" :size="16" />
              </button>
            </div>
            <div class="relative">
              <input
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                class="app-field h-9 w-full px-2.5 pr-9"
                placeholder="确认密码"
                autocomplete="new-password"
              />
              <button
                v-tooltip="showConfirmPassword ? '隐藏密码' : '显示密码'"
                type="button"
                class="icon-button absolute top-1/2 right-1.5 h-7 w-7 -translate-y-1/2 rounded-sm text-tertiary-foreground"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <AppIcon :name="showConfirmPassword ? 'ion:eye-off' : 'ion:eye'" :size="16" />
              </button>
            </div>
          </div>

          <p class="mt-2 line-clamp-2 min-h-[18px] text-caption text-danger" :title="error">
            {{ error }}
          </p>

          <!-- 服务条款 / 隐私协议 -->
          <div class="mt-1 flex items-start gap-1.5 text-caption">
            <button
              type="button"
              role="checkbox"
              :aria-checked="agreed"
              class="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border transition-colors"
              :class="agreed ? 'border-accent bg-accent text-on-accent' : 'border-border bg-input'"
              @click="agreed = !agreed"
            >
              <AppIcon v-if="agreed" name="ion:checkmark" :size="10" />
            </button>
            <p class="min-w-0 leading-[18px] text-secondary-foreground">
              我已阅读并同意
              <button
                type="button"
                class="text-link hover:text-link-hover"
                @click="openDoc('terms')"
              >
                《服务条款》
              </button>
              和
              <button
                type="button"
                class="text-link hover:text-link-hover"
                @click="openDoc('privacy')"
              >
                《隐私协议》
              </button>
            </p>
          </div>

          <button
            type="button"
            class="btn-primary mt-2 h-10 w-full"
            :disabled="loading"
            @click="submit"
          >
            {{ loading ? '请稍候…' : submitLabel }}
          </button>

          <div class="mt-2 flex items-center justify-between text-caption">
            <button
              v-if="view === 'login'"
              type="button"
              class="text-link hover:text-link-hover"
              @click="switchLoginMethod"
            >
              {{ useCode ? '使用密码登录' : '使用验证码登录' }}
            </button>
            <button
              v-else
              type="button"
              class="text-link hover:text-link-hover"
              @click="switchView('login')"
            >
              返回登录
            </button>

            <div v-if="view === 'login'" class="flex items-center gap-3">
              <button
                type="button"
                class="text-link hover:text-link-hover"
                @click="showReset = true"
              >
                忘记密码
              </button>
            </div>
          </div>

          <button
            type="button"
            class="mt-auto pb-1 text-caption text-link transition-colors hover:text-link-hover"
            @click="switchView(view === 'login' ? 'register' : 'login')"
          >
            {{ view === 'login' ? `没有账号？注册${channelLabel}账号` : '已有账号？直接登录' }}
          </button>
        </div>
      </template>
    </div>

    <!-- 找回密码 -->
    <ResetPasswordDialog
      :visible="showReset"
      :channel="channel"
      @close="showReset = false"
      @done="onResetDone"
    />

    <!-- 服务条款 / 隐私协议 -->
    <PopupDialog :visible="showDoc" :title="docTitle" width="460px" @close="showDoc = false">
      <div class="space-y-2 text-small leading-relaxed text-secondary-foreground">
        <p v-for="line in docLines" :key="line">{{ line }}</p>
      </div>
      <template #footer>
        <button type="button" class="btn-primary h-9 px-4" @click="showDoc = false">
          我知道了
        </button>
      </template>
    </PopupDialog>

    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
