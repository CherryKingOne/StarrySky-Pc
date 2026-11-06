<script setup lang="ts">
import LoginCard from '@renderer/components/LoginCard.vue'
import { isLoginWindow } from '@renderer/utils/window'

/** 登录小窗：不画整页背景，只显示悬浮卡片；主窗口内的登录页保持原样 */
const compact = isLoginWindow()
</script>

<template>
  <div
    class="relative flex h-full w-full items-center justify-center"
    :class="compact ? 'p-2' : 'bg-background'"
  >
    <LoginCard :compact="compact" />
    <p
      v-if="!compact"
      class="pointer-events-none absolute bottom-12 text-caption text-tertiary-foreground"
    >
      野火IM · 连接你我，高效协同
    </p>
  </div>
</template>
