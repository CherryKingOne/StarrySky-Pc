<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import SwitchToggle from '@renderer/components/SwitchToggle.vue'
import { settingsNavs } from '@renderer/data/mock'
import { useAppStore } from '@renderer/stores/app'

const router = useRouter()
const app = useAppStore()

const activeNav = ref('general')

const navTitle = computed(() => settingsNavs.find((item) => item.key === activeNav.value)?.label ?? '设置')

const general = reactive({
  autoLogin: true,
  newMessage: true,
  sound: false,
  showAvatar: true,
  darkMode: false
})
const notifications = reactive({
  banner: true,
  sound: true,
  detail: false,
  mute: false
})

const isDark = computed(() => app.theme === 'dark')

const generalRows = computed(() => [
  { key: 'autoLogin' as const, label: '下次自动登录' },
  { key: 'newMessage' as const, label: '新消息通知' },
  { key: 'sound' as const, label: '消息提示音' },
  { key: 'showAvatar' as const, label: '对话框显示头像' }
])

const notificationRows = computed(() => [
  { key: 'banner' as const, label: '显示通知横幅' },
  { key: 'sound' as const, label: '通知提示音' },
  { key: 'detail' as const, label: '通知显示消息详情' },
  { key: 'mute' as const, label: '开启免打扰' }
])

async function close(): Promise<void> {
  await router.push('/chats')
}
</script>

<template>
  <!-- 设置窗口直接居中于主窗口区域，无画布背景 -->
  <div class="flex h-full w-full items-center justify-center bg-background">
    <div class="app-window flex h-[600px] w-[960px]">
      <!-- 导航 200×600 -->
      <nav class="flex w-[200px] shrink-0 flex-col bg-sidebar">
        <h2 class="px-5 pt-[24px] text-section text-foreground">设置</h2>
        <div class="mt-[28px] flex flex-col gap-2 px-2">
          <button
            v-for="item in settingsNavs"
            :key="item.key"
            type="button"
            class="flex h-9 items-center rounded-md px-5 text-label transition-colors"
            :class="
              activeNav === item.key
                ? 'bg-selected-alt text-accent'
                : 'text-muted-foreground hover:bg-item-hover hover:text-foreground'
            "
            @click="activeNav = item.key"
          >
            {{ item.label }}
          </button>
        </div>
      </nav>

      <!-- 内容区 760×600 -->
      <section class="flex min-w-0 flex-1 flex-col">
        <header class="flex h-[60px] shrink-0 items-center justify-between px-5">
          <h3 class="text-section text-foreground">{{ navTitle }}</h3>
          <button
            type="button"
            class="icon-button h-8 w-8 rounded-md"
            title="关闭设置"
            @click="close"
          >
            <AppIcon name="ion:close" :size="18" />
          </button>
        </header>

          <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-4">
          <!-- 通用设置 -->
          <template v-if="activeNav === 'general'">
            <template v-for="row in generalRows" :key="row.key">
              <div class="ml-6 flex h-14 w-[480px] items-center justify-between">
                <span class="text-label text-foreground">{{ row.label }}</span>
                <SwitchToggle v-model="general[row.key]" />
              </div>
            </template>

            <div class="section-divider mx-6 my-3" />
            <div class="ml-6 flex h-14 w-[480px] items-center justify-between">
              <span class="text-label text-foreground">深色模式</span>
              <SwitchToggle :model-value="isDark" @update:model-value="app.toggleTheme()" />
            </div>
            <div class="ml-6 flex h-14 w-[480px] items-center justify-between">
              <span class="text-label text-foreground">语言</span>
              <span class="text-small text-secondary-foreground">简体中文</span>
            </div>
          </template>

          <!-- 消息通知 -->
          <template v-else-if="activeNav === 'notifications'">
            <template v-for="row in notificationRows" :key="row.key">
              <div class="ml-6 flex h-14 w-[480px] items-center justify-between">
                <span class="text-label text-foreground">{{ row.label }}</span>
                <SwitchToggle v-model="notifications[row.key]" />
              </div>
            </template>
          </template>

          <!-- 账号与安全 -->
          <template v-else-if="activeNav === 'account'">
            <div class="mx-6 mt-3 flex items-center gap-4 rounded-lg bg-item-hover p-4">
              <Avatar name="林晓" :index="1" :size="36" />
              <div>
                <p class="text-label text-foreground">林晓</p>
                <p class="text-micro text-secondary-foreground">ID: linxiao</p>
              </div>
            </div>
            <div class="ml-6 mt-3 flex h-14 w-[480px] items-center justify-between">
              <span class="text-label text-foreground">手机号</span>
              <span class="text-small text-secondary-foreground">138****8888</span>
            </div>
            <div class="ml-6 flex h-14 w-[480px] items-center justify-between">
              <span class="text-label text-foreground">登录密码</span>
              <span class="text-small text-link">修改</span>
            </div>
            <div class="ml-6 flex h-14 w-[480px] items-center justify-between">
              <span class="text-label text-foreground">多端登录</span>
              <span class="text-small text-secondary-foreground">已开启</span>
            </div>
          </template>

          <!-- 关于 -->
          <template v-else>
            <div class="mx-6 mt-4 flex flex-col items-center text-center">
              <div
                class="flex h-20 w-20 items-center justify-center rounded-window bg-accent-subtle"
              >
                <AppIcon name="ion:chatboxes" :size="44" class="text-accent" />
              </div>
              <p class="mt-3 text-section text-foreground">野火IM</p>
              <p class="mt-1 text-caption text-secondary-foreground">PC 客户端 v1.0.0</p>
              <p class="mt-4 text-caption text-tertiary-foreground">
                连接你我，高效协同
              </p>
            </div>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>
