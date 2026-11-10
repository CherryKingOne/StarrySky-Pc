<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import ConfirmDialog from '@renderer/components/ConfirmDialog.vue'
import MediaPreview from '@renderer/components/MediaPreview.vue'
import MomentCard from '@renderer/components/MomentCard.vue'
import MomentComposer from '@renderer/components/MomentComposer.vue'
import Toast from '@renderer/components/Toast.vue'
import { useAppStore } from '@renderer/stores/app'
import {
  momentsCover,
  useMomentsStore,
  type MomentPost,
  type PublishMomentPayload
} from '@renderer/stores/moments'
import type { ChatMessage } from '@renderer/types'

const app = useAppStore()
const moments = useMomentsStore()

const keyword = ref('')
const showComposer = ref(false)
const refreshing = ref(false)
const toastMessage = ref('')
const deleteTarget = ref<MomentPost | null>(null)
const preview = reactive<{ visible: boolean; images: ChatMessage[]; index: number }>({
  visible: false,
  images: [],
  index: 0
})

const year = new Date().getFullYear()

/** 身份切换（用户 / Agent）时加载各自的朋友圈数据 */
watch(
  () => [app.actingAgent?.agentId ?? '', app.user?.userId ?? ''],
  () => {
    keyword.value = ''
    moments.load(true)
  },
  { immediate: true }
)

const me = computed(() => moments.me)
const isAgent = computed(() => moments.isAgent)
const displayName = computed(() => me.value.name)
const signature = computed(() => moments.signature)
const subtitle = computed(() =>
  isAgent.value ? `以「${displayName.value}」的身份记录与分享` : '好友的此刻，都在这里'
)

const filteredPosts = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return moments.posts
  return moments.posts.filter((post) =>
    [post.content, post.author.name, post.location].some((value) =>
      value.toLowerCase().includes(kw)
    )
  )
})

function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}

function refresh(): void {
  if (refreshing.value) return
  refreshing.value = true
  moments.load(true)
  window.setTimeout(() => {
    refreshing.value = false
    showToast('已刷新')
  }, 500)
}

function publishMoment(payload: PublishMomentPayload): void {
  moments.publish(payload)
  showComposer.value = false
  showToast('动态已发布')
}

function openPreview(post: MomentPost, index: number): void {
  preview.images = post.images.map((image, imageIndex) => ({
    id: `${post.id}-${imageIndex}`,
    direction: 'in',
    kind: 'image',
    time: '',
    imageUrl: image,
    imageLabel: `${post.author.name}的动态图片`
  }))
  preview.index = index
  preview.visible = true
}

function confirmDelete(): void {
  if (!deleteTarget.value) return
  moments.remove(deleteTarget.value.id)
  deleteTarget.value = null
  showToast('动态已删除')
}
</script>

<template>
  <div class="flex h-full min-w-0 flex-1 flex-col bg-tertiary">
    <header
      class="flex h-16 shrink-0 items-center justify-between gap-6 border-b border-divider bg-panel px-6"
    >
      <div class="min-w-0">
        <h1 class="truncate text-page text-foreground">朋友圈</h1>
        <p class="truncate text-caption text-secondary-foreground">{{ subtitle }}</p>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <label
          class="app-field flex h-8 w-[180px] items-center gap-1.5 rounded-md px-2 xl:w-[220px]"
        >
          <AppIcon name="ion:search" :size="14" class="shrink-0 text-placeholder-foreground" />
          <input
            v-model="keyword"
            class="h-full w-full bg-transparent text-small text-foreground outline-none placeholder:text-placeholder-foreground"
            placeholder="搜索好友动态"
          />
        </label>
        <button
          v-tooltip="'刷新'"
          type="button"
          class="icon-button h-8 w-8 rounded-md border border-border bg-secondary"
          @click="refresh"
        >
          <AppIcon name="ion:ios-refresh" :size="16" :class="refreshing ? 'animate-spin' : ''" />
        </button>
        <button type="button" class="btn-primary h-8 px-3.5" @click="showComposer = true">
          <AppIcon name="ion:ios-plus-outline" :size="14" />
          发布动态
        </button>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto flex w-full max-w-[700px] flex-col gap-4 px-6 py-4">
        <section class="relative h-[172px] shrink-0 overflow-hidden rounded-lg">
          <img
            :src="momentsCover"
            alt="朋友圈封面"
            class="absolute inset-0 h-full w-full object-cover"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
          />
          <p class="absolute left-4 top-3.5 text-micro tracking-widest text-white/80">
            STARRY MOMENTS · {{ year }}
          </p>
          <span
            v-if="isAgent"
            class="absolute right-4 top-3 flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-micro text-white backdrop-blur-sm"
          >
            <AppIcon name="ion:ios-shuffle" :size="11" />
            Agent 身份
          </span>

          <div class="absolute inset-x-4 bottom-4 flex items-end gap-3">
            <Avatar
              :name="displayName"
              :index="me.avatarIndex"
              :avatar-url="me.avatarUrl"
              :size="36"
              class="ring-2 ring-white/80"
            />
            <div class="min-w-0 flex-1 pb-0.5">
              <p class="truncate text-section text-white">{{ displayName }}</p>
              <p class="truncate text-micro text-white/75">{{ signature }}</p>
            </div>
            <p class="shrink-0 pb-0.5 text-micro text-white/70">
              {{ moments.posts.length }} 条动态 · {{ moments.photoCount }} 张照片
            </p>
          </div>
        </section>

        <div
          v-if="isAgent"
          class="flex items-center gap-2 rounded-md bg-accent-subtle px-3 py-2 text-caption text-accent"
        >
          <AppIcon name="ion:ios-information-outline" :size="14" class="shrink-0" />
          当前为 Agent 身份，朋友圈内容与用户账号各自独立保存。
        </div>

        <MomentCard
          v-for="post in filteredPosts"
          :key="post.id"
          :post="post"
          :me="me"
          @like="moments.toggleLike(post.id)"
          @comment="moments.addComment(post.id, $event)"
          @remove="deleteTarget = post"
          @preview="openPreview(post, $event)"
          @toast="showToast"
        />

        <div v-if="!filteredPosts.length" class="rounded-lg bg-panel px-6 py-12 text-center">
          <AppIcon name="ion:ios-photos-outline" :size="36" class="mx-auto text-icon" />
          <p class="mt-3 text-label text-foreground">
            {{ keyword.trim() ? '没有找到相关动态' : '还没有朋友圈动态' }}
          </p>
          <p class="mt-1 text-caption text-tertiary-foreground">
            {{ keyword.trim() ? '换个关键词再试试' : '发布第一条动态，记录此刻' }}
          </p>
          <div v-if="!keyword.trim()" class="mt-4 flex justify-center">
            <button type="button" class="btn-primary h-8 px-4" @click="showComposer = true">
              发布动态
            </button>
          </div>
        </div>
        <p v-else class="py-1 text-center text-micro text-tertiary-foreground">已经到底啦</p>
      </div>
    </div>

    <MomentComposer
      :visible="showComposer"
      :author="me"
      @close="showComposer = false"
      @publish="publishMoment"
      @toast="showToast"
    />

    <ConfirmDialog
      :visible="Boolean(deleteTarget)"
      title="删除动态"
      description="删除后将无法恢复，确定继续吗？"
      confirm-text="删除"
      danger
      @cancel="deleteTarget = null"
      @confirm="confirmDelete"
    />

    <MediaPreview
      :visible="preview.visible"
      :images="preview.images"
      :index="preview.index"
      @close="preview.visible = false"
    />

    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
