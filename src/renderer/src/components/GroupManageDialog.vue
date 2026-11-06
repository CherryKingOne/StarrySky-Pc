<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'
import { useConversationsStore } from '@renderer/stores/conversations'

const props = defineProps<{
  visible: boolean
  conversationId: string
}>()

const emit = defineEmits<{
  close: []
  toast: [message: string]
  'open-qr': []
  leave: []
}>()

const store = useConversationsStore()

const name = ref('')
const notice = ref('')

const conversation = computed(
  () => store.list.find((item) => item.id === props.conversationId) ?? null
)

watch(
  () => [props.visible, props.conversationId],
  () => {
    if (!props.visible) return
    name.value = conversation.value?.name ?? ''
    notice.value = conversation.value?.notice ?? ''
  },
  { immediate: true }
)

const members = computed(() => conversation.value?.members ?? [])

function save(): void {
  if (name.value.trim()) store.updateGroupName(props.conversationId, name.value.trim())
  store.updateGroupNotice(props.conversationId, notice.value.trim())
  emit('toast', '群资料已保存')
  emit('close')
}

function removeMember(memberName: string): void {
  store.removeMember(props.conversationId, memberName)
  emit('toast', `已将 ${memberName} 移出群聊`)
}
</script>

<template>
  <PopupDialog
    :visible="visible"
    title="群管理"
    subtitle="编辑群资料、群公告与成员"
    width="460px"
    height="560px"
    :padded="false"
    @close="emit('close')"
  >
    <div class="h-full overflow-y-auto px-6 py-2">
      <label class="mb-1 block text-micro text-secondary-foreground">群名称</label>
      <input v-model="name" class="app-field h-9 w-full px-2 text-small" />

      <label class="mt-3 mb-1 block text-micro text-secondary-foreground">群公告</label>
      <textarea
        v-model="notice"
        rows="3"
        class="app-field w-full resize-none px-2 py-1.5 text-small"
      />

      <div class="mt-4 flex items-center justify-between">
        <span class="text-micro text-secondary-foreground">群成员（{{ members.length }}）</span>
        <button
          type="button"
          class="inline-flex items-center gap-1 text-micro text-link hover:text-link-hover"
          @click="emit('open-qr')"
        >
          <AppIcon name="ion:qr-code" :size="12" />
          群二维码
        </button>
      </div>

      <div class="mt-2 grid grid-cols-4 gap-2">
        <div
          v-for="member in members"
          :key="member.name"
          class="group relative flex flex-col items-center gap-1 rounded-md py-2 hover:bg-item-hover"
        >
          <Avatar :name="member.name" :index="member.index" :size="36" />
          <span class="max-w-full truncate text-micro text-foreground">{{ member.name }}</span>
          <span class="text-[10px] text-tertiary-foreground">{{ member.role || '成员' }}</span>
          <button
            type="button"
            class="absolute top-1 right-1 hidden h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] text-on-accent group-hover:flex"
            title="移出群聊"
            @click="removeMember(member.name)"
          >
            ×
          </button>
        </div>
      </div>

      <div class="mt-5 rounded-md bg-item-hover p-3">
        <p class="text-micro text-secondary-foreground">
          群主：{{ conversation?.owner || '林晓' }}
        </p>
        <p class="mt-1 text-micro text-tertiary-foreground">
          成员变动会实时同步到群成员列表，移出成员后其历史消息仍然保留。
        </p>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="mr-auto inline-flex h-9 items-center justify-center rounded-sm px-2 text-small text-danger transition-colors hover:bg-item-hover"
        @click="emit('leave')"
      >
        退出群聊
      </button>
      <button type="button" class="btn-primary h-9 px-5" @click="save">保存</button>
    </template>
  </PopupDialog>
</template>
