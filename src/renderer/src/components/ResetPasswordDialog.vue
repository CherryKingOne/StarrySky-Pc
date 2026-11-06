<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'
import {
  resetPasswordWithEmail,
  resetPasswordWithPhone,
  sendCode as sendCodeRequest,
  type AuthChannel
} from '@renderer/api/auth'
import { ApiError } from '@renderer/api/http'

const props = withDefaults(
  defineProps<{
    visible: boolean
    channel?: AuthChannel
  }>(),
  { channel: 'phone' }
)

const emit = defineEmits<{
  close: []
  done: []
}>()

const channel = ref<AuthChannel>(props.channel)
const identifier = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const loading = ref(false)
const sending = ref(false)
const countdown = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

const channelLabel = computed(() => (channel.value === 'phone' ? '手机号' : '邮箱'))
const codeText = computed(() => {
  if (sending.value) return '发送中…'
  return countdown.value > 0 ? `${countdown.value}s` : '获取验证码'
})

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      if (timer) clearInterval(timer)
      timer = undefined
      countdown.value = 0
      return
    }
    channel.value = props.channel
    identifier.value = ''
    code.value = ''
    password.value = ''
    confirmPassword.value = ''
    error.value = ''
  }
)

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
  if (channel.value === 'phone' && !/^1\d{10}$/.test(value)) return '请输入正确的 11 位手机号'
  if (channel.value === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return '请输入正确的邮箱地址'
  }
  return null
}

function switchChannel(next: AuthChannel): void {
  if (channel.value === next) return
  channel.value = next
  identifier.value = ''
  code.value = ''
  error.value = ''
  if (timer) clearInterval(timer)
  timer = undefined
  countdown.value = 0
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

async function sendCode(): Promise<void> {
  if (countdown.value > 0 || sending.value) return
  const idError = validateIdentifier()
  if (idError) {
    error.value = idError
    return
  }

  error.value = ''
  sending.value = true
  try {
    await sendCodeRequest(channel.value, identifier.value.trim(), 'RESET_PASSWORD')
    startCountdown()
  } catch (err) {
    error.value = messageOf(err)
  } finally {
    sending.value = false
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
    const identifierValue = identifier.value.trim()
    if (channel.value === 'phone') {
      await resetPasswordWithPhone({
        phone: identifierValue,
        code: code.value,
        newPassword: password.value,
        confirmPassword: confirmPassword.value
      })
    } else {
      await resetPasswordWithEmail({
        email: identifierValue,
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
  <PopupDialog
    :visible="visible"
    title="找回密码"
    subtitle="通过手机号或邮箱验证码重置登录密码"
    width="420px"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-3">
      <!-- 渠道切换 -->
      <div class="flex h-9 rounded-sm bg-item-hover p-0.5">
        <button
          v-for="option in [
            { key: 'phone' as const, label: '手机号' },
            { key: 'email' as const, label: '邮箱' }
          ]"
          :key="option.key"
          type="button"
          class="flex-1 rounded-sm text-small transition-colors"
          :class="
            channel === option.key
              ? 'bg-panel text-foreground shadow-sm'
              : 'text-secondary-foreground hover:text-foreground'
          "
          @click="switchChannel(option.key)"
        >
          {{ option.label }}
        </button>
      </div>

      <label class="flex flex-col gap-1.5">
        <span class="text-micro text-secondary-foreground">{{ channelLabel }}</span>
        <input
          v-model="identifier"
          class="app-field h-10 px-3 text-small"
          :placeholder="channel === 'phone' ? '请输入 11 位手机号' : '请输入邮箱地址'"
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
            :disabled="countdown > 0 || sending"
            @click="sendCode"
          >
            {{ codeText }}
          </button>
        </div>
      </div>

      <label class="flex flex-col gap-1.5">
        <span class="text-micro text-secondary-foreground">新密码</span>
        <input
          v-model="password"
          type="password"
          class="app-field h-10 px-3 text-small"
          placeholder="至少 8 位"
          autocomplete="new-password"
        />
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="text-micro text-secondary-foreground">确认新密码</span>
        <input
          v-model="confirmPassword"
          type="password"
          class="app-field h-10 px-3 text-small"
          placeholder="再次输入新密码"
          autocomplete="new-password"
        />
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
    </div>

    <template #footer>
      <button
        type="button"
        class="inline-flex h-9 items-center justify-center rounded-sm border border-border bg-input px-4 text-label text-foreground transition-colors hover:bg-item-hover"
        @click="emit('close')"
      >
        取消
      </button>
      <button type="button" class="btn-primary h-9 px-5" :disabled="loading" @click="submit">
        {{ loading ? '提交中…' : '重置密码' }}
      </button>
    </template>
  </PopupDialog>
</template>
