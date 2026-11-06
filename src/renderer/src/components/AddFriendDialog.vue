<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'

const props = defineProps<{ visible: boolean }>()

const emit = defineEmits<{
  close: []
  sent: [name: string]
}>()

const keyword = ref('linxiao')
const message = ref('你好，我是野火科技的同事，申请添加你为好友')
const searched = ref(false)

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      keyword.value = ''
      searched.value = false
      message.value = '你好，我是野火科技的同事，申请添加你为好友'
    }
  }
)

const result = computed(() => {
  if (!searched.value || !keyword.value.trim()) return null
  return {
    name: '林晓',
    index: 1,
    account: keyword.value.trim(),
    desc: '产品经理 · 产品中心'
  }
})

function search(): void {
  searched.value = keyword.value.trim().length > 0
}

function send(): void {
  if (!result.value) return
  emit('sent', result.value.name)
  emit('close')
}
</script>

<template>
  <PopupDialog
    :visible="visible"
    title="添加好友"
    subtitle="通过手机号 / 邮箱 / 野火ID 查找"
    width="420px"
    @close="emit('close')"
  >
    <div class="flex gap-2">
      <div class="app-field flex h-9 flex-1 items-center px-2">
        <input
          v-model="keyword"
          class="h-full w-full bg-transparent text-small text-foreground outline-none placeholder:text-placeholder-foreground"
          placeholder="输入账号查找"
          @keydown.enter.prevent="search"
        />
      </div>
      <button type="button" class="btn-primary h-9 w-20" @click="search">查找</button>
    </div>

    <div v-if="result" class="mt-4 rounded-md border border-border-soft p-3">
      <div class="flex items-center gap-3">
        <Avatar :name="result.name" :index="result.index" :size="40" />
        <div class="min-w-0">
          <p class="truncate text-label text-foreground">{{ result.name }}</p>
          <p class="truncate text-micro text-secondary-foreground">{{ result.desc }}</p>
          <p class="truncate text-micro text-tertiary-foreground">野火ID：{{ result.account }}</p>
        </div>
      </div>
      <textarea
        v-model="message"
        rows="2"
        class="app-field mt-3 w-full resize-none px-2 py-1.5 text-small"
        placeholder="填写验证信息"
      />
    </div>

    <div v-else-if="searched" class="mt-4 flex flex-col items-center gap-2 py-6">
      <AppIcon name="ion:search" :size="28" class="text-icon" />
      <p class="text-caption text-tertiary-foreground">未找到该账号，换个关键字试试</p>
    </div>
    <p v-else class="mt-4 text-micro text-tertiary-foreground">
      提示：演示环境输入任意账号并点击「查找」即可返回示例结果。
    </p>

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
        :disabled="!result"
        @click="send"
      >
        发送申请
      </button>
    </template>
  </PopupDialog>
</template>
