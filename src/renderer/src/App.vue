<script setup lang="ts">
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import { useAppStore } from '@renderer/stores/app'

const app = useAppStore()

watch(
  () => app.theme,
  (theme) => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  },
  { immediate: true }
)
</script>

<template>
  <!-- 主窗口直接铺满整个可视区，页面切换不做过渡，避免动画卡住导致点击无响应 -->
  <div class="app-window flex h-full w-full">
    <RouterView />
  </div>
</template>
