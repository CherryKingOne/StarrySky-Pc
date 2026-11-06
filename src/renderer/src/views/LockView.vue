<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import { useAppStore } from '@renderer/stores/app'
import { hasElectron, sendWindowAction } from '@renderer/utils/window'

const app = useAppStore()
const router = useRouter()

const password = ref('')
const error = ref('')
const loading = ref(false)

function unlock(): void {
  error.value = ''
  if (!password.value.trim()) {
    error.value = '请输入密码'
    return
  }
  loading.value = true
  window.setTimeout(() => {
    loading.value = false
    if (app.unlock(password.value)) {
      password.value = ''
      void router.replace('/chats')
    }
  }, 260)
}

function switchAccount(): void {
  app.logout()
  if (hasElectron()) {
    sendWindowAction('auth:logout')
    return
  }
  void router.replace('/login')
}
</script>

<template>
  <!-- P19 锁屏 -->
  <div class="flex h-full w-full flex-col items-center justify-center bg-background">
    <Avatar :name="app.nickname" :index="app.avatarIndex" :size="64" />
    <h2 class="mt-4 text-page text-foreground">{{ app.nickname }}</h2>
    <p class="mt-1 text-caption text-secondary-foreground">应用已锁定，输入密码解锁</p>

    <div class="mt-6 flex w-[260px] flex-col gap-3">
      <div class="app-field flex h-10 items-center gap-2 px-3">
        <AppIcon name="ion:lock-closed" :size="16" class="shrink-0 text-icon" />
        <input
          v-model="password"
          type="password"
          class="h-full w-full bg-transparent text-small text-foreground outline-none placeholder:text-placeholder-foreground"
          placeholder="输入登录密码"
          @keydown.enter.prevent="unlock"
        />
      </div>

      <p v-if="error" class="text-center text-micro text-danger">{{ error }}</p>

      <button type="button" class="btn-primary h-10 w-full" :disabled="loading" @click="unlock">
        {{ loading ? '解锁中…' : '解锁' }}
      </button>

      <button
        type="button"
        class="text-center text-micro text-link transition-colors hover:text-link-hover"
        @click="switchAccount"
      >
        切换账号
      </button>
      <p class="text-center text-micro text-tertiary-foreground">演示环境：输入任意密码即可解锁</p>
    </div>
  </div>
</template>
