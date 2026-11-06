<script setup lang="ts">
import { computed, ref } from 'vue'
import EmptyState from '@renderer/components/EmptyState.vue'
import ListRow from '@renderer/components/ListRow.vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import { favorites } from '@renderer/data/mock'

const selectedId = ref<string | null>(null)

const selected = computed(() => favorites.find((item) => item.id === selectedId.value) ?? null)

const kindLabel = computed(() => {
  const desc = selected.value?.desc ?? ''
  return desc.includes('pdf') ? '文件' : desc.includes('群公告') ? '群公告' : '链接'
})
</script>

<template>
  <!-- P05 收藏：左侧 261 列表面板 + 右侧 959 详情区 -->
  <div class="flex h-full w-full">
    <section class="flex h-full w-panel shrink-0 flex-col overflow-hidden bg-secondary">
      <div class="flex h-[60px] shrink-0 items-center px-5">
        <h2 class="text-page text-foreground">收藏</h2>
      </div>
      <div class="h-px w-full bg-border" />

      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <ListRow
          v-for="entry in favorites"
          :key="entry.id"
          :name="entry.name"
          :index="entry.avatarIndex"
          :desc="entry.desc"
          :class="selectedId === entry.id ? 'bg-conv-active' : ''"
          @click="selectedId = entry.id"
        />
      </div>
    </section>

    <section class="flex h-full min-w-0 flex-1 flex-col bg-tertiary">
      <EmptyState v-if="!selected" />

      <div v-else class="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <div class="flex h-20 w-20 items-center justify-center rounded-lg bg-accent-subtle">
          <AppIcon name="ion:ios-star" :size="40" class="text-accent" />
        </div>
        <div>
          <p class="text-section text-foreground">{{ selected.name }}</p>
          <p class="mt-1 text-caption text-secondary-foreground">{{ selected.desc }}</p>
        </div>
        <span
          class="rounded-full border border-soft px-3 py-1 text-micro text-secondary-foreground"
        >
          {{ kindLabel }}
        </span>
      </div>
    </section>
  </div>
</template>
