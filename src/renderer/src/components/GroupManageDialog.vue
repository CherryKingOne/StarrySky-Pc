<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import ConfirmDialog from '@renderer/components/ConfirmDialog.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'
import { useAppStore } from '@renderer/stores/app'
import { useContactsStore } from '@renderer/stores/contacts'
import { useConversationsStore } from '@renderer/stores/conversations'
import type { MemberInfo } from '@renderer/types'

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
const contacts = useContactsStore()
const app = useAppStore()

const name = ref('')
const notice = ref('')
const selectedMember = ref<MemberInfo | null>(null)
const inviteSelected = ref<string[]>([])
const showInvite = ref(false)
const showDisband = ref(false)

const conversation = computed(
  () => store.list.find((item) => item.id === props.conversationId) ?? null
)

watch(
  () => [props.visible, props.conversationId],
  () => {
    if (!props.visible) return
    name.value = conversation.value?.name ?? ''
    notice.value = conversation.value?.notice ?? ''
    selectedMember.value = null
    showInvite.value = false
    inviteSelected.value = []
    void store.loadGroupInfo(props.conversationId)
    void contacts.load()
  },
  { immediate: true }
)

const members = computed(() => conversation.value?.members ?? [])
const myRole = computed(() => conversation.value?.myRole ?? 0)
const isOwner = computed(() => myRole.value === 2)
const isAdmin = computed(() => myRole.value >= 1)
const meId = computed(() => app.user?.userId ?? '')

const invitable = computed(() => {
  const memberIds = new Set(members.value.map((item) => item.userId))
  return contacts.friends.filter((friend) => friend.userId && !memberIds.has(friend.userId))
})

function selectMember(member: MemberInfo): void {
  selectedMember.value = selectedMember.value?.userId === member.userId ? null : member
}

async function save(): Promise<void> {
  try {
    if (name.value.trim()) await store.updateGroupName(props.conversationId, name.value.trim())
    await store.updateGroupNotice(props.conversationId, notice.value.trim())
    emit('toast', '群资料已保存')
    emit('close')
  } catch (error) {
    emit('toast', error instanceof Error ? error.message : '保存失败')
  }
}

async function run(action: () => Promise<void>, success: string, close = false): Promise<void> {
  try {
    await action()
    emit('toast', success)
    if (close) emit('close')
  } catch (error) {
    emit('toast', error instanceof Error ? error.message : '操作失败')
  }
}

function setAdmin(): void {
  const member = selectedMember.value
  if (!member?.userId) return
  const admin = member.role !== '管理员'
  void run(
    () => store.setGroupAdmin(props.conversationId, member.userId!, admin),
    admin ? '已设为管理员' : '已取消管理员'
  )
}

function mute(): void {
  const member = selectedMember.value
  if (!member?.userId) return
  void run(() => store.muteGroupMember(props.conversationId, member.userId!, 600), '已禁言 10 分钟')
}

function remove(): void {
  const member = selectedMember.value
  if (!member?.userId) return
  void run(
    () => store.removeGroupMember(props.conversationId, member.userId!, member.name),
    `已将 ${member.name} 移出群聊`
  ).then(() => {
    selectedMember.value = null
  })
}

function transfer(): void {
  const member = selectedMember.value
  if (!member?.userId || member.userId === meId.value || member.targetType === 'AGENT') return
  void run(
    () => store.transferGroupOwner(props.conversationId, member.userId!),
    `已将群主转让给 ${member.name}`
  ).then(() => {
    selectedMember.value = null
  })
}

function toggleInvite(userId: string): void {
  const index = inviteSelected.value.indexOf(userId)
  if (index > -1) inviteSelected.value.splice(index, 1)
  else inviteSelected.value.push(userId)
}

function sendInvite(): void {
  if (inviteSelected.value.length === 0) return
  void run(
    () => store.inviteGroupMembers(props.conversationId, inviteSelected.value),
    '已邀请成员入群'
  ).then(() => {
    inviteSelected.value = []
    showInvite.value = false
  })
}

function disband(): void {
  showDisband.value = false
  void run(() => store.disbandGroup(props.conversationId), '群聊已解散', true)
}
</script>

<template>
  <PopupDialog
    :visible="visible"
    title="群管理"
    subtitle="编辑群资料、群公告与成员"
    width="520px"
    height="620px"
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
        <div class="flex items-center gap-3">
          <button
            v-if="isAdmin"
            type="button"
            class="inline-flex items-center gap-1 text-micro text-link hover:text-link-hover"
            @click="showInvite = !showInvite"
          >
            <AppIcon name="ion:person-add" :size="12" />
            邀请成员
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1 text-micro text-link hover:text-link-hover"
            @click="emit('open-qr')"
          >
            <AppIcon name="ion:qr-code" :size="12" />
            群二维码
          </button>
        </div>
      </div>

      <div v-if="showInvite" class="mt-2 rounded-md bg-item-hover p-2">
        <div v-if="invitable.length > 0" class="max-h-40 overflow-y-auto">
          <button
            v-for="friend in invitable"
            :key="friend.id"
            type="button"
            class="flex h-10 w-full items-center gap-2 rounded-sm px-2 text-left transition-colors hover:bg-panel"
            @click="toggleInvite(friend.userId!)"
          >
            <Avatar
              :name="friend.name"
              :index="friend.avatarIndex"
              :avatar-url="friend.avatarUrl"
              :size="32"
            />
            <span class="min-w-0 flex-1 truncate text-small text-foreground">
              {{ friend.name
              }}<span
                v-if="friend.targetType === 'AGENT'"
                class="ml-1 text-micro text-tertiary-foreground"
                >Agent</span
              >
            </span>
            <span
              class="flex h-4 w-4 items-center justify-center rounded-sm border text-[10px]"
              :class="
                inviteSelected.includes(friend.userId!)
                  ? 'border-accent bg-accent text-on-accent'
                  : 'border-border bg-input'
              "
            >
              {{ inviteSelected.includes(friend.userId!) ? '✓' : '' }}
            </span>
          </button>
        </div>
        <p v-else class="py-2 text-center text-micro text-tertiary-foreground">没有可邀请的好友</p>
        <div class="mt-2 flex justify-end gap-2">
          <button
            type="button"
            class="text-micro text-tertiary-foreground"
            @click="showInvite = false"
          >
            取消
          </button>
          <button
            type="button"
            class="btn-primary h-7 px-3 text-micro"
            :disabled="inviteSelected.length === 0"
            @click="sendInvite"
          >
            邀请 {{ inviteSelected.length }} 人
          </button>
        </div>
      </div>

      <div class="mt-2 grid grid-cols-4 gap-2">
        <button
          v-for="member in members"
          :key="member.userId || member.name"
          type="button"
          class="group relative flex flex-col items-center gap-1 rounded-md py-2 transition-colors"
          :class="
            selectedMember?.userId === member.userId ? 'bg-conv-active' : 'hover:bg-item-hover'
          "
          @click="selectMember(member)"
        >
          <Avatar
            :name="member.name"
            :index="member.index"
            :avatar-url="member.avatarUrl"
            :size="36"
          />
          <span class="max-w-full truncate text-micro text-foreground">{{ member.name }}</span>
          <span class="text-[10px] text-tertiary-foreground">
            {{ member.role || '成员'
            }}<template v-if="member.targetType === 'AGENT'"> · Agent</template>
          </span>
        </button>
      </div>

      <div
        v-if="selectedMember"
        class="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-item-hover p-2"
      >
        <span class="mr-auto text-micro text-secondary-foreground">
          已选择：{{ selectedMember.name }}
        </span>
        <button
          v-if="isAdmin && selectedMember.userId !== meId"
          type="button"
          class="h-7 rounded-sm border border-border bg-input px-2 text-micro text-foreground hover:bg-panel"
          @click="setAdmin"
        >
          {{ selectedMember.role === '管理员' ? '取消管理员' : '设为管理员' }}
        </button>
        <button
          v-if="isAdmin && selectedMember.userId !== meId"
          type="button"
          class="h-7 rounded-sm border border-border bg-input px-2 text-micro text-foreground hover:bg-panel"
          @click="mute"
        >
          禁言 10 分钟
        </button>
        <button
          v-if="isOwner && selectedMember.userId !== meId && selectedMember.targetType !== 'AGENT'"
          type="button"
          class="h-7 rounded-sm border border-border bg-input px-2 text-micro text-foreground hover:bg-panel"
          @click="transfer"
        >
          转让群主
        </button>
        <button
          v-if="isAdmin && selectedMember.userId !== meId"
          type="button"
          class="h-7 rounded-sm border border-border bg-input px-2 text-micro text-danger hover:bg-panel"
          @click="remove"
        >
          移出群聊
        </button>
      </div>

      <div class="mt-5 rounded-md bg-item-hover p-3">
        <p class="text-micro text-secondary-foreground">
          群主：{{ conversation?.owner || '未知' }} · 我的角色：{{
            isOwner ? '群主' : isAdmin ? '管理员' : '成员'
          }}
        </p>
        <p class="mt-1 text-micro text-tertiary-foreground">
          成员变动会实时同步到群成员列表，移出成员后其历史消息仍然保留。
        </p>
      </div>
    </div>

    <template #footer>
      <div class="mr-auto flex items-center gap-3">
        <button
          type="button"
          class="inline-flex h-9 items-center justify-center rounded-sm px-2 text-small text-danger transition-colors hover:bg-item-hover"
          @click="emit('leave')"
        >
          退出群聊
        </button>
        <button
          v-if="isOwner"
          type="button"
          class="inline-flex h-9 items-center justify-center rounded-sm px-2 text-small text-danger transition-colors hover:bg-item-hover"
          @click="showDisband = true"
        >
          解散群聊
        </button>
      </div>
      <button type="button" class="btn-primary h-9 px-5" @click="save">保存</button>
    </template>

    <ConfirmDialog
      :visible="showDisband"
      title="解散群聊"
      description="解散后所有成员将无法继续查看该群会话，且操作不可恢复。"
      confirm-text="解散"
      danger
      @cancel="showDisband = false"
      @confirm="disband"
    />
  </PopupDialog>
</template>
