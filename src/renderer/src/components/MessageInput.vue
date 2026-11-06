<script setup lang="ts">
import { nextTick, ref } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'

const emit = defineEmits<{ send: [text: string] }>()

const text = ref('')
const editor = ref<HTMLTextAreaElement | null>(null)

const leftTools = [
  'ion:ios-heart',
  'ion:ios-attach',
  'ion:scissors',
  'ion:chatboxes',
  'ion:ios-radio-button-on',
  'ion:ios-mic',
  'ion:ios-list',
  'ion:stats-bars'
]

const rightTools = ['ion:ios-call', 'ion:ios-videocam', 'ion:desktop', 'ion:ios-menu']

function submit(): void {
  const value = text.value.trim()
  if (!value) return
  emit('send', value)
  text.value = ''
  nextTick(() => editor.value?.focus())
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    submit()
  }
}
</script>

<template>
  <section class="flex h-input w-full shrink-0 flex-col bg-tertiary">
    <div class="mx-3 h-px bg-border-strong" />

    <div class="flex items-center px-2 pt-2 overflow-hidden">
      <div class="flex items-center gap-0.5">
        <button
          v-for="icon in leftTools"
          :key="icon"
          type="button"
          class="icon-button h-10 w-10 shrink-0 rounded-sm"
          :title="icon"
        >
          <AppIcon :name="icon" :size="20" />
        </button>
      </div>
      <div class="ml-auto flex items-center gap-0.5">
        <button
          v-for="icon in rightTools"
          :key="icon"
          type="button"
          class="icon-button h-10 w-10 shrink-0 rounded-sm"
          :title="icon"
        >
          <AppIcon :name="icon" :size="20" />
        </button>
      </div>
    </div>

    <textarea
      ref="editor"
      v-model="text"
      rows="4"
      class="mt-2 w-full resize-none bg-transparent px-5 text-base text-foreground outline-none placeholder:text-placeholder-foreground"
      placeholder="Enter 发送，Ctrl+Enter 换行"
      @keydown="onKeydown"
    />

    <div class="flex items-center justify-end gap-3 px-3 pb-3">
      <span class="text-micro text-time-foreground">Enter 发送，Ctrl+Enter 换行</span>
      <button type="button" class="btn-primary h-[30px] w-[72px]" @click="submit">发送</button>
    </div>
  </section>
</template>
