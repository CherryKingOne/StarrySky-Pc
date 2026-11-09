<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import AvatarCropDialog from '@renderer/components/AvatarCropDialog.vue'
import BlacklistPanel from '@renderer/components/BlacklistPanel.vue'
import BotDirectory from '@renderer/components/BotDirectory.vue'
import ChangePasswordDialog from '@renderer/components/ChangePasswordDialog.vue'
import EditProfileDialog from '@renderer/components/EditProfileDialog.vue'
import ConfirmDialog from '@renderer/components/ConfirmDialog.vue'
import GroupQrDialog from '@renderer/components/GroupQrDialog.vue'
import OptionPickerDialog from '@renderer/components/OptionPickerDialog.vue'
import ResetPasswordForm from '@renderer/components/ResetPasswordForm.vue'
import SlideVerifyDialog from '@renderer/components/SlideVerifyDialog.vue'
import SwitchToggle from '@renderer/components/SwitchToggle.vue'
import Toast from '@renderer/components/Toast.vue'
import { settingsNavs } from '@renderer/data/mock'
import { logoutSession } from '@renderer/api/auth'
import { getAgent, updateAgent } from '@renderer/api/agents'
import { getCurrentUser, updateCurrentUser } from '@renderer/api/users'
import { uploadFile } from '@renderer/api/files'
import { useAgentsStore } from '@renderer/stores/agents'
import { useAppStore } from '@renderer/stores/app'
import { useConversationsStore } from '@renderer/stores/conversations'
import { avatarIndexOf } from '@renderer/utils/chat'
import {
  focusMainWindow,
  hasElectron,
  isAgentWindow,
  sendWindowAction
} from '@renderer/utils/window'

const router = useRouter()
const app = useAppStore()
const agents = useAgentsStore()
const conversations = useConversationsStore()

const activeNav = ref('account')
const toastMessage = ref('')

const showChangePassword = ref(false)
const showResetPage = ref(false)
const showQr = ref(false)
const showCrop = ref(false)
const showLogout = ref(false)
const showLanguage = ref(false)
const showQuiet = ref(false)
const showDevices = ref(false)
const showVerify = ref(false)
const showProfileEdit = ref(false)
const showDisableAgent = ref(false)
const showDeleteAgent = ref(false)
const agentBusy = ref(false)
const avatarInput = ref<HTMLInputElement | null>(null)
const uploadingAvatar = ref(false)

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
const userId = computed(() => app.user?.userId ?? '')
const phone = computed(() => app.phone)
const userSignature = computed(() => app.user?.signature ?? '')
const userGender = computed(() => app.user?.gender ?? 0)
const userAvatarUrl = computed(() => app.user?.avatarUrl ?? null)
const resetChannel = computed<'phone' | 'email'>(() =>
  phone.value.includes('@') ? 'email' : 'phone'
)
const resetChannelLabel = computed(() => (resetChannel.value === 'phone' ? '手机号' : '邮箱'))
const language = computed(() => app.language)
const quiet = computed(() => notifications.quiet)

/** Agent 身份派生数据：设置页整体跟随当前身份 */
const actingAgent = computed(() => app.actingAgent)
const isAgent = computed(() => Boolean(actingAgent.value))
const agentId = computed(() => app.actingAgent?.agentId ?? '')
const agentNickname = computed(() => app.actingAgent?.nickname ?? '')
const agentAvatarUrl = computed(() => app.actingAgent?.avatarUrl ?? null)
const agentAvatarIndex = computed(() => avatarIndexOf(agentNickname.value))
const agentSignature = computed(() => app.actingAgent?.signature ?? '')
const agentGender = computed(() => app.actingAgent?.gender ?? 0)
const agentOwnerId = computed(() => app.actingAgent?.userId ?? '')
const agentStatusText = computed(() => {
  const status = app.actingAgent?.status
  if (status === 'ACTIVE') return '正常'
  if (status === 'DISABLED') return '已停用'
  if (status === 'DELETED') return '已删除'
  return '—'
})
const agentCreatedAt = computed(() => formatAgentStamp(app.actingAgent?.createdAt))

function formatAgentStamp(value: string | null | undefined): string {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 16)
}

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
  showToast('头像底色已更新（本地）')
}

function pickAvatar(): void {
  avatarInput.value?.click()
}

async function openSelfChat(): Promise<void> {
  try {
    await conversations.openWithSelf()
    void router.push('/chats')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '打开会话失败')
  }
}

async function copyAccountId(): Promise<void> {
  if (!userId.value) {
    showToast('当前账号暂无 ID')
    return
  }
  try {
    await navigator.clipboard.writeText(userId.value)
    showToast('用户 ID 已复制到剪贴板')
  } catch {
    showToast('复制失败，请手动选择 ID 文本')
  }
}

async function copyAgentId(): Promise<void> {
  if (!agentId.value) {
    showToast('当前 Agent 暂无 ID')
    return
  }
  try {
    await navigator.clipboard.writeText(agentId.value)
    showToast('Agent ID 已复制到剪贴板')
  } catch {
    showToast('复制失败，请手动选择 ID 文本')
  }
}

async function onAvatarFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !app.accessToken) return
  if (isAgent.value && agents.demo) {
    showToast('离线示例身份不支持上传头像')
    return
  }
  uploadingAvatar.value = true
  try {
    const info = await uploadFile(app.accessToken, file, 1)
    if (isAgent.value) {
      const agent = app.actingAgent
      if (!agent) return
      const next = await updateAgent(app.accessToken, agent.agentId, { avatarUrl: info.url })
      agents.applyAgent(next)
      showToast('Agent 头像已上传并保存')
    } else {
      const user = await updateCurrentUser(app.accessToken, { avatarUrl: info.url })
      app.updateUser(user)
      showToast('头像已上传并保存')
    }
  } catch (error) {
    showToast(error instanceof Error ? error.message : '头像上传失败')
  } finally {
    uploadingAvatar.value = false
  }
}

async function saveProfile(payload: {
  nickname: string
  signature: string
  gender: number
}): Promise<void> {
  if (isAgent.value) {
    await saveAgentProfile(payload)
    return
  }
  if (!app.accessToken) return
  try {
    const user = await updateCurrentUser(app.accessToken, payload)
    app.updateUser(user)
    showProfileEdit.value = false
    showToast('资料已保存')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '资料保存失败')
  }
}

/** Agent 资料：真实后端走 Agent Token，离线示例走本地 store */
async function saveAgentProfile(payload: {
  nickname: string
  signature: string
  gender: number
}): Promise<void> {
  const agent = app.actingAgent
  if (!agent) return
  try {
    if (agents.demo) {
      await agents.update(agent.agentId, payload)
    } else {
      const next = await updateAgent(app.accessToken, agent.agentId, payload)
      agents.applyAgent(next)
    }
    showProfileEdit.value = false
    showToast('Agent 资料已保存')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '资料保存失败')
  }
}

function goAgentPermissions(): void {
  if (!agentId.value) return
  void router.push(`/agents/${encodeURIComponent(agentId.value)}/permissions`)
}

function switchBackToUser(): void {
  // Agent 身份运行在独立窗口，切回用户即聚焦用户主窗口
  focusMainWindow()
  showToast('已切换到用户账号窗口')
}

/** Agent 被停用/删除后，关闭当前 Agent 窗口回到用户主窗口 */
function closeAgentWindowIfNeeded(): void {
  if (!isAgentWindow()) return
  focusMainWindow()
  if (hasElectron()) sendWindowAction('window:close')
}

async function disableAgent(): Promise<void> {
  showDisableAgent.value = false
  const agent = app.actingAgent
  if (!agent || agentBusy.value) return
  agentBusy.value = true
  try {
    await agents.setStatus(agent.agentId, 'DISABLED')
    showToast('Agent 已停用')
    closeAgentWindowIfNeeded()
    void router.push('/chats')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '停用 Agent 失败')
  } finally {
    agentBusy.value = false
  }
}

async function deleteAgent(): Promise<void> {
  showDeleteAgent.value = false
  const agent = app.actingAgent
  if (!agent || agentBusy.value) return
  agentBusy.value = true
  try {
    await agents.remove(agent.agentId)
    showToast('Agent 已删除')
    closeAgentWindowIfNeeded()
    void router.push('/chats')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '删除 Agent 失败')
  } finally {
    agentBusy.value = false
  }
}

function submitChangePassword(): void {
  showChangePassword.value = false
  showToast('密码修改成功')
}

function forgotPassword(): void {
  showChangePassword.value = false
  showResetPage.value = true
}

function submitResetPassword(): void {
  showResetPage.value = false
  showToast('密码已重置，请使用新密码登录')
}

function selectNav(key: string): void {
  showResetPage.value = false
  activeNav.value = key
}

function onVerified(): void {
  showToast('安全验证已通过')
}

const isDark = computed(() => app.theme === 'dark')
const navTitle = computed(() => {
  if (showResetPage.value) return '找回密码'
  return settingsNavs.find((item) => item.key === activeNav.value)?.label ?? '设置'
})

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

/** Agent 身份下后端没有对应能力的账号与安全项 */
const agentUnavailableRows = [
  { label: '登录账号', reason: 'Agent 没有独立登录账号，由归属的人类账号管理' },
  { label: '登录密码', reason: 'Agent 无独立密码体系，不可修改' },
  { label: '密码重置', reason: 'Agent 不支持密码重置，由归属账号处理' },
  { label: '多端登录', reason: 'Agent 无多端会话管理接口' },
  { label: '安全验证', reason: 'Agent 无安全验证接口' },
  { label: '登录设备', reason: 'Agent 无设备管理接口' }
]

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

async function logout(): Promise<void> {
  showLogout.value = false
  if (app.accessToken) await logoutSession(app.accessToken).catch(() => undefined)
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

onMounted(async () => {
  if (!app.accessToken) return
  // Agent 身份：用 Agent Token 刷新该 Agent 自己的资料
  if (app.actingAgent) {
    if (agents.demo) return
    try {
      const agent = await getAgent(app.accessToken, app.actingAgent.agentId)
      agents.applyAgent(agent)
    } catch {
      /* 拉取失败时沿用切换身份时的资料 */
    }
    return
  }
  try {
    const user = await getCurrentUser(app.accessToken)
    app.updateUser(user)
  } catch {
    /* 资料拉取失败不影响设置页 */
  }
})
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
          @click="selectNav(item.key)"
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
          v-if="!isAgent"
          type="button"
          class="flex h-9 items-center gap-2 rounded-md px-4 text-label text-danger transition-colors hover:bg-item-hover"
          @click="showLogout = true"
        >
          <AppIcon name="ion:log-out" :size="16" />
          退出登录
        </button>
        <button
          v-else
          type="button"
          class="flex h-9 items-center gap-2 rounded-md px-4 text-label text-muted-foreground transition-colors hover:bg-item-hover hover:text-foreground"
          @click="switchBackToUser"
        >
          <AppIcon name="ion:person" :size="16" />
          切回用户账号
        </button>
      </div>
    </nav>

    <!-- 内容区 -->
    <section class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-[60px] shrink-0 items-center justify-between px-6">
        <div class="flex min-w-0 items-center gap-2">
          <button
            v-if="showResetPage"
            v-tooltip="'返回账号与安全'"
            type="button"
            class="icon-button h-8 w-8 rounded-md"
            @click="showResetPage = false"
          >
            <AppIcon name="ion:ios-arrow-back" :size="18" />
          </button>
          <h3 class="truncate text-section text-foreground">{{ navTitle }}</h3>
        </div>
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
        <!-- P23 找回密码（页面） -->
        <template v-if="showResetPage">
          <p class="mb-4 text-caption text-secondary-foreground">
            通过{{ resetChannelLabel }}验证码重置登录密码，验证码 5 分钟内有效。
          </p>
          <div class="max-w-[440px]">
            <ResetPasswordForm
              :channel="resetChannel"
              :initial-identifier="phone"
              @done="submitResetPassword"
            />
          </div>
        </template>

        <!-- 账号与安全 -->
        <template v-else-if="activeNav === 'account'">
          <!-- Agent 身份：该 Agent 自己的账号与安全 -->
          <template v-if="isAgent">
            <div class="flex items-center gap-4 rounded-lg bg-panel p-4">
              <button
                v-tooltip="agents.demo ? '离线示例身份不支持上传头像' : '修改头像'"
                type="button"
                class="relative shrink-0"
                :disabled="agents.demo"
                @click="pickAvatar"
              >
                <Avatar
                  :name="agentNickname"
                  :index="agentAvatarIndex"
                  :avatar-url="agentAvatarUrl"
                  :size="40"
                />
                <span
                  class="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-on-accent"
                >
                  <AppIcon name="ion:android-create" :size="10" />
                </span>
              </button>
              <div class="min-w-0 flex-1">
                <p class="flex items-center gap-2 text-label text-foreground">
                  {{ agentNickname }}
                  <span class="rounded-sm bg-accent-subtle px-1.5 py-0.5 text-micro text-accent">
                    Agent
                  </span>
                </p>
                <button
                  v-tooltip="'点击复制 Agent ID'"
                  type="button"
                  class="mt-0.5 inline-flex items-center gap-1 font-mono text-micro text-secondary-foreground transition-colors hover:text-accent"
                  @click="copyAgentId"
                >
                  Agent ID: {{ agentId }}
                  <AppIcon name="ion:copy-outline" :size="11" />
                </button>
              </div>
              <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  class="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
                  @click="showProfileEdit = true"
                >
                  <AppIcon name="ion:android-create" :size="14" />
                  编辑资料
                </button>
                <button
                  type="button"
                  class="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover disabled:opacity-50"
                  :disabled="uploadingAvatar || agents.demo"
                  @click="pickAvatar"
                >
                  <AppIcon name="ion:ios-cloud-upload" :size="14" />
                  {{ uploadingAvatar ? '上传中' : '上传头像' }}
                </button>
                <button
                  type="button"
                  class="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
                  @click="goAgentPermissions"
                >
                  <AppIcon name="ion:shield-checkmark" :size="14" />
                  聊天白名单
                </button>
              </div>
            </div>
            <p v-if="agents.demo" class="mt-2 text-micro text-tertiary-foreground">
              离线示例身份下头像上传不可用；昵称、签名等资料仍可在本地保存。
            </p>

            <div class="mt-4 flex flex-col">
              <div class="flex h-14 items-center justify-between border-b border-divider">
                <span class="text-label text-foreground">归属账号</span>
                <span class="max-w-[60%] break-all text-right text-small text-secondary-foreground">
                  {{ agentOwnerId || '—' }}
                </span>
              </div>
              <div class="flex h-14 items-center justify-between border-b border-divider">
                <span class="text-label text-foreground">创建时间</span>
                <span class="text-small text-secondary-foreground">{{ agentCreatedAt }}</span>
              </div>
              <div class="flex h-14 items-center justify-between border-b border-divider">
                <span class="text-label text-foreground">状态</span>
                <span class="text-small text-secondary-foreground">{{ agentStatusText }}</span>
              </div>
              <div class="flex h-14 items-center justify-between">
                <span class="text-label text-foreground">聊天白名单</span>
                <button
                  type="button"
                  class="text-small text-link hover:text-link-hover"
                  @click="goAgentPermissions"
                >
                  管理白名单
                </button>
              </div>
            </div>

            <div class="mt-5 flex flex-col">
              <p class="mb-1 text-micro text-tertiary-foreground">账号与安全</p>
              <div
                v-for="row in agentUnavailableRows"
                :key="row.label"
                class="flex min-h-14 items-center justify-between gap-4 border-b border-divider py-2"
              >
                <span class="shrink-0 text-label text-foreground">{{ row.label }}</span>
                <span class="max-w-[62%] text-right text-small text-tertiary-foreground">
                  {{ row.reason }}
                </span>
              </div>
            </div>
            <p class="mt-3 text-micro text-tertiary-foreground">
              Agent 使用短期令牌运行，登录与安全能力由归属的人类账号统一管理。
            </p>

            <div class="mt-5 flex gap-2">
              <button
                type="button"
                class="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border bg-input px-4 text-label text-foreground transition-colors hover:bg-item-hover disabled:opacity-50"
                :disabled="agentBusy"
                @click="showDisableAgent = true"
              >
                <AppIcon name="ion:pause-circle" :size="14" />
                停用 Agent
              </button>
              <button
                type="button"
                class="inline-flex h-9 items-center gap-1.5 rounded-sm px-4 text-label text-danger transition-colors hover:bg-item-hover disabled:opacity-50"
                :disabled="agentBusy"
                @click="showDeleteAgent = true"
              >
                <AppIcon name="ion:trash" :size="14" />
                删除 Agent
              </button>
            </div>
          </template>

          <!-- 用户身份：保持原样 -->
          <template v-else>
            <div class="flex items-center gap-4 rounded-lg bg-panel p-4">
              <button
                v-tooltip="'修改头像'"
                type="button"
                class="relative shrink-0"
                @click="showCrop = true"
              >
                <Avatar
                  :name="nickname"
                  :index="avatarIndex"
                  :avatar-url="userAvatarUrl"
                  :size="40"
                />
                <span
                  class="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-on-accent"
                >
                  <AppIcon name="ion:android-create" :size="10" />
                </span>
              </button>
              <div class="min-w-0 flex-1">
                <p class="text-label text-foreground">{{ nickname }}</p>
                <button
                  v-tooltip="'点击复制 ID'"
                  type="button"
                  class="mt-0.5 inline-flex items-center gap-1 text-micro text-secondary-foreground transition-colors hover:text-accent"
                  @click="copyAccountId"
                >
                  ID: {{ userId }}
                  <AppIcon name="ion:copy-outline" :size="11" />
                </button>
              </div>
              <div class="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  class="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
                  @click="openSelfChat"
                >
                  <AppIcon name="ion:chatboxes" :size="14" />
                  发消息给自己
                </button>
                <button
                  type="button"
                  class="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
                  @click="showProfileEdit = true"
                >
                  <AppIcon name="ion:android-create" :size="14" />
                  编辑资料
                </button>
                <button
                  type="button"
                  class="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover disabled:opacity-50"
                  :disabled="uploadingAvatar"
                  @click="pickAvatar"
                >
                  <AppIcon name="ion:ios-cloud-upload" :size="14" />
                  {{ uploadingAvatar ? '上传中' : '上传头像' }}
                </button>
                <button
                  type="button"
                  class="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
                  @click="showQr = true"
                >
                  <AppIcon name="ion:qr-code" :size="14" />
                  我的二维码
                </button>
              </div>
            </div>

            <div class="mt-4 flex flex-col">
              <div class="flex h-14 items-center justify-between border-b border-divider">
                <span class="text-label text-foreground">登录账号</span>
                <span class="text-small text-secondary-foreground">{{ phone || '未绑定' }}</span>
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
                  @click="showResetPage = true"
                >
                  通过{{ resetChannelLabel }}重置
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
        </template>

        <!-- 消息通知 -->
        <template v-else-if="activeNav === 'notifications'">
          <!-- Agent 身份：无通知接口，明确不可用 -->
          <template v-if="isAgent">
            <div
              class="mb-3 rounded-md border border-border bg-panel px-4 py-3 text-caption text-secondary-foreground"
            >
              Agent 暂无独立通知接口，以下设置不可用；通知由客户端与归属账号统一控制。
            </div>
            <div class="flex flex-col opacity-60">
              <div
                v-for="row in notificationRows"
                :key="row.key"
                class="flex h-14 items-center justify-between border-b border-divider"
              >
                <span class="text-label text-foreground">{{ row.label }}</span>
                <SwitchToggle :model-value="notifications[row.key]" disabled />
              </div>
              <div class="flex h-14 items-center justify-between border-b border-divider">
                <span class="text-label text-foreground">免打扰时间</span>
                <span class="text-small text-tertiary-foreground">{{ quiet }}（不可用）</span>
              </div>
              <div class="flex h-14 items-center justify-between">
                <span class="text-label text-foreground">通知音效</span>
                <span class="text-small text-tertiary-foreground">不可用</span>
              </div>
            </div>
            <p class="mt-3 text-micro text-tertiary-foreground">
              原因：后端没有 Agent 通知配置接口，不能为单个 Agent 保存通知偏好。
            </p>
          </template>

          <!-- 用户身份：保持原样 -->
          <template v-else>
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

        <!-- 机器人：只读目录，创建/删除只在开发者后台 -->
        <template v-else-if="activeNav === 'bots'">
          <BotDirectory v-if="!isAgent" />
          <div v-else class="rounded-lg bg-panel px-6 py-8 text-center">
            <AppIcon name="ion:hardware-chip" :size="28" class="text-tertiary-foreground" />
            <p class="mt-3 text-label text-foreground">Agent 身份下不可用</p>
            <p class="mt-1 text-caption text-secondary-foreground">
              机器人目录属于归属的人类账号，Agent Token 没有该接口。
            </p>
          </div>
        </template>

        <!-- 黑名单 -->
        <template v-else-if="activeNav === 'blacklist'">
          <BlacklistPanel v-if="!isAgent" />
          <div v-else class="rounded-lg bg-panel px-6 py-8 text-center">
            <AppIcon name="ion:ban" :size="28" class="text-tertiary-foreground" />
            <p class="mt-3 text-label text-foreground">Agent 身份下不可用</p>
            <p class="mt-1 text-caption text-secondary-foreground">
              后端没有 Agent 黑名单接口，黑名单由归属的人类账号管理。
            </p>
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

    <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="onAvatarFile" />

    <EditProfileDialog
      :visible="showProfileEdit"
      :nickname="isAgent ? agentNickname : nickname"
      :signature="isAgent ? agentSignature : userSignature"
      :gender="isAgent ? agentGender : userGender"
      @close="showProfileEdit = false"
      @save="saveProfile"
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

    <!-- Agent 停用 / 删除 -->
    <ConfirmDialog
      :visible="showDisableAgent"
      title="停用 Agent"
      :description="`停用后「${agentNickname}」将无法切换视角或收发消息，确定停用吗？`"
      confirm-text="停用"
      danger
      @cancel="showDisableAgent = false"
      @confirm="disableAgent"
    />
    <ConfirmDialog
      :visible="showDeleteAgent"
      title="删除 Agent"
      :description="`删除后不可恢复，聊天白名单与身份数据将一并失效。确定删除「${agentNickname}」吗？`"
      confirm-text="删除"
      danger
      @cancel="showDeleteAgent = false"
      @confirm="deleteAgent"
    />

    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
