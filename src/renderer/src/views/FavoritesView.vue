<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import ConfirmDialog from '@renderer/components/ConfirmDialog.vue'
import EmptyState from '@renderer/components/EmptyState.vue'
import ForwardDialog from '@renderer/components/ForwardDialog.vue'
import ListRow from '@renderer/components/ListRow.vue'
import Toast from '@renderer/components/Toast.vue'
import { favorites as seed } from '@renderer/data/mock'
import type { FavoriteEntry } from '@renderer/types'

const router = useRouter()

const list = reactive<FavoriteEntry[]>(seed.map((item) => ({ ...item })))
const selectedId = ref('')
const keyword = ref('')
const showForward = ref(false)
const showDelete = ref(false)
const toastMessage = ref('')

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return list.filter(
    (item) => !kw || item.name.toLowerCase().includes(kw) || item.desc.toLowerCase().includes(kw)
  )
})

const selected = computed(() => list.find((item) => item.id === selectedId.value) ?? null)

const forwardLines = computed(() =>
  selected.value ? [selected.value.name, selected.value.text ?? ''] : []
)

function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}

async function openFavorite(): Promise<void> {
  if (!selected.value) return
  if (selected.value.kind === '链接') {
    showToast('已在浏览器中打开收藏链接')
    return
  }
  if (selected.value.name.endsWith('.pdf')) {
    void router.push('/files')
    showToast('已打开文件记录')
    return
  }
  showToast('已打开收藏内容')
}

function copyFavorite(): void {
  if (!selected.value) return
  const content = selected.value.text ?? selected.value.name
  navigator.clipboard
    ?.writeText(content)
    .then(() => showToast('已复制到剪贴板'))
    .catch(() => showToast('复制失败'))
}

function deleteFavorite(): void {
  if (!selected.value) return
  const index = list.findIndex((item) => item.id === selected.value?.id)
  if (index > -1) list.splice(index, 1)
  selectedId.value = ''
  showDelete.value = false
  showToast('收藏已删除')
}
</script>

<template>
  <!-- P05 收藏：左侧 261 列表面板 + 右侧 959 详情区 -->
  <div class="flex h-full w-full">
    <section class="flex h-full w-panel shrink-0 flex-col overflow-hidden bg-secondary">
      <div class="flex h-[60px] shrink-0 items-center justify-between px-5">
        <h2 class="text-page text-foreground">收藏</h2>
        <span class="text-micro text-tertiary-foreground">{{ list.length }} 条</span>
      </div>
      <div class="h-px w-full bg-border" />

      <div class="shrink-0 px-3 py-2">
        <div class="app-field flex h-8 items-center gap-1.5 px-2">
          <AppIcon name="ion:search" :size="14" class="shrink-0 text-placeholder-foreground" />
          <input
            v-model="keyword"
            class="h-full w-full bg-transparent text-small text-foreground outline-none placeholder:text-placeholder-foreground"
            placeholder="搜索收藏"
          />
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <ListRow
          v-for="entry in filtered"
          :key="entry.id"
          :name="entry.name"
          :index="entry.avatarIndex"
          :desc="entry.desc"
          :class="selectedId === entry.id ? 'bg-conv-active' : ''"
          @click="selectedId = entry.id"
        />
        <p
          v-if="filtered.length === 0"
          class="mt-8 text-center text-caption text-tertiary-foreground"
        >
          没有匹配的收藏
        </p>
      </div>
    </section>

    <section class="flex h-full min-w-0 flex-1 flex-col bg-tertiary">
      <EmptyState v-if="!selected" title="选择一条收藏查看详情" hint="支持打开、复制、转发与删除" />

      <template v-else>
        <header
          class="flex h-[60px] shrink-0 items-center justify-between border-b border-divider bg-panel px-5"
        >
          <div class="min-w-0">
            <h2 class="truncate text-section text-foreground">{{ selected.name }}</h2>
            <p class="truncate text-caption text-secondary-foreground">
              {{ selected.source }} · {{ selected.time }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" class="btn-primary h-8 px-3" @click="openFavorite">打开</button>
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
              @click="copyFavorite"
            >
              <AppIcon name="ion:ios-copy" :size="14" />
              复制
            </button>
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
              @click="showForward = true"
            >
              <AppIcon name="ion:ios-redo" :size="14" />
              转发
            </button>
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-small text-danger transition-colors hover:bg-item-hover"
              @click="showDelete = true"
            >
              <AppIcon name="ion:ios-trash" :size="14" />
              删除
            </button>
          </div>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-8 py-6">
          <div class="flex flex-col items-center gap-4">
            <div class="flex h-20 w-20 items-center justify-center rounded-lg bg-accent-subtle">
              <AppIcon
                :name="
                  selected.kind === '文件'
                    ? 'ion:document'
                    : selected.kind === '链接'
                      ? 'ion:link'
                      : 'ion:ios-star'
                "
                :size="40"
                class="text-accent"
              />
            </div>
            <div class="text-center">
              <p class="text-section text-foreground">{{ selected.name }}</p>
              <p class="mt-1 text-caption text-secondary-foreground">
                {{ selected.fileSize || selected.desc }}
              </p>
            </div>
            <span
              class="rounded-full border border-soft px-3 py-1 text-micro text-secondary-foreground"
            >
              {{ selected.kind }}
            </span>
          </div>

          <div class="mx-auto mt-6 max-w-[620px] rounded-md bg-panel p-4">
            <p class="text-micro text-secondary-foreground">收藏内容</p>
            <p class="mt-2 text-small leading-relaxed text-foreground">
              {{ selected.text || `${selected.name}（${selected.fileSize || '文件'}）` }}
            </p>
            <p class="mt-3 text-micro text-tertiary-foreground">
              来源：{{ selected.source }} · 收藏于 {{ selected.time }}
            </p>
          </div>
        </div>
      </template>
    </section>

    <ForwardDialog
      :visible="showForward"
      :lines="forwardLines"
      @close="showForward = false"
      @sent="showToast('收藏已转发')"
    />

    <ConfirmDialog
      :visible="showDelete"
      title="删除收藏"
      description="删除后将无法恢复，确定继续吗？"
      confirm-text="删除"
      danger
      @cancel="showDelete = false"
      @confirm="deleteFavorite"
    />

    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
