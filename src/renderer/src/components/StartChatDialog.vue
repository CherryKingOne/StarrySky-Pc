<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'
import { useContactsStore } from '@renderer/stores/contacts'

const props = defineProps<{ visible: boolean }>()
const contacts = useContactsStore()

const emit = defineEmits<{
  close: []
  start: [payload: { userId: string; name: string; index: number }]
}>()

const keyword = ref('')
const selectedId = ref('')

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      keyword.value = ''
      selectedId.value = ''
      void contacts.load()
    }
  }
)

const people = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return contacts.friends.filter(
    (item) =>
      !kw ||
      item.name.toLowerCase().includes(kw) ||
      item.desc.toLowerCase().includes(kw) ||
      (item.username ?? '').toLowerCase().includes(kw)
  )
})

const selected = computed(
  () => contacts.friends.find((item) => item.id === selectedId.value) ?? null
)

function confirm(): void {
  if (!selected.value?.userId) return
  emit('start', {
    userId: selected.value.userId,
    name: selected.value.name,
    index: selected.value.avatarIndex
  })
  emit('close')
}
</script>

<template>
  <PopupDialog
    :visible="visible"
    title="发起会话"
    subtitle="选择联系人开始新的对话"
    width="420px"
    height="520px"
    :padded="false"
    @close="emit('close')"
  >
    <div class="flex h-full flex-col">
      <div class="shrink-0 px-4 pb-2">
        <div class="app-field flex h-8 items-center gap-1.5 px-2">
          <AppIcon name="ion:search" :size="14" class="shrink-0 text-placeholder-foreground" />
          <input
            v-model="keyword"
            class="h-full w-full bg-transparent text-small text-foreground outline-none placeholder:text-placeholder-foreground"
            placeholder="搜索姓名 / 部门"
          />
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-2">
        <button
          v-for="person in people"
          :key="person.id"
          type="button"
          class="flex h-12 w-full items-center gap-3 rounded-sm px-2 text-left transition-colors"
          :class="selectedId === person.id ? 'bg-conv-active' : 'hover:bg-item-hover'"
          @click="selectedId = person.id"
        >
          <Avatar
            :name="person.name"
            :index="person.avatarIndex"
            :avatar-url="person.avatarUrl"
            :size="32"
          />
          <div class="min-w-0 flex-1">
            <p class="truncate text-small text-foreground">{{ person.name }}</p>
            <p class="truncate text-micro text-tertiary-foreground">
              {{ person.desc }}<span v-if="person.username"> · {{ person.username }}</span>
            </p>
          </div>
          <AppIcon
            v-if="selectedId === person.id"
            name="ion:checkmark-round"
            :size="16"
            class="shrink-0 text-accent"
          />
        </button>
        <p
          v-if="people.length === 0"
          class="mt-6 text-center text-caption text-tertiary-foreground"
        >
          未找到匹配的联系人
        </p>
      </div>
    </div>

    <template #footer>
      <span class="mr-auto text-micro text-tertiary-foreground">
        {{ selected ? `将打开与 ${selected.name} 的会话` : '请选择联系人' }}
      </span>
      <button
        type="button"
        class="btn-primary h-9 px-5 disabled:opacity-50"
        :disabled="!selected"
        @click="confirm"
      >
        开始聊天
      </button>
    </template>
  </PopupDialog>
</template>
