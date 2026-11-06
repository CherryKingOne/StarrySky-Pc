<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import EmptyState from '@renderer/components/EmptyState.vue'
import ForwardDialog from '@renderer/components/ForwardDialog.vue'
import Toast from '@renderer/components/Toast.vue'
import { useConversationsStore } from '@renderer/stores/conversations'
import type { FileEntry } from '@renderer/types'

const router = useRouter()
const store = useConversationsStore()

const keyword = ref('')
const onlyStarred = ref(false)
const selectedId = ref('')
const showForward = ref(false)
const toastMessage = ref('')
const starred = ref<string[]>([])

function kindOf(name: string, isImage: boolean): FileEntry['kind'] {
  if (isImage) return 'image'
  if (/\.pdf$/i.test(name)) return 'pdf'
  if (/\.(ppt|pptx)$/i.test(name)) return 'ppt'
  if (/\.(zip|rar|7z)$/i.test(name)) return 'zip'
  return 'doc'
}

const fileList = computed<FileEntry[]>(() => {
  const result: FileEntry[] = []
  for (const conversation of store.list) {
    for (const message of conversation.messages) {
      if (message.kind !== 'file' && message.kind !== 'image') continue
      if (!message.fileUrl && !message.fileId) continue
      const name = message.fileName || message.imageLabel || '未命名文件'
      result.push({
        id: message.id,
        name,
        size: message.fileSize || '',
        kind: kindOf(name, message.kind === 'image'),
        from: message.sender ?? '我',
        time: message.time,
        conversationId: conversation.id,
        starred: starred.value.includes(message.id),
        url: message.fileUrl,
        fileId: message.fileId
      })
    }
  }
  return result.reverse()
})

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return fileList.value.filter(
    (file) =>
      (!onlyStarred.value || file.starred) &&
      (!kw || file.name.toLowerCase().includes(kw) || file.from.toLowerCase().includes(kw))
  )
})

const selected = computed(() => fileList.value.find((file) => file.id === selectedId.value) ?? null)

const forwardLines = computed(() =>
  selected.value ? [`${selected.value.from}：${selected.value.name}`] : []
)

const conversationName = computed(() => {
  if (!selected.value) return '未知会话'
  return store.list.find((item) => item.id === selected.value?.conversationId)?.name ?? '未知会话'
})

function iconOf(file: FileEntry): string {
  if (file.kind === 'image') return 'ion:image'
  if (file.kind === 'zip') return 'ion:archive'
  if (file.kind === 'ppt') return 'ion:easel'
  if (file.kind === 'doc') return 'ion:document-text'
  return 'ion:document'
}

function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}

function openFile(): void {
  if (!selected.value) return
  if (selected.value.url) {
    window.open(selected.value.url, '_blank')
    showToast(`已打开「${selected.value.name}」`)
    return
  }
  showToast('该文件没有可用的下载地址')
}

function toggleStar(): void {
  const file = selected.value
  if (!file) return
  const index = starred.value.indexOf(file.id)
  if (index > -1) starred.value.splice(index, 1)
  else starred.value.push(file.id)
  showToast(index > -1 ? '已取消收藏' : '已收藏该文件')
}

function locate(): void {
  if (!selected.value) return
  void store.setActive(selected.value.conversationId)
  void router.push('/chats')
  showToast('已定位到所在会话')
}

onMounted(async () => {
  await store.load()
  await store.prefetchHistories()
})
</script>

<template>
  <!-- P08 文件记录：261 列表面板 + 959 详情区 -->
  <div class="flex h-full w-full">
    <section
      class="flex h-full w-panel shrink-0 flex-col overflow-hidden border-r border-divider bg-secondary"
    >
      <div class="flex h-[60px] shrink-0 items-center justify-between px-5">
        <h2 class="text-section text-foreground">文件</h2>
        <button
          type="button"
          class="text-micro transition-colors"
          :class="onlyStarred ? 'text-accent' : 'text-tertiary-foreground hover:text-foreground'"
          @click="onlyStarred = !onlyStarred"
        >
          {{ onlyStarred ? '只看收藏' : '全部文件' }}
        </button>
      </div>
      <div class="h-px w-full bg-border" />

      <div class="shrink-0 px-3 py-2">
        <div class="app-field flex h-8 items-center gap-1.5 px-2">
          <AppIcon name="ion:search" :size="14" class="shrink-0 text-placeholder-foreground" />
          <input
            v-model="keyword"
            class="h-full w-full bg-transparent text-small text-foreground outline-none placeholder:text-placeholder-foreground"
            placeholder="搜索文件名 / 发送人"
          />
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <button
          v-for="file in filtered"
          :key="file.id"
          type="button"
          class="list-row h-row w-panel text-left"
          :class="selectedId === file.id ? 'bg-conv-active' : ''"
          @click="selectedId = file.id"
        >
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-selected-alt"
          >
            <AppIcon :name="iconOf(file)" :size="18" class="text-accent" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-base text-foreground">{{ file.name }}</span>
            <span class="block truncate text-micro text-secondary-foreground">
              {{ file.size }} · {{ file.from }} · {{ file.time }}
            </span>
          </span>
          <AppIcon
            v-if="file.starred"
            name="ion:ios-star"
            :size="14"
            class="shrink-0 text-accent"
          />
        </button>
        <p
          v-if="filtered.length === 0"
          class="mt-8 text-center text-caption text-tertiary-foreground"
        >
          没有匹配的文件
        </p>
      </div>
    </section>

    <section class="flex h-full min-w-0 flex-1 flex-col bg-tertiary">
      <EmptyState
        v-if="!selected"
        title="选择一个文件查看详情"
        hint="支持打开、转发、收藏与定位会话"
      />

      <div v-else class="flex flex-1 flex-col items-center justify-center gap-4 px-10">
        <div class="flex h-20 w-20 items-center justify-center rounded-lg bg-accent-subtle">
          <AppIcon :name="iconOf(selected)" :size="40" class="text-accent" />
        </div>
        <div class="text-center">
          <p class="text-section text-foreground">{{ selected.name }}</p>
          <p class="mt-1 text-caption text-secondary-foreground">
            {{ selected.size }} · 来自 {{ selected.from }} · {{ selected.time }}
          </p>
        </div>

        <div class="flex flex-wrap items-center justify-center gap-3">
          <button type="button" class="btn-primary h-9 w-[104px]" @click="openFile">打开</button>
          <button
            type="button"
            class="inline-flex h-9 w-[104px] items-center justify-center gap-1.5 rounded-sm border border-border bg-input text-label text-foreground transition-colors hover:bg-item-hover"
            @click="showForward = true"
          >
            <AppIcon name="ion:ios-redo" :size="16" />
            转发
          </button>
          <button
            type="button"
            class="inline-flex h-9 w-[104px] items-center justify-center gap-1.5 rounded-sm border border-border bg-input text-label text-foreground transition-colors hover:bg-item-hover"
            @click="toggleStar"
          >
            <AppIcon
              :name="selected.starred ? 'ion:ios-star' : 'ion:ios-star-outline'"
              :size="16"
            />
            {{ selected.starred ? '取消收藏' : '收藏' }}
          </button>
          <button
            type="button"
            class="inline-flex h-9 w-[104px] items-center justify-center gap-1.5 rounded-sm border border-border bg-input text-label text-foreground transition-colors hover:bg-item-hover"
            @click="locate"
          >
            <AppIcon name="ion:ios-locate" :size="16" />
            定位会话
          </button>
        </div>

        <div class="mt-6 w-full max-w-[560px] rounded-md bg-item-hover px-4 py-3">
          <p class="text-micro text-secondary-foreground">所属会话</p>
          <p class="mt-1 text-small text-foreground">
            {{ conversationName }}
          </p>
        </div>
      </div>
    </section>

    <ForwardDialog
      :visible="showForward"
      :title="`${selected?.from ?? ''} 的文件`"
      :lines="forwardLines"
      @close="showForward = false"
      @sent="showToast('文件已转发')"
    />
    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
