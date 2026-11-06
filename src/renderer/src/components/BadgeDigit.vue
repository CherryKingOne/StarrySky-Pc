<script setup lang="ts">
defineProps<{ count: number }>()
</script>

<template>
  <div
    class="flex h-4 min-w-4 shrink-0 select-none items-center justify-center rounded-full bg-badge px-0.5 text-micro font-medium leading-none text-on-accent"
  >
    {{ count > 99 ? '99+' : count }}
  </div>
</template>
