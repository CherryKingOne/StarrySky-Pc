<script setup lang="ts">
import { RouterLink, useRoute } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import BadgeDigit from '@renderer/components/BadgeDigit.vue'
import { useConversationsStore } from '@renderer/stores/conversations'

const route = useRoute()
const store = useConversationsStore()

const items = [
  { key: 'chats', label: '会话', to: '/chats', icon: 'ion:chatboxes' },
  { key: 'contacts', label: '通讯录', to: '/contacts', icon: 'ion:android-contact' },
  { key: 'favorites', label: '收藏', to: '/favorites', icon: 'ion:ios-star' },
  { key: 'ai', label: 'AI 助手', to: '/ai', icon: 'ion:code-working' }
]

function isActive(to: string): boolean {
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <aside class="flex h-full w-sidebar shrink-0 flex-col items-center bg-sidebar">
    <div class="mt-[68px]">
      <Avatar name="林" :index="1" :size="36" />
    </div>

    <nav class="mt-4 flex flex-col items-center gap-8">
      <RouterLink
        v-for="item in items"
        :key="item.key"
        :to="item.to"
        :title="item.label"
        class="relative flex h-8 w-8 items-center justify-center transition-colors"
        :class="isActive(item.to) ? 'text-accent' : 'text-icon hover:text-foreground'"
      >
        <AppIcon :name="item.icon" :size="24" />
        <BadgeDigit
          v-if="item.key === 'chats' && store.totalUnread > 0"
          :count="store.totalUnread"
          class="absolute -top-1 -right-1"
        />
      </RouterLink>
    </nav>

    <div class="mt-auto mb-[68px] flex flex-col items-center gap-8">
      <RouterLink
        to="/settings"
        title="设置"
        class="flex h-8 w-8 items-center justify-center text-icon transition-colors hover:text-foreground"
      >
        <AppIcon name="ion:navicon-round" :size="24" />
      </RouterLink>
    </div>
  </aside>
</template>
