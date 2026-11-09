<script setup lang="ts">
import { ref } from 'vue'
import AddFriendDialog from '@renderer/components/AddFriendDialog.vue'
import CreateGroupDialog from '@renderer/components/CreateGroupDialog.vue'
import ScanQrDialog from '@renderer/components/ScanQrDialog.vue'
import StartChatDialog from '@renderer/components/StartChatDialog.vue'

const emit = defineEmits<{
  start: [payload: { userId: string; name: string; index: number }]
  create: [payload: { name: string; members: { userId: string; name: string; index: number }[] }]
  friend: [name: string]
  selfChat: []
  toast: [message: string]
}>()

const showStart = ref(false)
const showFriend = ref(false)
const showGroup = ref(false)
const showScan = ref(false)

/** 加号菜单（P15-13）统一入口 */
function open(key: string): void {
  switch (key) {
    case 'startChat':
      showStart.value = true
      break
    case 'addFriend':
      showFriend.value = true
      break
    case 'createGroup':
      showGroup.value = true
      break
    case 'scan':
      showScan.value = true
      break
    default:
      emit('toast', '请选择有效操作')
  }
}

defineExpose({ open })
</script>

<template>
  <StartChatDialog :visible="showStart" @close="showStart = false" @start="emit('start', $event)" />
  <AddFriendDialog
    :visible="showFriend"
    @close="showFriend = false"
    @sent="emit('friend', $event)"
    @self-chat="emit('selfChat')"
    @start-chat="
      emit('start', { userId: $event.userId ?? '', name: $event.name, index: $event.avatarIndex })
    "
    @toast="emit('toast', $event)"
  />
  <CreateGroupDialog
    :visible="showGroup"
    @close="showGroup = false"
    @create="emit('create', $event)"
  />
  <ScanQrDialog :visible="showScan" @close="showScan = false" @start="emit('start', $event)" />
</template>
