<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'
import { useContactsStore } from '@renderer/stores/contacts'
import { useAppStore } from '@renderer/stores/app'
import type { ContactEntry } from '@renderer/types'

const props = defineProps<{ visible: boolean }>()

const emit = defineEmits<{
  close: []
  sent: [name: string]
  selfChat: []
  toast: [message: string]
}>()

const contacts = useContactsStore()
const app = useAppStore()
const keyword = ref('')
const message = ref('你好，申请添加你为好友')
const searched = ref(false)
const loading = ref(false)
const selectedId = ref('')
const selfMatched = ref(false)

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      keyword.value = ''
      searched.value = false
      selectedId.value = ''
      selfMatched.value = false
      message.value = '你好，申请添加你为好友'
      void contacts.load()
    }
  }
)

const results = computed(() => contacts.searchResults)
const selected = computed(() => results.value.find((item) => item.id === selectedId.value) ?? null)
const isFriend = computed(() =>
  Boolean(selected.value?.userId && contacts.friendUserIds.has(selected.value.userId))
)

const isSelfKeyword = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return false
  const selfValues = [app.user?.userId, app.user?.username, app.phone]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
  return selfValues.includes(kw)
})

async function search(): Promise<void> {
  const kw = keyword.value.trim()
  if (!kw) {
    searched.value = false
    selfMatched.value = false
    return
  }
  // 搜索自己：后端会排除当前用户，这里直接给出「给自己发消息」入口
  if (isSelfKeyword.value) {
    searched.value = true
    selfMatched.value = true
    selectedId.value = ''
    return
  }
  selfMatched.value = false
  loading.value = true
  try {
    await contacts.searchUsers(kw)
    searched.value = true
    selectedId.value = contacts.searchResults[0]?.id ?? ''
  } catch (error) {
    emit('toast', error instanceof Error ? error.message : '搜索失败')
  } finally {
    loading.value = false
  }
}

async function send(): Promise<void> {
  if (!selected.value?.userId) return
  if (isFriend.value) {
    emit('toast', '对方已经是你的好友')
    return
  }
  try {
    await contacts.sendFriendRequest(
      selected.value.userId,
      message.value.trim() || '申请添加你为好友'
    )
    emit('sent', selected.value.name)
    emit('close')
  } catch (error) {
    emit('toast', error instanceof Error ? error.message : '好友申请发送失败')
  }
}

function selectResult(entry: ContactEntry): void {
  selectedId.value = entry.id
}

function startSelfChat(): void {
  emit('selfChat')
  emit('close')
}
</script>

<template>
  <PopupDialog
    :visible="visible"
    title="添加好友"
    subtitle="通过昵称 / 账号 / 手机号 / 邮箱 / 用户 ID 查找"
    width="440px"
    @close="emit('close')"
  >
    <div class="flex gap-2">
      <div class="app-field flex h-9 flex-1 items-center px-2">
        <input
          v-model="keyword"
          class="h-full w-full bg-transparent text-small text-foreground outline-none placeholder:text-placeholder-foreground"
          placeholder="输入昵称、账号、手机号、邮箱或用户 ID"
          @keydown.enter.prevent="search"
        />
      </div>
      <button type="button" class="btn-primary h-9 w-20" :disabled="loading" @click="search">
        {{ loading ? '查找中' : '查找' }}
      </button>
    </div>

    <div v-if="selfMatched" class="mt-4 rounded-md border border-border-soft bg-panel p-3">
      <div class="flex items-center gap-3">
        <Avatar
          :name="app.nickname || '我'"
          :index="app.avatarIndex"
          :avatar-url="app.user?.avatarUrl"
          :size="40"
        />
        <div class="min-w-0 flex-1">
          <p class="text-label text-foreground">这是你自己</p>
          <p class="mt-0.5 text-micro text-secondary-foreground">
            不能添加自己为好友，但可以给自己发消息作为备忘或文件传输。
          </p>
        </div>
        <button
          type="button"
          class="btn-primary h-8 shrink-0 px-3 text-micro"
          @click="startSelfChat"
        >
          给自己发消息
        </button>
      </div>
    </div>

    <div v-else-if="results.length > 0" class="mt-3 max-h-[240px] space-y-1 overflow-y-auto">
      <button
        v-for="entry in results"
        :key="entry.id"
        type="button"
        class="flex w-full items-center gap-3 rounded-md border p-2 text-left transition-colors"
        :class="
          selectedId === entry.id
            ? 'border-accent bg-conv-active'
            : 'border-border-soft hover:bg-item-hover'
        "
        @click="selectResult(entry)"
      >
        <Avatar
          :name="entry.name"
          :index="entry.avatarIndex"
          :avatar-url="entry.avatarUrl"
          :size="36"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-small text-foreground">
            {{ entry.name }}
            <span
              v-if="entry.userId && contacts.friendUserIds.has(entry.userId)"
              class="ml-1 text-[10px] text-accent"
            >
              已是好友
            </span>
          </p>
          <p class="truncate text-micro text-secondary-foreground">{{ entry.desc }}</p>
          <p class="truncate text-micro text-tertiary-foreground">
            账号：{{ entry.username }} · ID: {{ entry.userId }}
          </p>
        </div>
        <AppIcon
          v-if="selectedId === entry.id"
          name="ion:checkmark-round"
          :size="16"
          class="shrink-0 text-accent"
        />
      </button>
    </div>

    <div v-else-if="searched" class="mt-4 flex flex-col items-center gap-2 py-6">
      <AppIcon name="ion:search" :size="28" class="text-icon" />
      <p class="text-caption text-tertiary-foreground">未找到该账号，换个关键字试试</p>
    </div>
    <p v-else class="mt-4 text-micro text-tertiary-foreground">
      支持昵称包含匹配、账号前缀匹配；手机号、邮箱、用户 ID 需输入完整值精确匹配。
    </p>

    <textarea
      v-if="selected"
      v-model="message"
      rows="2"
      class="app-field mt-3 w-full resize-none px-2 py-1.5 text-small"
      placeholder="填写验证信息"
    />

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
        :disabled="!selected || isFriend"
        @click="send"
      >
        发送申请
      </button>
    </template>
  </PopupDialog>
</template>
