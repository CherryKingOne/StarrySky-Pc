<script setup lang="ts">
import { Icon } from '@iconify/vue'

withDefaults(defineProps<{ name: string; size?: number }>(), { size: 20 })
</script>

<template>
  <Icon :icon="name" :width="size" :height="size" aria-hidden="true" />
</template>
