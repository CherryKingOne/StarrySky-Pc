<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import IconButton from '@renderer/components/IconButton.vue'

withDefaults(
  defineProps<{ modelValue?: string; placeholder?: string; showAdd?: boolean }>(),
  { modelValue: '', placeholder: '搜索', showAdd: true }
)

const emit = defineEmits<{ 'update:modelValue': [value: string]; add: [] }>()
const focused = ref(false)
const input = ref<HTMLInputElement | null>(null)

function focus(): void {
  input.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="flex h-[60px] w-panel shrink-0 items-center gap-1 bg-panel px-2">
    <div
      class="flex h-[25px] w-[209px] items-center gap-1 rounded-sm border bg-input px-1.5"
      :class="focused ? 'border-accent' : 'border-border'"
    >
      <AppIcon name="ion:search" :size="14" class="shrink-0 text-placeholder-foreground" />
      <input
        ref="input"
        :value="modelValue"
        class="h-full w-full bg-transparent text-small text-foreground outline-none placeholder:text-placeholder-foreground"
        :placeholder="placeholder"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @focus="focused = true"
        @blur="focused = false"
      />
    </div>
    <IconButton v-if="showAdd" icon="ion:plus" :size="16" :box="28" @click="emit('add')" />
  </div>
</template>
