<script setup lang="ts">
import AppIcon from '@renderer/components/AppIcon.vue'

withDefaults(defineProps<{ title?: string; hint?: string; icon?: string }>(), {
  title: '暂无数据',
  hint: '从左侧选择一项查看详情',
  icon: 'ion:chatbubbles'
})
</script>

<template>
  <div
    class="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
  >
    <AppIcon :name="icon" :size="40" class="text-icon" />
    <p class="text-label text-foreground">{{ title }}</p>
    <p class="text-caption text-tertiary-foreground">{{ hint }}</p>
  </div>
</template>
