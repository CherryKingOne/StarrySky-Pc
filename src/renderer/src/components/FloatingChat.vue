<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import { useConversationsStore } from '@renderer/stores/conversations'

const props = withDefaults(
  defineProps<{
    visible: boolean
    conversationId?: string
  }>(),
  { conversationId: '' }
)

const emit = defineEmits<{
  close: []
  expand: [conversationId: string]
}>()

const store = useConversationsStore()
const panel = ref<HTMLDivElement | null>(null)
const position = ref({ left: 0, top: 0 })
const offset = ref({ x: 0, y: 0 })
const dragging = ref(false)
const text = ref('')
const listEl = ref<HTMLDivElement | null>(null)

const conversation = computed(() => store.list.find((item) => item.id === props.conversationId))

function clampPosition(left: number, top: number): { left: number; top: number } {
  const app = document.getElementById('app')
  const root = app
    ? app.getBoundingClientRect()
    : new DOMRect(0, 0, window.innerWidth, window.innerHeight)
  const width = panel.value?.offsetWidth ?? 360
  const height = panel.value?.offsetHeight ?? 520
  return {
    left: Math.max(8, Math.min(left, root.width - width - 8)),
    top: Math.max(8, Math.min(top, root.height - height - 8))
  }
}

function resetPosition(): void {
  const app = document.getElementById('app')
  const root = app
    ? app.getBoundingClientRect()
    : new DOMRect(0, 0, window.innerWidth, window.innerHeight)
  position.value = clampPosition(root.width - 380, root.height - 560)
}

watch(
  () => [props.visible, props.conversationId],
  () => {
    if (!props.visible) return
    resetPosition()
    void nextTick(scrollToBottom)
  }
)

function onPointerDown(event: PointerEvent): void {
  dragging.value = true
  offset.value = { x: event.clientX - position.value.left, y: event.clientY - position.value.top }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!dragging.value) return
  position.value = clampPosition(event.clientX - offset.value.x, event.clientY - offset.value.y)
}

function onPointerUp(): void {
  dragging.value = false
}

async function scrollToBottom(): Promise<void> {
  await nextTick()
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight
}

function send(): void {
  const value = text.value.trim()
  if (!value || !props.conversationId) return
  store.pushMessage(props.conversationId, {
    id: `float-${Date.now()}`,
    direction: 'out',
    kind: 'text',
    time: new Date().toTimeString().slice(0, 5),
    text: value
  })
  text.value = ''
  void scrollToBottom()
}
</script>

<template>
  <Teleport to="#app">
    <div
      v-if="visible && conversation"
      ref="panel"
      class="popup-layer absolute z-[75] flex h-[520px] w-[360px] flex-col overflow-hidden rounded-lg border border-border-soft bg-modal shadow-modal"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }"
    >
      <header
        class="flex h-12 shrink-0 cursor-move items-center gap-2 border-b border-divider bg-panel px-3 select-none"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <Avatar :name="conversation.name" :index="conversation.avatarIndex" :size="32" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-small text-foreground">{{ conversation.name }}</p>
          <p class="truncate text-micro text-tertiary-foreground">会话浮窗 · 可拖动</p>
        </div>
        <button
          v-tooltip="'在独立窗口打开'"
          type="button"
          class="icon-button h-7 w-7 rounded-sm"
          @click="emit('expand', conversation.id)"
        >
          <AppIcon name="ion:ios-expand" :size="16" />
        </button>
        <button
          v-tooltip="'关闭浮窗'"
          type="button"
          class="icon-button h-7 w-7 rounded-sm"
          @click="emit('close')"
        >
          <AppIcon name="ion:close" :size="16" />
        </button>
      </header>

      <div ref="listEl" class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <p
          v-if="conversation.messages.length === 0"
          class="mt-6 text-center text-caption text-tertiary-foreground"
        >
          暂无消息，发送第一条吧
        </p>
        <AppIcon v-else name="ion:chatbubbles" :size="0" class="hidden" />
        <div
          v-for="message in conversation.messages"
          :key="message.id"
          class="mb-3 flex"
          :class="message.direction === 'out' ? 'justify-end' : 'justify-start'"
        >
          <p
            v-if="message.kind === 'notification'"
            class="w-full text-center text-micro text-tertiary-foreground"
          >
            {{ message.text }}
          </p>
          <div
            v-else
            class="max-w-[78%] rounded-md px-2.5 py-1.5 text-small"
            :class="
              message.direction === 'out'
                ? 'bg-message-out text-on-accent'
                : 'bg-message-in text-foreground'
            "
          >
            {{
              message.text ||
              message.fileName ||
              message.imageLabel ||
              message.forwardTitle ||
              '[消息]'
            }}
          </div>
        </div>
      </div>

      <footer class="flex shrink-0 items-center gap-2 border-t border-divider px-3 py-2">
        <input
          v-model="text"
          class="app-field h-8 flex-1 px-2 text-small"
          placeholder="输入消息"
          @keydown.enter.prevent="send"
        />
        <button type="button" class="btn-primary h-8 w-14" @click="send">发送</button>
      </footer>
    </div>
  </Teleport>
</template>
