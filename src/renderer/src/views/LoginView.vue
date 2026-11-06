<script setup lang="ts">
import LoginCard from '@renderer/components/LoginCard.vue'
</script>

<template>
  <!-- 登录卡片直接居中于主窗口，无画布背景 -->
  <div class="relative flex h-full w-full items-center justify-center bg-background">
    <LoginCard />
    <p class="pointer-events-none absolute bottom-12 text-caption text-tertiary-foreground">
      野火IM · 连接你我，高效协同
    </p>
  </div>
</template>
