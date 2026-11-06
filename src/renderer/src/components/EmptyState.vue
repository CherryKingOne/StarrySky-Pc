<script setup lang="ts">
import AppIcon from '@renderer/components/AppIcon.vue'

withDefaults(defineProps<{ title?: string; hint?: string }>(), {
  title: '暂无数据',
  hint: '从左侧选择一项查看详情'
})
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 text-center">
    <AppIcon name="ion:chatbubbles" :size="40" class="text-icon" />
    <p class="text-label text-foreground">{{ title }}</p>
    <p class="text-caption text-tertiary-foreground">{{ hint }}</p>
  </div>
</template>
