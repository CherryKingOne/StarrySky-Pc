<script setup lang="ts">
import { ref } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import AddMenu from '@renderer/components/AddMenu.vue'

withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    showAdd?: boolean
  }>(),
  { modelValue: '', placeholder: '搜索', showAdd: true }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  add: [key: string]
}>()

const addButton = ref<HTMLButtonElement | null>(null)
const showAddMenu = ref(false)

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}

function openAddMenu(): void {
  showAddMenu.value = true
}

function onAddMenuSelect(key: string): void {
  showAddMenu.value = false
  emit('add', key)
}

function focus(): void {
  const input = document.querySelector<HTMLInputElement>('.search-input')
  input?.focus()
}

defineExpose({ focus })
</script>

<template>
  <div class="flex h-[60px] w-panel shrink-0 items-center gap-1 bg-panel px-2">
    <div class="app-field flex h-[25px] w-[209px] items-center gap-1.5">
      <AppIcon name="ion:search" :size="14" class="shrink-0 text-placeholder-foreground" />
      <input
        class="search-input h-full w-full bg-transparent text-small text-foreground outline-none placeholder:text-placeholder-foreground"
        :placeholder="placeholder"
        :value="modelValue"
        @input="onInput"
      />
    </div>
    <button
      v-if="showAdd"
      ref="addButton"
      type="button"
      class="icon-button shrink-0 h-7 w-7 rounded-md text-icon"
      title="更多"
      @click="openAddMenu"
    >
      <AppIcon name="ion:android-add" :size="16" />
    </button>

    <AddMenu
      v-if="showAdd"
      v-model:visible="showAddMenu"
      :anchor="addButton"
      @select="onAddMenuSelect"
    />
  </div>
</template>
