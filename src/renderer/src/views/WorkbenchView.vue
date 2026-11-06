<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Toast from '@renderer/components/Toast.vue'
import { workbenchApps } from '@renderer/data/mock'
import type { WorkbenchApp } from '@renderer/types'

const activeId = ref('')
const toastMessage = ref('')

const active = computed(() => workbenchApps.find((app) => app.id === activeId.value) ?? null)

const TONE_CLASS = [
  'bg-avatar-1',
  'bg-avatar-2',
  'bg-avatar-3',
  'bg-avatar-4',
  'bg-avatar-5',
  'bg-avatar-6'
]

function toneClass(app: WorkbenchApp): string {
  return TONE_CLASS[(app.tone - 1) % TONE_CLASS.length]
}

function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}
</script>

<template>
  <!-- P12 工作台：内部应用入口 + WebView 嵌入区 -->
  <div class="flex h-full w-full flex-col bg-tertiary">
    <header
      class="flex h-[60px] shrink-0 items-center justify-between border-b border-divider bg-panel px-5"
    >
      <div class="min-w-0">
        <h2 class="truncate text-section text-foreground">工作台 · 野火科技</h2>
        <p class="truncate text-caption text-secondary-foreground">
          企业内部应用入口（WebView 嵌入）
        </p>
      </div>
      <button
        v-if="active"
        type="button"
        class="inline-flex h-8 items-center gap-1.5 rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
        @click="activeId = ''"
      >
        <AppIcon name="ion:ios-arrow-left" :size="14" />
        返回应用列表
      </button>
    </header>

    <!-- 应用宫格 -->
    <div v-if="!active" class="min-h-0 flex-1 overflow-y-auto px-8 py-6">
      <p class="mb-4 text-micro text-secondary-foreground">
        全部应用（{{ workbenchApps.length }}）
      </p>
      <div class="grid grid-cols-3 gap-4">
        <button
          v-for="app in workbenchApps"
          :key="app.id"
          type="button"
          class="flex items-center gap-4 rounded-lg border border-border-soft bg-panel p-4 text-left transition-colors hover:border-accent hover:bg-item-hover"
          @click="activeId = app.id"
        >
          <span
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
            :class="toneClass(app)"
          >
            <AppIcon :name="app.icon" :size="24" class="text-on-accent" />
          </span>
          <span class="min-w-0">
            <span class="block truncate text-label text-foreground">{{ app.name }}</span>
            <span class="block truncate text-micro text-secondary-foreground">{{ app.desc }}</span>
          </span>
          <AppIcon name="ion:ios-arrow-right" :size="16" class="ml-auto shrink-0 text-icon" />
        </button>
      </div>

      <div class="mt-6 rounded-lg border border-dashed border-border bg-panel p-6 text-center">
        <AppIcon name="ion:code-working" :size="32" class="mx-auto text-icon" />
        <p class="mt-2 text-small text-secondary-foreground">
          工作台页面由企业 Web 应用提供，此处为嵌入区域占位
        </p>
        <p class="mt-1 text-micro text-tertiary-foreground">
          选择上方任意应用可查看 WebView 占位详情
        </p>
      </div>
    </div>

    <!-- WebView 占位 -->
    <div v-else class="flex min-h-0 flex-1 flex-col px-8 py-6">
      <div class="mb-4 flex items-center gap-3">
        <span
          class="flex h-10 w-10 items-center justify-center rounded-lg"
          :class="toneClass(active)"
        >
          <AppIcon :name="active.icon" :size="20" class="text-on-accent" />
        </span>
        <div>
          <p class="text-label text-foreground">{{ active.name }}</p>
          <p class="text-micro text-secondary-foreground">{{ active.desc }}</p>
        </div>
        <button
          type="button"
          class="btn-primary ml-auto h-8 px-3"
          @click="showToast('已在浏览器中打开企业应用')"
        >
          在浏览器打开
        </button>
        <button
          type="button"
          class="inline-flex h-8 items-center rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
          @click="showToast('已刷新应用页面')"
        >
          刷新
        </button>
      </div>

      <div
        class="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-border-soft bg-panel"
      >
        <AppIcon :name="active.icon" :size="64" class="text-icon" />
        <p class="text-label text-foreground">{{ active.name }}</p>
        <p class="max-w-[420px] text-center text-caption text-secondary-foreground">
          工作台页面由企业 Web 应用提供，此处为嵌入区域占位。接入后可在此加载 {{ active.name }} 的
          H5 页面。
        </p>
        <button
          type="button"
          class="btn-primary mt-2 h-9 px-4"
          @click="showToast('已连接企业应用（演示）')"
        >
          连接企业应用
        </button>
      </div>
    </div>

    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
