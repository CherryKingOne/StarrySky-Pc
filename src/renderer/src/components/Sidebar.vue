<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import BadgeDigit from '@renderer/components/BadgeDigit.vue'
import ConfirmDialog from '@renderer/components/ConfirmDialog.vue'
import ContextMenu, { type MenuItem } from '@renderer/components/ContextMenu.vue'
import GroupQrDialog from '@renderer/components/GroupQrDialog.vue'
import IdentitySwitchBadge from '@renderer/components/IdentitySwitchBadge.vue'
import Toast from '@renderer/components/Toast.vue'
import UserCardModal from '@renderer/components/UserCardModal.vue'
import { useAppStore } from '@renderer/stores/app'
import { useAgentsStore } from '@renderer/stores/agents'
import { useConversationsStore } from '@renderer/stores/conversations'
import { logoutSession } from '@renderer/api/auth'
import { avatarIndexOf } from '@renderer/utils/chat'
import { hasElectron, sendWindowAction } from '@renderer/utils/window'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const agents = useAgentsStore()
const store = useConversationsStore()

const showUserCard = ref(false)
const showQr = ref(false)
const showLogout = ref(false)
const showMoreMenu = ref(false)
const moreButton = ref<HTMLButtonElement | null>(null)
const toastMessage = ref('')

const nickname = computed(() => app.nickname)
const avatarIndex = computed(() => app.avatarIndex)
const userId = computed(() => app.user?.userId ?? '')
const totalUnread = computed(() => store.totalUnread)

/** Agent 身份下侧栏头像与名称同步切换 */
const actingAgent = computed(() => app.actingAgent)
const displayName = computed(() => actingAgent.value?.nickname ?? nickname.value)
const displayAvatarUrl = computed(() => actingAgent.value?.avatarUrl ?? app.user?.avatarUrl ?? null)
const displayAvatarIndex = computed(() =>
  actingAgent.value ? avatarIndexOf(actingAgent.value.nickname) : avatarIndex.value
)

const identityBadge = ref<InstanceType<typeof IdentitySwitchBadge> | null>(null)

function onAvatarClick(): void {
  if (actingAgent.value) {
    identityBadge.value?.open()
    return
  }
  showUserCard.value = true
}

onMounted(() => {
  if (!agents.loaded) void agents.load()
})

function openSettings(): void {
  void router.push('/settings')
}

function openSelfQr(): void {
  showUserCard.value = false
  showQr.value = true
}

async function openSelfChat(): Promise<void> {
  showUserCard.value = false
  try {
    await store.openWithSelf()
    void router.push('/chats')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '打开会话失败')
  }
}

function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}

function onCardSettings(): void {
  showUserCard.value = false
  openSettings()
}

const items = [
  { key: 'chats', label: '会话', to: '/chats', icon: 'ion:chatboxes' },
  { key: 'contacts', label: '通讯录', to: '/contacts', icon: 'ion:android-contact' },
  { key: 'favorites', label: '收藏', to: '/favorites', icon: 'ion:ios-star' },
  { key: 'ai', label: 'AI 助手', to: '/ai', icon: 'ion:code-working' }
]

const moreItems: MenuItem[] = [
  { key: 'workbench', label: '工作台', icon: 'ion:grid' },
  { key: 'files', label: '文件记录', icon: 'ion:folder' },
  { key: 'search', label: '聊天记录搜索', icon: 'ion:search' },
  { key: 'sep1', label: '', separator: true },
  { key: 'lock', label: '锁定应用', icon: 'ion:lock-closed' },
  { key: 'logout', label: '退出登录', icon: 'ion:log-out', danger: true }
]

function isActive(to: string): boolean {
  return route.path === to || route.path.startsWith(`${to}/`)
}

function onMoreSelect(key: string): void {
  switch (key) {
    case 'workbench':
      void router.push('/workbench')
      break
    case 'files':
      void router.push('/files')
      break
    case 'search':
      void router.push('/search')
      break
    case 'lock':
      app.lock()
      void router.push('/lock')
      break
    case 'logout':
      showLogout.value = true
      break
  }
}

async function logout(): Promise<void> {
  showLogout.value = false
  if (app.accessToken) await logoutSession(app.accessToken).catch(() => undefined)
  agents.$reset()
  app.logout()
  if (hasElectron()) {
    sendWindowAction('auth:logout')
    return
  }
  void router.push('/login')
}
</script>

<template>
  <aside class="flex h-full w-sidebar shrink-0 flex-col items-center bg-sidebar">
    <div class="relative mt-[68px]">
      <button
        v-tooltip="actingAgent ? '切换身份' : '我的资料'"
        type="button"
        class="block rounded-md transition-transform hover:scale-105"
        @click="onAvatarClick"
      >
        <Avatar
          :name="displayName.charAt(0)"
          :index="displayAvatarIndex"
          :avatar-url="displayAvatarUrl"
          :size="36"
        />
      </button>
      <IdentitySwitchBadge
        ref="identityBadge"
        class="absolute -right-1.5 -bottom-1.5"
        @toast="showToast"
      />
    </div>

    <nav class="mt-4 flex flex-col items-center gap-8">
      <RouterLink
        v-for="item in items"
        :key="item.key"
        v-tooltip="item.label"
        :to="item.to"
        class="relative flex h-8 w-8 items-center justify-center transition-colors"
        :class="isActive(item.to) ? 'text-accent' : 'text-icon hover:text-foreground'"
      >
        <AppIcon :name="item.icon" :size="24" />
        <BadgeDigit
          v-if="item.key === 'chats' && totalUnread > 0"
          :count="totalUnread"
          class="absolute -top-1 -right-1"
        />
      </RouterLink>
    </nav>

    <div class="mt-auto mb-[68px] flex flex-col items-center gap-6">
      <button
        ref="moreButton"
        v-tooltip="'更多'"
        type="button"
        class="flex h-8 w-8 items-center justify-center text-icon transition-colors hover:text-foreground"
        @click="showMoreMenu = true"
      >
        <AppIcon name="ion:ios-more" :size="24" />
      </button>
      <RouterLink
        v-tooltip="'设置'"
        to="/settings"
        class="flex h-8 w-8 items-center justify-center text-icon transition-colors hover:text-foreground"
      >
        <AppIcon name="ion:navicon-round" :size="24" />
      </RouterLink>
    </div>

    <!-- P15-12 侧栏更多菜单 -->
    <ContextMenu
      v-model:visible="showMoreMenu"
      :items="moreItems"
      :anchor="moreButton"
      @select="onMoreSelect"
    />

    <!-- P15-01 用户卡片 -->
    <UserCardModal
      :visible="showUserCard"
      :name="nickname"
      desc="产品经理"
      :avatar-index="avatarIndex"
      :avatar-url="app.user?.avatarUrl"
      :account-id="userId"
      self
      @close="showUserCard = false"
      @start-chat="openSelfChat"
      @qr="openSelfQr"
      @settings="onCardSettings"
    />

    <!-- 我的二维码 -->
    <GroupQrDialog
      :visible="showQr"
      mode="self"
      :name="nickname"
      hint="用野火IM扫码添加我为好友"
      value="starrysky://user/linxiao"
      @close="showQr = false"
      @toast="showToast"
    />

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
  </aside>
</template>
