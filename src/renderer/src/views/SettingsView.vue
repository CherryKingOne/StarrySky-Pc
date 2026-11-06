<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import AvatarCropDialog from '@renderer/components/AvatarCropDialog.vue'
import ChangePasswordDialog from '@renderer/components/ChangePasswordDialog.vue'
import ConfirmDialog from '@renderer/components/ConfirmDialog.vue'
import GroupQrDialog from '@renderer/components/GroupQrDialog.vue'
import OptionPickerDialog from '@renderer/components/OptionPickerDialog.vue'
import ResetPasswordDialog from '@renderer/components/ResetPasswordDialog.vue'
import SlideVerifyDialog from '@renderer/components/SlideVerifyDialog.vue'
import SwitchToggle from '@renderer/components/SwitchToggle.vue'
import Toast from '@renderer/components/Toast.vue'
import { settingsNavs } from '@renderer/data/mock'
import { useAppStore } from '@renderer/stores/app'
import { hasElectron, sendWindowAction } from '@renderer/utils/window'

const router = useRouter()
const app = useAppStore()

const activeNav = ref('account')
const toastMessage = ref('')

const showChangePassword = ref(false)
const showResetPassword = ref(false)
const showQr = ref(false)
const showCrop = ref(false)
const showLogout = ref(false)
const showLanguage = ref(false)
const showQuiet = ref(false)
const showDevices = ref(false)
const showVerify = ref(false)

const general = reactive({
  autoLogin: true,
  newMessage: true,
  sound: false,
  showAvatar: true,
  enterSend: true
})
const notifications = reactive({
  banner: true,
  sound: true,
  detail: false,
  mute: false,
  quiet: '不开启'
})

const languages = computed(() => ['简体中文', '繁體中文', 'English'])
const quietOptions = computed(() => ['不开启', '22:00 - 08:00', '23:00 - 07:00', '全天免打扰'])
const devices = computed(() => [
  'MacBook Pro · 当前设备',
  'iPhone 15 Pro · 已登录',
  'iPad Air · 已登录',
  'Windows 客户端 · 已退出'
])

const nickname = computed(() => app.nickname)
const avatarIndex = computed(() => app.avatarIndex)
const accountId = computed(() => app.accountId)
const phone = computed(() => app.phone)
const language = computed(() => app.language)
const quiet = computed(() => notifications.quiet)

function toggleTheme(): void {
  app.toggleTheme()
}

function setLanguage(value: string): void {
  app.setLanguage(value)
  showToast(`语言已切换为 ${value}`)
}

function setQuiet(value: string): void {
  notifications.quiet = value
  showToast(`免打扰时间：${value}`)
}

function applyAvatar(index: number): void {
  app.setAvatar(index)
  showCrop.value = false
  showToast('头像已更新')
}

function submitChangePassword(): void {
  showChangePassword.value = false
  showToast('密码修改成功')
}

function forgotPassword(): void {
  showChangePassword.value = false
  showResetPassword.value = true
}

function submitResetPassword(): void {
  showResetPassword.value = false
  showToast('密码已重置，请使用新密码登录')
}

function onVerified(): void {
  showToast('安全验证已通过')
}

const isDark = computed(() => app.theme === 'dark')
const navTitle = computed(
  () => settingsNavs.find((item) => item.key === activeNav.value)?.label ?? '设置'
)

const generalRows = computed(() => [
  { key: 'autoLogin' as const, label: '下次自动登录' },
  { key: 'newMessage' as const, label: '新消息通知' },
  { key: 'sound' as const, label: '消息提示音' },
  { key: 'showAvatar' as const, label: '对话框显示头像' },
  { key: 'enterSend' as const, label: 'Enter 发送消息' }
])

const notificationRows = computed(() => [
  { key: 'banner' as const, label: '显示通知横幅' },
  { key: 'sound' as const, label: '通知提示音' },
  { key: 'detail' as const, label: '通知显示消息详情' },
  { key: 'mute' as const, label: '开启免打扰' }
])

function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}

function close(): void {
  void router.push('/chats')
}

function lockApp(): void {
  app.lock()
  void router.push('/lock')
}

function logout(): void {
  showLogout.value = false
  app.logout()
  if (hasElectron()) {
    sendWindowAction('auth:logout')
    return
  }
  void router.push('/login')
  showToast('已退出登录')
}

function openOfficialSite(): void {
  window.open('https://www.wildfirechat.cn', '_blank')
  showToast('已在浏览器中打开官网')
}

function checkUpdate(): void {
  showToast('当前已是最新版本 v1.0.0')
}
</script>

<template>
  <!-- P07 设置 / P21 账号与安全 -->
  <div class="flex h-full w-full bg-background">
    <nav class="flex w-[240px] shrink-0 flex-col border-r border-divider bg-sidebar">
      <h2 class="px-5 pt-[24px] text-section text-foreground">设置</h2>
      <div class="mt-[20px] flex flex-col gap-1 px-2">
        <button
          v-for="item in settingsNavs"
          :key="item.key"
          type="button"
          class="flex h-9 items-center rounded-md px-4 text-label transition-colors"
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

      <div class="mt-auto flex flex-col gap-1 px-2 pb-5">
        <button
          type="button"
          class="flex h-9 items-center gap-2 rounded-md px-4 text-label text-muted-foreground transition-colors hover:bg-item-hover hover:text-foreground"
          @click="lockApp"
        >
          <AppIcon name="ion:lock-closed" :size="16" />
          锁定应用
        </button>
        <button
          type="button"
          class="flex h-9 items-center gap-2 rounded-md px-4 text-label text-danger transition-colors hover:bg-item-hover"
          @click="showLogout = true"
        >
          <AppIcon name="ion:log-out" :size="16" />
          退出登录
        </button>
      </div>
    </nav>

    <!-- 内容区 -->
    <section class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-[60px] shrink-0 items-center justify-between px-6">
        <h3 class="text-section text-foreground">{{ navTitle }}</h3>
        <button
          v-tooltip="'关闭设置'"
          type="button"
          class="icon-button h-8 w-8 rounded-md"
          @click="close"
        >
          <AppIcon name="ion:close" :size="18" />
        </button>
      </header>
      <div class="h-px w-full bg-border" />

      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-5">
        <!-- 账号与安全 -->
        <template v-if="activeNav === 'account'">
          <div class="flex items-center gap-4 rounded-lg bg-panel p-4">
            <button
              v-tooltip="'修改头像'"
              type="button"
              class="relative shrink-0"
              @click="showCrop = true"
            >
              <Avatar :name="nickname" :index="avatarIndex" :size="40" />
              <span
                class="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-on-accent"
              >
                <AppIcon name="ion:android-create" :size="10" />
              </span>
            </button>
            <div class="min-w-0 flex-1">
              <p class="text-label text-foreground">{{ nickname }}</p>
              <p class="mt-0.5 text-micro text-secondary-foreground">ID: {{ accountId }}</p>
            </div>
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
              @click="showQr = true"
            >
              <AppIcon name="ion:qr-code" :size="14" />
              我的二维码
            </button>
          </div>

          <div class="mt-4 flex flex-col">
            <div class="flex h-14 items-center justify-between border-b border-divider">
              <span class="text-label text-foreground">手机号</span>
              <span class="text-small text-secondary-foreground">{{ phone }}</span>
            </div>
            <div class="flex h-14 items-center justify-between border-b border-divider">
              <span class="text-label text-foreground">登录密码</span>
              <button
                type="button"
                class="text-small text-link hover:text-link-hover"
                @click="showChangePassword = true"
              >
                修改
              </button>
            </div>
            <div class="flex h-14 items-center justify-between border-b border-divider">
              <span class="text-label text-foreground">密码重置</span>
              <button
                type="button"
                class="text-small text-link hover:text-link-hover"
                @click="showResetPassword = true"
              >
                通过手机号重置
              </button>
            </div>
            <div class="flex h-14 items-center justify-between border-b border-divider">
              <span class="text-label text-foreground">多端登录</span>
              <span class="text-small text-secondary-foreground">已开启</span>
            </div>
            <div class="flex h-14 items-center justify-between border-b border-divider">
              <span class="text-label text-foreground">安全验证</span>
              <button
                type="button"
                class="text-small text-link hover:text-link-hover"
                @click="showVerify = true"
              >
                拖动滑块验证
              </button>
            </div>
            <div class="flex h-14 items-center justify-between">
              <span class="text-label text-foreground">登录设备</span>
              <button
                type="button"
                class="text-small text-link hover:text-link-hover"
                @click="showDevices = true"
              >
                查看 4 台设备
              </button>
            </div>
          </div>

          <div class="mt-5 flex gap-2">
            <button
              type="button"
              class="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border bg-input px-4 text-label text-foreground transition-colors hover:bg-item-hover"
              @click="lockApp"
            >
              <AppIcon name="ion:lock-closed" :size="14" />
              锁定应用
            </button>
            <button
              type="button"
              class="inline-flex h-9 items-center gap-1.5 rounded-sm px-4 text-label text-danger transition-colors hover:bg-item-hover"
              @click="showLogout = true"
            >
              <AppIcon name="ion:log-out" :size="14" />
              退出登录
            </button>
          </div>
        </template>

        <!-- 消息通知 -->
        <template v-else-if="activeNav === 'notifications'">
          <div class="flex flex-col">
            <div
              v-for="row in notificationRows"
              :key="row.key"
              class="flex h-14 items-center justify-between border-b border-divider"
            >
              <span class="text-label text-foreground">{{ row.label }}</span>
              <SwitchToggle v-model="notifications[row.key]" />
            </div>
            <button
              type="button"
              class="flex h-14 items-center justify-between border-b border-divider text-left"
              @click="showQuiet = true"
            >
              <span class="text-label text-foreground">免打扰时间</span>
              <span class="inline-flex items-center gap-1 text-small text-secondary-foreground">
                {{ quiet }}
                <AppIcon name="ion:ios-arrow-right" :size="14" />
              </span>
            </button>
            <div class="flex h-14 items-center justify-between">
              <span class="text-label text-foreground">通知音效</span>
              <button
                type="button"
                class="text-small text-link hover:text-link-hover"
                @click="showToast('已播放通知音效')"
              >
                试听
              </button>
            </div>
          </div>
          <p class="mt-3 text-micro text-tertiary-foreground">
            免打扰期间仍会接收消息，但不会弹出通知横幅。
          </p>
        </template>

        <!-- 通用设置 -->
        <template v-else-if="activeNav === 'general'">
          <div class="flex flex-col">
            <div
              v-for="row in generalRows"
              :key="row.key"
              class="flex h-14 items-center justify-between border-b border-divider"
            >
              <span class="text-label text-foreground">{{ row.label }}</span>
              <SwitchToggle v-model="general[row.key]" />
            </div>
            <div class="flex h-14 items-center justify-between border-b border-divider">
              <span class="text-label text-foreground">深色模式</span>
              <SwitchToggle :model-value="isDark" @update:model-value="toggleTheme" />
            </div>
            <button
              type="button"
              class="flex h-14 items-center justify-between border-b border-divider text-left"
              @click="showLanguage = true"
            >
              <span class="text-label text-foreground">语言</span>
              <span class="inline-flex items-center gap-1 text-small text-secondary-foreground">
                {{ language }}
                <AppIcon name="ion:ios-arrow-right" :size="14" />
              </span>
            </button>
            <div class="flex h-14 items-center justify-between">
              <span class="text-label text-foreground">主题色</span>
              <span class="inline-flex items-center gap-2 text-small text-secondary-foreground">
                <span class="h-4 w-4 rounded-full bg-accent" />
                野火蓝
              </span>
            </div>
          </div>
        </template>

        <!-- 关于 -->
        <template v-else>
          <div class="flex flex-col items-center pt-6 text-center">
            <div class="flex h-20 w-20 items-center justify-center rounded-window bg-accent-subtle">
              <AppIcon name="ion:chatboxes" :size="44" class="text-accent" />
            </div>
            <p class="mt-3 text-section text-foreground">野火IM</p>
            <p class="mt-1 text-caption text-secondary-foreground">PC 客户端 v1.0.0</p>
            <p class="mt-4 text-caption text-tertiary-foreground">连接你我，高效协同</p>

            <div class="mt-6 w-full max-w-[420px]">
              <button
                type="button"
                class="flex h-12 w-full items-center justify-between border-b border-divider text-left"
                @click="checkUpdate"
              >
                <span class="text-label text-foreground">检查更新</span>
                <span class="inline-flex items-center gap-1 text-small text-secondary-foreground">
                  已是最新版本
                  <AppIcon name="ion:ios-arrow-right" :size="14" />
                </span>
              </button>
              <button
                type="button"
                class="flex h-12 w-full items-center justify-between border-b border-divider text-left"
                @click="openOfficialSite"
              >
                <span class="text-label text-foreground">官方网站</span>
                <span class="inline-flex items-center gap-1 text-small text-secondary-foreground">
                  wildfirechat.cn
                  <AppIcon name="ion:ios-arrow-right" :size="14" />
                </span>
              </button>
              <button
                type="button"
                class="flex h-12 w-full items-center justify-between text-left"
                @click="showToast('隐私政策已是最新版本')"
              >
                <span class="text-label text-foreground">隐私政策</span>
                <span class="inline-flex items-center gap-1 text-small text-secondary-foreground">
                  查看
                  <AppIcon name="ion:ios-arrow-right" :size="14" />
                </span>
              </button>
            </div>
          </div>
        </template>
      </div>
    </section>

    <!-- P22 修改密码 -->
    <ChangePasswordDialog
      :visible="showChangePassword"
      @close="showChangePassword = false"
      @submit="submitChangePassword"
      @forgot="forgotPassword"
    />

    <!-- P23 重置密码 -->
    <ResetPasswordDialog
      :visible="showResetPassword"
      @close="showResetPassword = false"
      @submit="submitResetPassword"
    />

    <!-- P15-04/05 我的二维码 -->
    <GroupQrDialog
      :visible="showQr"
      mode="self"
      :name="nickname"
      hint="用野火IM扫码添加我为好友"
      value="starrysky://user/linxiao"
      @close="showQr = false"
      @toast="showToast"
    />

    <!-- P15-02 头像裁剪 -->
    <AvatarCropDialog
      :visible="showCrop"
      :name="nickname"
      :current="avatarIndex"
      @close="showCrop = false"
      @confirm="applyAvatar"
    />

    <!-- P15-08 选项选择 -->
    <OptionPickerDialog
      :visible="showLanguage"
      title="选择语言"
      :options="languages"
      :model-value="language"
      @close="showLanguage = false"
      @confirm="setLanguage"
    />
    <OptionPickerDialog
      :visible="showQuiet"
      title="免打扰时间"
      :options="quietOptions"
      :model-value="quiet"
      @close="showQuiet = false"
      @confirm="setQuiet"
    />
    <OptionPickerDialog
      :visible="showDevices"
      title="登录设备"
      :options="devices"
      :model-value="devices[0]"
      @close="showDevices = false"
      @confirm="showToast('设备管理已更新')"
    />

    <!-- P15-06 滑动验证 -->
    <SlideVerifyDialog :visible="showVerify" @close="showVerify = false" @verified="onVerified" />

    <ConfirmDialog
      :visible="showLogout"
      title="退出登录"
      description="退出后需要重新登录才能使用野火IM，确定退出吗？"
      confirm-text="退出登录"
      danger
      @cancel="showLogout = false"
      @confirm="logout"
    />

    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
