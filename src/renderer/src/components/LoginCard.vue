<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import QrCode from '@renderer/components/QrCode.vue'
import ResetPasswordDialog from '@renderer/components/ResetPasswordDialog.vue'
import Toast from '@renderer/components/Toast.vue'
import { useAppStore } from '@renderer/stores/app'
import type { LoginMode } from '@renderer/stores/app'

const app = useAppStore()
const router = useRouter()

const phone = ref('')
const secret = ref('')
const code = ref('')
const error = ref('')
const countdown = ref(0)
const qrKey = ref(0)
const showReset = ref(false)
const toastMessage = ref('')
let timer: ReturnType<typeof setInterval> | undefined

const scanned = computed(() => app.qrScanned)
const isQr = computed(() => app.loginMode === 'qr')
const loginMode = computed<LoginMode>(() => app.loginMode)

function setLoginMode(mode: LoginMode): void {
  app.setLoginMode(mode)
}

const title = computed(() => {
  if (app.loginMode === 'qr')
    return scanned.value ? '已扫码，请在手机上确认登录' : '使用手机扫码登录'
  if (app.loginMode === 'password') return '密码登录'
  if (app.loginMode === 'captcha') return '验证码登录'
  return '注册新账号'
})

const qrDescLines = computed(() => {
  if (!scanned.value) {
    return ['请打开野火IM手机客户端扫一扫', '扫码后请在手机上确认登录']
  }
  return ['林晓（ID: linxiao）', '在手机端点击「登录」完成登录']
})

const switchLabel = computed(() => (isQr.value ? '使用密码/验证码登录' : '扫码登录'))
const captchaLinkLabel = computed(() =>
  app.loginMode === 'password' ? '使用验证码登录' : '使用密码登录'
)
const codeText = computed(() => (countdown.value > 0 ? `${countdown.value}s` : '获取验证码'))

function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}

function switchMode(): void {
  error.value = ''
  app.setLoginMode(isQr.value ? 'password' : 'qr')
}

function toggleCaptcha(): void {
  error.value = ''
  app.setLoginMode(app.loginMode === 'password' ? 'captcha' : 'password')
}

function sendCode(): void {
  if (!phone.value.trim()) {
    error.value = '请先填写手机号 / 邮箱'
    return
  }
  error.value = ''
  code.value = '123456'
  countdown.value = 60
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }, 1000)
  showToast('验证码已发送（演示：123456）')
}

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

function submit(): void {
  error.value = ''
  if (!phone.value.trim()) {
    error.value = '请输入手机号 / 邮箱'
    return
  }
  if ((app.loginMode === 'password' || app.loginMode === 'register') && !secret.value.trim()) {
    error.value = '请输入密码'
    return
  }
  if (app.loginMode === 'captcha' && code.value.trim().length < 4) {
    error.value = '请输入验证码'
    return
  }
  app.login()
  void router.replace('/chats')
}

function simulateScan(): void {
  if (scanned.value) return
  app.setQrScanned(true)
  showToast('已扫码（演示），可继续模拟确认登录')
}

function confirmScanLogin(): void {
  app.login()
  void router.replace('/chats')
}

function refreshQr(): void {
  qrKey.value += 1
  app.setQrScanned(false)
  showToast('二维码已刷新')
}

function onResetSubmit(): void {
  showReset.value = false
  showToast('密码已重置，请使用新密码登录')
}

function downloadApp(): void {
  window.open('https://www.wildfirechat.cn', '_blank')
  showToast('已在浏览器中打开下载页')
}
</script>

<template>
  <div class="app-card flex h-[500px] w-[380px] flex-col overflow-hidden">
    <!-- 扫码登录 -->
    <template v-if="isQr">
      <div class="mt-10 flex justify-center">
        <button type="button" class="relative block" title="模拟扫码" @click="simulateScan">
          <QrCode :key="qrKey" :size="230" :value="`starrysky://login/${qrKey}`" />
          <span
            v-if="!scanned"
            class="absolute inset-0 flex items-center justify-center rounded-md bg-overlay opacity-0 transition-opacity hover:opacity-100"
          >
            <span class="text-base text-on-accent">模拟扫码</span>
          </span>
        </button>
      </div>

      <h2 class="mt-5 text-center text-page text-foreground">{{ title }}</h2>
      <p
        v-for="line in qrDescLines"
        :key="line"
        class="mt-1 text-center text-base text-muted-foreground first:mt-3"
      >
        {{ line }}
      </p>

      <div class="mt-3 flex items-center justify-center gap-4">
        <button
          type="button"
          class="inline-flex items-center gap-1 text-base text-link transition-colors hover:text-link-hover"
          @click="downloadApp"
        >
          <AppIcon name="ion:ios-download" :size="16" />
          下载移动端
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1 text-base text-link transition-colors hover:text-link-hover"
          @click="refreshQr"
        >
          <AppIcon name="ion:refresh" :size="16" />
          刷新二维码
        </button>
      </div>

      <button
        v-if="scanned"
        type="button"
        class="btn-primary mx-[60px] mt-3 h-9"
        @click="confirmScanLogin"
      >
        模拟手机端确认登录
      </button>

      <button
        type="button"
        class="mt-auto mb-6 text-center text-base text-link transition-colors hover:text-link-hover"
        @click="switchMode"
      >
        {{ switchLabel }}
      </button>
    </template>

    <!-- 密码 / 验证码 / 注册 -->
    <template v-else>
      <div class="mt-8 flex justify-center">
        <div
          class="flex h-[140px] w-[140px] items-center justify-center rounded-window bg-accent-subtle"
        >
          <AppIcon name="ion:chatboxes" :size="76" class="text-accent" />
        </div>
      </div>

      <h2 class="mt-3 px-[60px] text-left text-page text-foreground">{{ title }}</h2>

      <div class="px-[60px]">
        <input
          v-model="phone"
          class="app-field mt-3 h-9 w-[260px] px-2.5"
          placeholder="手机号 / 邮箱"
          autocomplete="username"
        />

        <input
          v-if="loginMode === 'password' || loginMode === 'register'"
          v-model="secret"
          type="password"
          class="app-field mt-4 h-9 w-[260px] px-2.5"
          placeholder="请输入密码"
          autocomplete="current-password"
        />

        <div v-else class="mt-4 flex h-9 w-[260px] items-center gap-2">
          <input v-model="code" class="app-field h-full flex-1 px-2.5" placeholder="请输入验证码" />
          <button
            type="button"
            class="h-9 w-[88px] shrink-0 rounded-sm border border-border bg-input text-small text-link transition-colors hover:bg-item-hover disabled:opacity-50"
            :disabled="countdown > 0"
            @click="sendCode"
          >
            {{ codeText }}
          </button>
        </div>

        <p v-if="error" class="mt-2 text-caption text-danger">{{ error }}</p>

        <div class="mt-3 flex w-[260px] items-center justify-between">
          <button
            type="button"
            class="text-caption text-link hover:text-link-hover"
            @click="toggleCaptcha"
          >
            {{ captchaLinkLabel }}
          </button>
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="text-caption text-link hover:text-link-hover"
              @click="showReset = true"
            >
              忘记密码
            </button>
            <button
              v-if="loginMode !== 'register'"
              type="button"
              class="text-caption text-link hover:text-link-hover"
              @click="setLoginMode('register')"
            >
              注册
            </button>
            <button
              v-else
              type="button"
              class="text-caption text-link hover:text-link-hover"
              @click="setLoginMode('password')"
            >
              返回登录
            </button>
          </div>
        </div>

        <button type="button" class="btn-primary mt-4 h-10 w-[260px]" @click="submit">
          {{ loginMode === 'register' ? '注册并登录' : '登录' }}
        </button>
      </div>

      <button
        type="button"
        class="mt-auto mb-6 text-center text-base text-link transition-colors hover:text-link-hover"
        @click="switchMode"
      >
        {{ switchLabel }}
      </button>
    </template>

    <!-- P23 重置密码 -->
    <ResetPasswordDialog :visible="showReset" @close="showReset = false" @submit="onResetSubmit" />

    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
