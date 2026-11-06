<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import QrCode from '@renderer/components/QrCode.vue'
import { useAppStore } from '@renderer/stores/app'

const app = useAppStore()
const router = useRouter()

const phone = ref('')
const secret = ref('')
const code = ref('')

const scanned = computed(() => app.qrScanned)
const isQr = computed(() => app.loginMode === 'qr')

const title = computed(() => {
  if (app.loginMode === 'qr') return scanned.value ? '已扫码，请在手机上确认登录' : '使用手机扫码登录'
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

function switchMode(): void {
  app.setLoginMode(isQr.value ? 'password' : 'qr')
}

function toggleCaptcha(): void {
  app.setLoginMode(app.loginMode === 'password' ? 'captcha' : 'password')
}

function submit(): void {
  app.login()
  router.replace('/chats')
}

function simulateScan(): void {
  app.setQrScanned(true)
}
</script>

<template>
  <div class="app-card flex h-[500px] w-[380px] flex-col overflow-hidden">
    <!-- 扫码登录 -->
    <template v-if="isQr">
      <div class="mt-14 flex justify-center">
        <button type="button" class="relative block" title="模拟扫码" @click="simulateScan">
          <QrCode :size="250" />
          <span
            v-if="!scanned"
            class="absolute inset-0 flex items-center justify-center rounded-md bg-overlay opacity-0 transition-opacity hover:opacity-100"
          >
            <span class="text-base text-on-accent">模拟扫码</span>
          </span>
        </button>
      </div>

      <h2 class="mt-6 text-center text-page text-foreground">{{ title }}</h2>
      <p
        v-for="line in qrDescLines"
        :key="line"
        class="mt-1 text-center text-base text-muted-foreground first:mt-3"
      >
        {{ line }}
      </p>
      <a
        href="#"
        class="mt-2 text-center text-base text-link transition-colors hover:text-link-hover"
        @click.prevent
      >
        点击下载野火IM移动端
      </a>
      <button
        type="button"
        class="mt-1 text-center text-base text-link transition-colors hover:text-link-hover"
        @click="switchMode"
      >
        {{ switchLabel }}
      </button>
    </template>

    <!-- 密码 / 验证码 / 注册 -->
    <template v-else>
      <div class="mt-9 flex justify-center">
        <div class="flex h-[160px] w-[160px] items-center justify-center rounded-window bg-accent-subtle">
          <AppIcon name="ion:chatboxes" :size="88" class="text-accent" />
        </div>
      </div>

      <h2 class="mt-3 px-[60px] text-left text-page text-foreground">{{ title }}</h2>

      <div class="px-[60px]">
        <input
          v-model="phone"
          class="app-field mt-3 h-9 w-[240px] pl-2.5"
          placeholder="手机号 / 邮箱"
          autocomplete="username"
        />

        <div v-if="app.loginMode === 'password' || app.loginMode === 'register'" class="relative">
          <input
            v-model="secret"
            type="password"
            class="app-field mt-6 h-9 w-[240px] pl-2.5"
            placeholder="请输入密码"
            autocomplete="current-password"
          />
        </div>

        <div v-else class="flex h-9 w-[240px] items-center gap-2">
          <input
            v-model="code"
            class="app-field h-full flex-1 pl-2.5"
            placeholder="请输入验证码"
          />
          <button type="button" class="shrink-0 text-small text-link hover:text-link-hover">
            获取验证码
          </button>
        </div>

        <div class="mt-4 flex w-[240px] items-center justify-between">
          <button type="button" class="text-caption text-link hover:text-link-hover" @click="toggleCaptcha">
            {{ captchaLinkLabel }}
          </button>
          <button
            v-if="app.loginMode !== 'register'"
            type="button"
            class="text-caption text-link hover:text-link-hover"
            @click="app.setLoginMode('register')"
          >
            注册
          </button>
        </div>

        <button
          type="button"
          class="btn-primary mt-4 h-10 w-[260px]"
          @click="submit"
        >
          {{ app.loginMode === 'register' ? '注册并登录' : '登录' }}
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
  </div>
</template>
