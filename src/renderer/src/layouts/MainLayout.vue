<script setup lang="ts">
import { RouterView } from 'vue-router'
import Sidebar from '@renderer/components/Sidebar.vue'
</script>

<template>
  <div class="flex h-full w-full">
    <Sidebar />
    <RouterView v-slot="{ Component }">
      <component :is="Component" class="min-w-0 flex-1" />
    </RouterView>
  </div>
</template>
