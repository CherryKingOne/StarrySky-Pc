<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ modelValue?: boolean }>(), { modelValue: false })
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const checked = computed(() => props.modelValue)

function toggle(): void {
  emit('update:modelValue', !checked.value)
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="checked"
    class="relative h-5 w-10 shrink-0 rounded-full transition-colors"
    :class="checked ? 'bg-accent' : 'bg-item-top'"
    @click.stop="toggle"
  >
    <span
      class="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform"
      :class="{ 'translate-x-5': checked }"
    />
  </button>
</template>
