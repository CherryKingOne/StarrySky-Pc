<script setup lang="ts">
import IconButton from '@renderer/components/IconButton.vue'

withDefaults(defineProps<{ title: string; subtitle: string; pinned?: boolean }>(), {
  pinned: false
})

const emit = defineEmits<{ search: []; pin: []; settings: [] }>()
</script>

<template>
  <header
    class="flex h-header w-full shrink-0 items-center border-b border-divider bg-panel px-5"
  >
    <div class="min-w-0 flex-1">
      <h2 class="truncate text-section text-foreground">{{ title }}</h2>
      <p class="truncate text-caption text-secondary-foreground">{{ subtitle }}</p>
    </div>
    <div class="flex shrink-0 items-center gap-1">
      <IconButton icon="ion:search" :size="20" @click="emit('search')" />
      <IconButton icon="ion:pin" :size="20" :active="pinned" @click="emit('pin')" />
      <IconButton icon="ion:ios-settings-strong" :size="20" @click="emit('settings')" />
    </div>
  </header>
</template>
