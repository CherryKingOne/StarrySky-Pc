<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Avatar from '@renderer/components/Avatar.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'
import { contacts } from '@renderer/data/mock'
import type { MemberInfo } from '@renderer/types'

const props = defineProps<{ visible: boolean }>()

const emit = defineEmits<{
  close: []
  create: [payload: { name: string; members: MemberInfo[] }]
}>()

const name = ref('')
const selected = ref<string[]>([])

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      name.value = ''
      selected.value = []
    }
  }
)

const people = computed(() => contacts.filter((item) => item.group !== '快捷入口'))

const members = computed<MemberInfo[]>(() =>
  people.value
    .filter((person) => selected.value.includes(person.id))
    .map((person) => ({ name: person.name, index: person.avatarIndex, role: '成员' as const }))
)

function toggle(id: string): void {
  const index = selected.value.indexOf(id)
  if (index > -1) selected.value.splice(index, 1)
  else selected.value.push(id)
}

function confirm(): void {
  const groupName = name.value.trim() || '新的群聊'
  emit('create', { name: groupName, members: members.value })
  emit('close')
}
</script>

<template>
  <PopupDialog
    :visible="visible"
    title="创建群聊"
    subtitle="填写群名称并选择成员"
    width="440px"
    height="560px"
    :padded="false"
    @close="emit('close')"
  >
    <div class="flex h-full flex-col">
      <div class="shrink-0 px-4 pb-2">
        <input
          v-model="name"
          class="app-field h-9 w-full px-2 text-small"
          placeholder="群聊名称（默认：新的群聊）"
        />
      </div>

      <div class="flex items-center justify-between px-4 pb-1">
        <span class="text-micro text-secondary-foreground">选择成员（{{ selected.length }}）</span>
        <button
          type="button"
          class="text-micro text-link hover:text-link-hover"
          @click="selected = []"
        >
          清空
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-2">
        <button
          v-for="person in people"
          :key="person.id"
          type="button"
          class="flex h-12 w-full items-center gap-3 rounded-sm px-2 text-left transition-colors hover:bg-item-hover"
          @click="toggle(person.id)"
        >
          <Avatar :name="person.name" :index="person.avatarIndex" :size="32" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-small text-foreground">{{ person.name }}</p>
            <p class="truncate text-micro text-tertiary-foreground">{{ person.desc }}</p>
          </div>
          <span
            class="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border"
            :class="
              selected.includes(person.id)
                ? 'border-accent bg-accent text-on-accent'
                : 'border-border bg-input'
            "
          >
            <span v-if="selected.includes(person.id)" class="text-[10px] leading-none">✓</span>
          </span>
        </button>
      </div>
    </div>

    <template #footer>
      <span class="mr-auto text-micro text-tertiary-foreground">群主：林晓</span>
      <button
        type="button"
        class="btn-primary h-9 px-5 disabled:opacity-50"
        :disabled="selected.length === 0"
        @click="confirm"
      >
        创建群聊
      </button>
    </template>
  </PopupDialog>
</template>
