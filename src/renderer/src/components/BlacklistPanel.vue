<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import Toast from '@renderer/components/Toast.vue'
import { listBlocks, unblockUser } from '@renderer/api/blocks'
import type { BlockEntry } from '@renderer/api/contracts'
import { useAppStore } from '@renderer/stores/app'
import { avatarIndexOf } from '@renderer/utils/chat'

const app = useAppStore()
const list = ref<BlockEntry[]>([])
const loading = ref(false)
const toastMessage = ref('')

function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}

async function load(): Promise<void> {
  if (!app.accessToken) return
  loading.value = true
  try {
    list.value = await listBlocks(app.accessToken)
  } catch (error) {
    showToast(error instanceof Error ? error.message : '黑名单加载失败')
  } finally {
    loading.value = false
  }
}

async function unblock(entry: BlockEntry): Promise<void> {
  if (!app.accessToken) return
  try {
    await unblockUser(app.accessToken, entry.userId)
    list.value = list.value.filter((item) => item.userId !== entry.userId)
    showToast('已解除拉黑')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '解除拉黑失败')
  }
}

onMounted(load)
</script>

<template>
  <div class="max-w-[640px]">
    <p class="text-caption text-secondary-foreground">
      被拉黑的用户无法与你建立单聊；解除后恢复正常。群聊消息不受影响。
    </p>

    <div
      v-if="list.length > 0"
      class="mt-4 flex flex-col rounded-md border border-border-soft bg-panel"
    >
      <div
        v-for="entry in list"
        :key="entry.userId"
        class="flex h-14 items-center gap-3 border-b border-divider px-3 last:border-b-0"
      >
        <Avatar
          :name="entry.profile?.nickname || entry.userId"
          :index="avatarIndexOf(entry.profile?.nickname || entry.userId)"
          :avatar-url="entry.profile?.avatarUrl"
          :size="36"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-small text-foreground">
            {{ entry.profile?.nickname || '未知用户' }}
          </p>
          <p class="truncate text-micro text-tertiary-foreground">ID: {{ entry.userId }}</p>
        </div>
        <button
          type="button"
          class="inline-flex h-7 items-center gap-1 rounded-sm border border-border bg-input px-3 text-micro text-foreground transition-colors hover:bg-item-hover"
          @click="unblock(entry)"
        >
          <AppIcon name="ion:person-add" :size="12" />
          解除拉黑
        </button>
      </div>
    </div>

    <p v-else-if="!loading" class="mt-8 text-center text-caption text-tertiary-foreground">
      黑名单为空
    </p>

    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
