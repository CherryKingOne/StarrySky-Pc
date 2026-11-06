<script setup lang="ts">
import { RouterView } from 'vue-router'
import Sidebar from '@renderer/components/Sidebar.vue'
</script>

<template>
  <div class="flex h-full w-full">
    <Sidebar />
    <RouterView v-slot="{ Component }">
      <Transition name="page-fade" mode="out-in">
        <component :is="Component" class="flex-1 min-w-0" />
      </Transition>
    </RouterView>
  </div>
</template>
