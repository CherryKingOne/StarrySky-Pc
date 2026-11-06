<script setup lang="ts">
import ContextMenu, { type MenuItem } from '@renderer/components/ContextMenu.vue'

const props = withDefaults(
  defineProps<{
    visible?: boolean
    anchor?: HTMLElement | null
  }>(),
  { visible: false, anchor: null }
)

const emit = defineEmits<{
  'update:visible': [value: boolean]
  select: [key: string]
}>()

const items: MenuItem[] = [
  { key: 'startChat', label: '发起会话', icon: 'ion:chatboxes' },
  { key: 'addFriend', label: '添加好友', icon: 'ion:android-contact' },
  { key: 'createGroup', label: '创建群聊', icon: 'ion:people' },
  { key: 'scan', label: '扫一扫', icon: 'ion:qr-scanner' }
]
</script>

<template>
  <ContextMenu
    :visible="props.visible"
    :items="items"
    :x="80"
    :y="72"
    :anchor="props.anchor"
    @update:visible="emit('update:visible', $event)"
    @select="emit('select', $event)"
  />
</template>
