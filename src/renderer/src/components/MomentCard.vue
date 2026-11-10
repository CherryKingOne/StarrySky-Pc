<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import ContextMenu, { type MenuItem } from '@renderer/components/ContextMenu.vue'
import type { MomentAuthor, MomentPost } from '@renderer/stores/moments'
import { formatMomentTime } from '@renderer/utils/moments'

const props = defineProps<{
  post: MomentPost
  me: MomentAuthor
}>()

const emit = defineEmits<{
  like: []
  comment: [text: string]
  remove: []
  preview: [index: number]
  toast: [message: string]
}>()

const moreButton = ref<HTMLButtonElement | null>(null)
const moreOpen = ref(false)
const commentMode = ref(false)
const draft = ref('')
const playing = ref(false)

const mine = computed(
  () => props.post.author.id === props.me.id && props.post.author.type === props.me.type
)
const liked = computed(() =>
  props.post.likes.some((item) => item.id === props.me.id && item.type === props.me.type)
)
const likeNames = computed(() => props.post.likes.map((item) => item.name).join('、'))
const imageSizeClass = computed(() => {
  if (props.post.images.length === 1) return 'h-[200px] w-[300px]'
  if (props.post.images.length === 2) return 'h-[160px] w-[160px]'
  return 'h-[108px] w-[108px]'
})

const moreItems: MenuItem[] = [
  { key: 'remove', label: '删除动态', icon: 'ion:ios-trash', danger: true }
]

function toggleComment(): void {
  commentMode.value = !commentMode.value
  if (commentMode.value) draft.value = ''
}

function submitComment(): void {
  const text = draft.value.trim()
  if (!text) return
  emit('comment', text)
  draft.value = ''
  commentMode.value = false
}

function onMoreSelect(key: string): void {
  if (key === 'remove') emit('remove')
}

function toggleMusic(): void {
  playing.value = !playing.value
  emit('toast', playing.value ? '示例音乐播放中' : '已暂停')
}
</script>

<template>
  <article class="rounded-lg bg-panel p-4">
    <div class="flex gap-3">
      <Avatar
        :name="post.author.name"
        :index="post.author.avatarIndex"
        :avatar-url="post.author.avatarUrl"
        :size="36"
      />

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5">
          <p class="truncate text-label text-foreground">{{ post.author.name }}</p>
          <span
            v-if="post.author.type === 'AGENT'"
            class="shrink-0 rounded-full bg-accent-subtle px-1.5 py-0.5 text-micro leading-none text-accent"
          >
            Agent
          </span>
          <span class="shrink-0 text-micro text-time-foreground">·</span>
          <span class="shrink-0 text-micro text-time-foreground">
            {{ formatMomentTime(post.createdAt) }}
          </span>
          <span class="min-w-0 flex-1" />
          <button
            v-if="mine"
            ref="moreButton"
            v-tooltip="'更多'"
            type="button"
            class="icon-button h-6 w-6"
            @click.stop="moreOpen = true"
          >
            <AppIcon name="ion:ios-more" :size="16" />
          </button>
        </div>

        <p
          v-if="post.content"
          class="mt-1.5 whitespace-pre-wrap break-words text-small leading-relaxed text-foreground"
        >
          {{ post.content }}
        </p>

        <div v-if="post.images.length" class="mt-2.5 flex flex-wrap gap-2">
          <button
            v-for="(image, index) in post.images"
            :key="`${post.id}-image-${index}`"
            type="button"
            class="group overflow-hidden rounded-md bg-item-normal"
            :class="imageSizeClass"
            @click="emit('preview', index)"
          >
            <img
              :src="image"
              alt="动态图片"
              class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </button>
        </div>

        <div
          v-if="post.music"
          class="mt-2.5 flex items-center gap-2.5 rounded-md bg-secondary px-2.5 py-2"
        >
          <img
            :src="post.music.cover"
            alt="音乐封面"
            class="h-10 w-10 shrink-0 rounded-sm object-cover"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-label text-foreground">{{ post.music.title }}</p>
            <p class="truncate text-micro text-tertiary-foreground">{{ post.music.artist }}</p>
          </div>
          <button
            v-tooltip="playing ? '暂停' : '播放'"
            type="button"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent transition-colors hover:bg-accent hover:text-on-accent"
            @click="toggleMusic"
          >
            <AppIcon :name="playing ? 'ion:pause' : 'ion:play'" :size="13" />
          </button>
        </div>

        <div class="mt-2.5 flex items-center gap-4 text-micro text-tertiary-foreground">
          <span v-if="post.location" class="flex min-w-0 items-center gap-1">
            <AppIcon name="ion:ios-location" :size="12" class="shrink-0" />
            <span class="truncate">{{ post.location }}</span>
          </span>
          <span class="flex-1" />
          <button
            type="button"
            class="flex shrink-0 items-center gap-1 transition-colors hover:text-foreground"
            :class="liked ? 'text-accent' : ''"
            @click="emit('like')"
          >
            <AppIcon :name="liked ? 'ion:ios-heart' : 'ion:ios-heart-outline'" :size="14" />
            <span>{{ post.likes.length > 0 ? post.likes.length : '赞' }}</span>
          </button>
          <button
            type="button"
            class="flex shrink-0 items-center gap-1 transition-colors hover:text-foreground"
            :class="commentMode ? 'text-accent' : ''"
            @click="toggleComment"
          >
            <AppIcon name="ion:chatbubble-outline" :size="14" />
            <span>{{ post.comments.length > 0 ? post.comments.length : '评论' }}</span>
          </button>
        </div>

        <div
          v-if="post.likes.length || post.comments.length || commentMode"
          class="mt-2 rounded-md bg-secondary px-3 py-2"
        >
          <div v-if="post.likes.length" class="flex items-start gap-1.5">
            <AppIcon name="ion:ios-heart" :size="12" class="mt-1 shrink-0 text-accent" />
            <p class="text-caption leading-relaxed text-secondary-foreground">{{ likeNames }}</p>
          </div>

          <div
            v-for="comment in post.comments"
            :key="comment.id"
            class="mt-1 text-caption leading-relaxed"
          >
            <span class="text-link">{{ comment.author.name }}：</span>
            <span class="text-foreground">{{ comment.text }}</span>
          </div>

          <div v-if="commentMode" class="mt-2 flex items-center gap-2">
            <input
              v-model="draft"
              class="app-field h-8 min-w-0 flex-1 px-2"
              placeholder="写下你的评论…"
              @keyup.enter="submitComment"
            />
            <button
              type="button"
              class="btn-primary h-8 px-3"
              :disabled="!draft.trim()"
              @click="submitComment"
            >
              发送
            </button>
          </div>
        </div>
      </div>
    </div>

    <ContextMenu
      v-model:visible="moreOpen"
      :items="moreItems"
      :anchor="moreButton"
      align="end"
      @select="onMoreSelect"
    />
  </article>
</template>
