<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import {
  resetPasswordWithEmail,
  resetPasswordWithPhone,
  sendCode as sendCodeRequest,
  type AuthChannel
} from '@renderer/api/auth'
import { ApiError } from '@renderer/api/http'

const props = withDefaults(
  defineProps<{
    channel: AuthChannel
    /** 从登录页带入的账号，避免重复输入 */
    initialIdentifier?: string
  }>(),
  { initialIdentifier: '' }
)

const emit = defineEmits<{ done: [] }>()

const identifier = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)
const countdown = ref(0)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
let timer: ReturnType<typeof setInterval> | undefined

const channelLabel = computed(() => (props.channel === 'phone' ? '手机号' : '邮箱'))
const identifierPlaceholder = computed(() =>
  props.channel === 'phone' ? '请输入 11 位手机号' : '请输入邮箱地址'
)
const codeText = computed(() => (countdown.value > 0 ? `${countdown.value}s` : '获取验证码'))

onMounted(() => {
  identifier.value = props.initialIdentifier
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return '请求失败，请稍后重试'
}

function validateIdentifier(): string | null {
  const value = identifier.value.trim()
  if (!value) return `请输入${channelLabel.value}`
  if (props.channel === 'phone' && !/^1\d{10}$/.test(value)) return '请输入正确的 11 位手机号'
  if (props.channel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
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

function onEnter(event: KeyboardEvent): void {
  if ((event.target as HTMLElement).tagName === 'BUTTON') return
  event.preventDefault()
  void submit()
}

async function sendCode(): Promise<void> {
  if (countdown.value > 0) return
  const idError = validateIdentifier()
  if (idError) {
    error.value = idError
    return
  }

  error.value = ''
  // 点击后立即开始倒计时，接口在后台发送
  startCountdown()

  try {
    await sendCodeRequest(props.channel, identifier.value.trim(), 'RESET_PASSWORD')
  } catch (err) {
    error.value = messageOf(err)
    resetCountdown()
  }
}

async function submit(): Promise<void> {
  if (loading.value) return
  error.value = ''

  const idError = validateIdentifier()
  if (idError) {
    error.value = idError
    return
  }
  if (!/^\d{6}$/.test(code.value)) {
    error.value = '请输入 6 位验证码'
    return
  }
  if (password.value.length < 8) {
    error.value = '新密码至少 8 位'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的新密码不一致'
    return
  }

  loading.value = true
  try {
    const account = identifier.value.trim()
    if (props.channel === 'phone') {
      await resetPasswordWithPhone({
        phone: account,
        code: code.value,
        newPassword: password.value,
        confirmPassword: confirmPassword.value
      })
    } else {
      await resetPasswordWithEmail({
        email: account,
        code: code.value,
        newPassword: password.value,
        confirmPassword: confirmPassword.value
      })
    }
    emit('done')
  } catch (err) {
    error.value = messageOf(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-3" @keydown.enter="onEnter">
    <label class="flex flex-col gap-1.5">
      <span class="text-micro text-secondary-foreground">{{ channelLabel }}</span>
      <input
        v-model="identifier"
        class="app-field h-10 w-full px-3 text-small"
        :placeholder="identifierPlaceholder"
        maxlength="128"
      />
    </label>

    <div class="flex flex-col gap-1.5">
      <span class="text-micro text-secondary-foreground">验证码</span>
      <div class="flex gap-2">
        <input
          v-model="code"
          class="app-field h-10 flex-1 px-3 text-small"
          placeholder="6 位验证码"
          maxlength="6"
          inputmode="numeric"
        />
        <button
          type="button"
          class="h-10 w-[120px] shrink-0 rounded-sm border border-border bg-input text-small text-link transition-colors hover:bg-item-hover disabled:opacity-50"
          :disabled="countdown > 0"
          @click="sendCode"
        >
          {{ codeText }}
        </button>
      </div>
    </div>

    <label class="flex flex-col gap-1.5">
      <span class="text-micro text-secondary-foreground">新密码</span>
      <div class="relative">
        <input
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          class="app-field h-10 w-full px-3 pr-10 text-small"
          placeholder="至少 8 位"
          autocomplete="new-password"
        />
        <button
          v-tooltip="showPassword ? '隐藏密码' : '显示密码'"
          type="button"
          class="icon-button absolute top-1/2 right-1.5 h-8 w-8 -translate-y-1/2 rounded-sm text-tertiary-foreground"
          @click="showPassword = !showPassword"
        >
          <AppIcon :name="showPassword ? 'ion:eye-off' : 'ion:eye'" :size="16" />
        </button>
      </div>
    </label>

    <label class="flex flex-col gap-1.5">
      <span class="text-micro text-secondary-foreground">确认新密码</span>
      <div class="relative">
        <input
          v-model="confirmPassword"
          :type="showConfirmPassword ? 'text' : 'password'"
          class="app-field h-10 w-full px-3 pr-10 text-small"
          placeholder="再次输入新密码"
          autocomplete="new-password"
        />
        <button
          v-tooltip="showConfirmPassword ? '隐藏密码' : '显示密码'"
          type="button"
          class="icon-button absolute top-1/2 right-1.5 h-8 w-8 -translate-y-1/2 rounded-sm text-tertiary-foreground"
          @click="showConfirmPassword = !showConfirmPassword"
        >
          <AppIcon :name="showConfirmPassword ? 'ion:eye-off' : 'ion:eye'" :size="16" />
        </button>
      </div>
    </label>

    <p
      v-if="error"
      class="flex items-start gap-1 rounded-sm bg-danger/10 px-2 py-1.5 text-micro text-danger"
    >
      <AppIcon name="ion:information-circle-outline" :size="12" class="mt-0.5 shrink-0" />
      {{ error }}
    </p>

    <p class="text-micro text-tertiary-foreground">
      验证码有效期 5 分钟；重置成功后该账号其他设备会退出登录。
    </p>

    <button type="button" class="btn-primary h-10 w-full" :disabled="loading" @click="submit">
      {{ loading ? '提交中…' : '重置密码' }}
    </button>
  </div>
</template>
