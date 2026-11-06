<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'

const props = defineProps<{ visible: boolean }>()

const emit = defineEmits<{
  close: []
  submit: [password: string]
  forgot: []
}>()

const current = ref('')
const next = ref('')
const confirm = ref('')
const error = ref('')

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    current.value = ''
    next.value = ''
    confirm.value = ''
    error.value = ''
  }
)

const strength = computed(() => {
  const value = next.value
  if (!value) return 0
  let score = 0
  if (value.length >= 6) score += 1
  if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1
  if (value.length >= 10) score += 1
  return score
})

const strengthLabel = computed(() => ['未设置', '弱', '中', '强'][strength.value])

function submit(): void {
  error.value = ''
  if (!current.value.trim()) {
    error.value = '请输入当前密码'
    return
  }
  if (next.value.length < 6) {
    error.value = '新密码至少 6 位'
    return
  }
  if (next.value !== confirm.value) {
    error.value = '两次输入的新密码不一致'
    return
  }
  emit('submit', next.value)
}
</script>

<template>
  <PopupDialog
    :visible="visible"
    title="修改密码"
    subtitle="修改后需使用新密码登录其他设备"
    width="480px"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-4">
      <label class="flex flex-col gap-1.5">
        <span class="text-micro text-secondary-foreground">当前密码</span>
        <input
          v-model="current"
          type="password"
          class="app-field h-10 px-3 text-small"
          placeholder="输入当前密码"
        />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-micro text-secondary-foreground">新密码</span>
        <input
          v-model="next"
          type="password"
          class="app-field h-10 px-3 text-small"
          placeholder="至少 6 位"
        />
        <span class="flex items-center gap-2">
          <span
            v-for="index in 3"
            :key="index"
            class="h-1 flex-1 rounded-full"
            :class="index <= strength ? 'bg-accent' : 'bg-item-hover'"
          />
          <span class="w-8 shrink-0 text-right text-micro text-tertiary-foreground">{{
            strengthLabel
          }}</span>
        </span>
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-micro text-secondary-foreground">确认新密码</span>
        <input
          v-model="confirm"
          type="password"
          class="app-field h-10 px-3 text-small"
          placeholder="再次输入新密码"
        />
      </label>

      <p v-if="error" class="rounded-sm bg-danger/10 px-2 py-1.5 text-micro text-danger">
        {{ error }}
      </p>

      <button
        type="button"
        class="inline-flex w-fit items-center gap-1 text-micro text-link transition-colors hover:text-link-hover"
        @click="emit('forgot')"
      >
        <AppIcon name="ion:help-circle-outline" :size="12" />
        忘记当前密码？通过手机号重置
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
      <button type="button" class="btn-primary h-9 px-5" @click="submit">确认修改</button>
    </template>
  </PopupDialog>
</template>
