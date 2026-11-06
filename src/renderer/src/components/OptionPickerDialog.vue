<script setup lang="ts">
import { ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    options: string[]
    modelValue?: string
  }>(),
  { title: '选项选择', modelValue: '' }
)

const emit = defineEmits<{
  close: []
  confirm: [value: string]
}>()

const selected = ref(props.modelValue)

watch(
  () => [props.visible, props.modelValue],
  () => {
    if (props.visible) selected.value = props.modelValue
  },
  { immediate: true }
)

function confirm(): void {
  emit('confirm', selected.value)
  emit('close')
}
</script>

<template>
  <PopupDialog :visible="visible" :title="title" width="280px" @close="emit('close')">
    <div class="-mx-2 flex flex-col">
      <button
        v-for="option in options"
        :key="option"
        type="button"
        class="flex h-10 items-center justify-between rounded-sm px-2 text-left text-small transition-colors hover:bg-item-hover"
        :class="selected === option ? 'text-foreground' : 'text-secondary-foreground'"
        @click="selected = option"
      >
        <span class="truncate">{{ option }}</span>
        <AppIcon
          v-if="selected === option"
          name="ion:checkmark-round"
          :size="16"
          class="shrink-0 text-accent"
        />
      </button>
    </div>
    <template #footer>
      <button type="button" class="btn-primary h-9 px-6" @click="confirm">确定</button>
    </template>
  </PopupDialog>
</template>
