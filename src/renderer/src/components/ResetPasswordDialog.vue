<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'

const props = defineProps<{ visible: boolean }>()

const emit = defineEmits<{
  close: []
  submit: [phone: string]
}>()

const phone = ref('13800008888')
const code = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')
const countdown = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

watch(
  () => props.visible,
  (visible) => {
    if (!visible) {
      if (timer) clearInterval(timer)
      timer = undefined
      countdown.value = 0
      return
    }
    code.value = ''
    password.value = ''
    confirm.value = ''
    error.value = ''
  }
)

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const codeText = computed(() => (countdown.value > 0 ? `${countdown.value}s 后重发` : '获取验证码'))

function sendCode(): void {
  if (!/^\d{6,}$/.test(phone.value.replace(/\s/g, ''))) {
    error.value = '请输入正确的手机号'
    return
  }
  error.value = ''
  countdown.value = 60
  code.value = '123456'
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0 && timer) {
      clearInterval(timer)
      timer = undefined
    }
  }, 1000)
}

function submit(): void {
  error.value = ''
  if (!phone.value.trim()) {
    error.value = '请输入手机号'
    return
  }
  if (code.value.length < 4) {
    error.value = '请输入收到的验证码'
    return
  }
  if (password.value.length < 6) {
    error.value = '新密码至少 6 位'
    return
  }
  if (password.value !== confirm.value) {
    error.value = '两次输入的新密码不一致'
    return
  }
  emit('submit', phone.value)
}
</script>

<template>
  <PopupDialog
    :visible="visible"
    title="重置密码"
    subtitle="通过手机号验证码重置登录密码"
    width="480px"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-4">
      <label class="flex flex-col gap-1.5">
        <span class="text-micro text-secondary-foreground">手机号</span>
        <input
          v-model="phone"
          class="app-field h-10 px-3 text-small"
          placeholder="输入绑定手机号"
        />
      </label>

      <div class="flex flex-col gap-1.5">
        <span class="text-micro text-secondary-foreground">验证码</span>
        <div class="flex gap-2">
          <input
            v-model="code"
            class="app-field h-10 flex-1 px-3 text-small"
            placeholder="6 位验证码"
          />
          <button
            type="button"
            class="h-10 w-[132px] shrink-0 rounded-sm border border-border bg-input text-small text-link transition-colors hover:bg-item-hover disabled:opacity-50"
            :disabled="countdown > 0"
            @click="sendCode"
          >
            {{ codeText }}
          </button>
        </div>
      </div>

      <label class="flex flex-col gap-1.5">
        <span class="text-micro text-secondary-foreground">新密码</span>
        <input
          v-model="password"
          type="password"
          class="app-field h-10 px-3 text-small"
          placeholder="至少 6 位"
        />
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
      <p class="text-micro text-tertiary-foreground">演示环境：点击获取验证码会自动填入 123456。</p>
    </div>

    <template #footer>
      <button
        type="button"
        class="inline-flex h-9 items-center justify-center rounded-sm border border-border bg-input px-4 text-label text-foreground transition-colors hover:bg-item-hover"
        @click="emit('close')"
      >
        取消
      </button>
      <button type="button" class="btn-primary h-9 px-5" @click="submit">重置密码</button>
    </template>
  </PopupDialog>
</template>
