<script setup lang="ts">
import Avatar from '@renderer/components/Avatar.vue'

defineProps<{ name: string; index: number; desc: string }>()
</script>

<template>
  <div class="list-row h-row w-panel">
    <Avatar :name="name" :index="index" :size="36" :rounded="true" />
    <div class="min-w-0 flex-1">
      <p class="truncate text-base text-foreground">{{ name }}</p>
      <p class="truncate text-micro text-secondary-foreground">{{ desc }}</p>
    </div>
  </div>
</template>
