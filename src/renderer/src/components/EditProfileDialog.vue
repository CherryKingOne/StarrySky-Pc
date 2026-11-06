<script setup lang="ts">
import { ref, watch } from 'vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    nickname?: string
    signature?: string | null
    gender?: number
  }>(),
  { nickname: '', signature: '', gender: 0 }
)

const emit = defineEmits<{
  close: []
  save: [payload: { nickname: string; signature: string; gender: number }]
}>()

const nickname = ref(props.nickname)
const signature = ref(props.signature ?? '')
const gender = ref(props.gender ?? 0)
const saving = ref(false)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    nickname.value = props.nickname
    signature.value = props.signature ?? ''
    gender.value = props.gender ?? 0
    saving.value = false
  }
)

function submit(): void {
  const name = nickname.value.trim()
  if (!name) return
  saving.value = true
  emit('save', { nickname: name, signature: signature.value.trim(), gender: gender.value })
}
</script>

<template>
  <PopupDialog
    :visible="visible"
    title="编辑资料"
    subtitle="昵称、个性签名与性别会同步到服务端"
    width="400px"
    @close="emit('close')"
  >
    <label class="mb-1 block text-micro text-secondary-foreground">昵称</label>
    <input v-model="nickname" class="app-field h-9 w-full px-2 text-small" maxlength="32" />

    <label class="mt-3 mb-1 block text-micro text-secondary-foreground">个性签名</label>
    <textarea
      v-model="signature"
      rows="2"
      class="app-field w-full resize-none px-2 py-1.5 text-small"
      maxlength="128"
    />

    <label class="mt-3 mb-1 block text-micro text-secondary-foreground">性别</label>
    <div class="flex gap-2">
      <button
        v-for="option in [
          { value: 0, label: '未知' },
          { value: 1, label: '男' },
          { value: 2, label: '女' }
        ]"
        :key="option.value"
        type="button"
        class="h-8 flex-1 rounded-sm border text-small transition-colors"
        :class="
          gender === option.value
            ? 'border-accent bg-conv-active text-accent'
            : 'border-border bg-input text-foreground hover:bg-item-hover'
        "
        @click="gender = option.value"
      >
        {{ option.label }}
      </button>
    </div>

    <template #footer>
      <button
        type="button"
        class="inline-flex h-9 items-center justify-center rounded-sm border border-border bg-input px-4 text-label text-foreground transition-colors hover:bg-item-hover"
        @click="emit('close')"
      >
        取消
      </button>
      <button
        type="button"
        class="btn-primary h-9 px-4 disabled:opacity-50"
        :disabled="!nickname.trim() || saving"
        @click="submit"
      >
        保存
      </button>
    </template>
  </PopupDialog>
</template>
