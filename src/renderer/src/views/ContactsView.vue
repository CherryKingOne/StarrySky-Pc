<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Avatar from '@renderer/components/Avatar.vue'
import EmptyState from '@renderer/components/EmptyState.vue'
import ListRow from '@renderer/components/ListRow.vue'
import SearchBar from '@renderer/components/SearchBar.vue'
import IconButton from '@renderer/components/IconButton.vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import { contacts } from '@renderer/data/mock'
import type { ContactEntry } from '@renderer/types'
import { useConversationsStore } from '@renderer/stores/conversations'

const router = useRouter()
const store = useConversationsStore()

const keyword = ref('')
const selectedId = ref<string | null>(null)

/** P04 通讯录：快捷入口 + 分组列表 */
const quickEntries = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const entries = contacts.filter((item) => item.group === '快捷入口')
  if (!kw) return entries
  return entries.filter((item) => item.name.toLowerCase().includes(kw))
})

interface ContactGroup {
  label: string
  items: ContactEntry[]
}

const groups = computed<ContactGroup[]>(() => {
  const kw = keyword.value.trim().toLowerCase()
  const map = new Map<string, ContactEntry[]>()
  for (const item of contacts) {
    if (item.group === '快捷入口') continue
    if (kw && !item.name.toLowerCase().includes(kw)) continue
    const label = item.group ?? ''
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(item)
  }
  return [...map.entries()].map(([label, items]) => ({ label, items }))
})

const selected = computed(() => contacts.find((item) => item.id === selectedId.value) ?? null)

function select(id: string): void {
  selectedId.value = id
}

function startChat(): void {
  const target = selected.value
  if (!target || target.group === '快捷入口') return
  store.ensureConversation(target.name, target.avatarIndex)
  void router.push('/chats')
}
</script>

<template>
  <!-- P04 通讯录：左侧 261 面板 + 右侧 959 详情区 -->
  <div class="flex h-full w-full">
    <section class="flex h-full w-panel shrink-0 flex-col overflow-hidden bg-secondary">
      <SearchBar v-model="keyword" placeholder="搜索" @add="keyword = ''" />

      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <ListRow
          v-for="entry in quickEntries"
          :key="entry.id"
          :name="entry.name"
          :index="entry.avatarIndex"
          :desc="entry.desc"
          :class="selectedId === entry.id ? 'bg-conv-active' : ''"
          @click="select(entry.id)"
        />

        <template v-for="group in groups" :key="group.label">
          <p class="px-4 pt-3 pb-1 text-micro text-secondary-foreground">
            分组 {{ group.label }}
          </p>
          <ListRow
            v-for="entry in group.items"
            :key="entry.id"
            :name="entry.name"
            :index="entry.avatarIndex"
            :desc="entry.desc"
            :class="selectedId === entry.id ? 'bg-conv-active' : ''"
            @click="select(entry.id)"
          />
        </template>
      </div>
    </section>

    <!-- 详情区 -->
    <section class="flex h-full min-w-0 flex-1 flex-col bg-tertiary">
      <EmptyState v-if="!selected" />

      <div
        v-else-if="selected.group === '快捷入口'"
        class="flex flex-1 flex-col items-center justify-center gap-3 text-center"
      >
        <AppIcon name="ion:ios-information-circle-outline" :size="40" class="text-icon" />
        <p class="text-label text-foreground">{{ selected.name }}</p>
        <p class="text-caption text-tertiary-foreground">{{ selected.desc }}</p>
      </div>

      <div v-else class="flex flex-1 flex-col items-center justify-center gap-4">
        <Avatar :name="selected.name" :index="selected.avatarIndex" :size="64" />
        <div class="text-center">
          <p class="text-section text-foreground">{{ selected.name }}</p>
          <p class="mt-1 text-caption text-secondary-foreground">{{ selected.desc }}</p>
        </div>
        <div class="flex items-center gap-6">
          <button type="button" class="btn-primary h-9 w-[120px]" @click="startChat">
            发消息
          </button>
          <IconButton icon="ion:ios-call" :size="20" />
          <IconButton icon="ion:ios-videocam" :size="20" />
        </div>
        <p class="text-micro text-time-foreground">分组 {{ selected.group }}</p>
      </div>
    </section>
  </div>
</template>
