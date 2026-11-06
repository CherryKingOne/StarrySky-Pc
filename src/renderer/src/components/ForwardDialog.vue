<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'
import { useConversationsStore } from '@renderer/stores/conversations'

const props = withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    lines?: string[]
    /** 转发完成后是否自动切换到目标会话 */
    jump?: boolean
  }>(),
  { title: '合并转发', lines: () => [], jump: false }
)

const emit = defineEmits<{
  close: []
  sent: [conversationId: string]
}>()

const store = useConversationsStore()
const keyword = ref('')
const selectedId = ref('')

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      keyword.value = ''
      selectedId.value = ''
    }
  }
)

const list = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return store.sortedList.filter((item) => !kw || item.name.toLowerCase().includes(kw))
})

const selected = computed(() => store.list.find((item) => item.id === selectedId.value) ?? null)

function confirm(): void {
  if (!selectedId.value) return
  const title = props.title || `${selected.value?.name ?? ''} 的聊天记录`
  const lines = props.lines.length > 0 ? props.lines : ['暂无转发内容']
  store.sendForward(selectedId.value, title, lines)
  if (props.jump) store.setActive(selectedId.value)
  emit('sent', selectedId.value)
  emit('close')
}
</script>

<template>
  <PopupDialog
    :visible="visible"
    title="合并转发"
    subtitle="选择需要转发到的会话"
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
            placeholder="搜索会话"
          />
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-2">
        <button
          v-for="item in list"
          :key="item.id"
          type="button"
          class="flex h-12 w-full items-center gap-3 rounded-sm px-2 text-left transition-colors"
          :class="selectedId === item.id ? 'bg-conv-active' : 'hover:bg-item-hover'"
          @click="selectedId = item.id"
        >
          <Avatar :name="item.name" :index="item.avatarIndex" :size="32" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-small text-foreground">{{ item.name }}</p>
            <p class="truncate text-micro text-tertiary-foreground">{{ item.preview }}</p>
          </div>
          <AppIcon
            v-if="selectedId === item.id"
            name="ion:checkmark-round"
            :size="16"
            class="shrink-0 text-accent"
          />
        </button>
      </div>
    </div>

    <template #footer>
      <span class="mr-auto text-micro text-tertiary-foreground">
        将转发 {{ lines.length }} 条消息{{ selected ? ` · ${selected.name}` : '' }}
      </span>
      <button
        type="button"
        class="btn-primary h-9 px-5 disabled:opacity-50"
        :disabled="!selectedId"
        @click="confirm"
      >
        转发
      </button>
    </template>
  </PopupDialog>
</template>
