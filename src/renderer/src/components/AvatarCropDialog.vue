<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Avatar from '@renderer/components/Avatar.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    name: string
    current?: number
  }>(),
  { current: 1 }
)

const emit = defineEmits<{
  close: []
  confirm: [index: number]
}>()

const TONES = [1, 2, 3, 4, 5, 6]
const selected = ref(props.current)
const zoom = ref(1)

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      selected.value = props.current
      zoom.value = 1
    }
  }
)

const size = computed(() => Math.round(96 * zoom.value))
</script>

<template>
  <PopupDialog
    :visible="visible"
    title="头像裁剪"
    subtitle="选择头像底色并调整显示比例"
    width="360px"
    @close="emit('close')"
  >
    <div class="flex flex-col items-center">
      <div
        class="flex h-[160px] w-[160px] items-center justify-center overflow-hidden rounded-lg bg-item-hover"
      >
        <Avatar
          :name="name"
          :index="selected"
          :size="96"
          :style="{ transform: `scale(${zoom})` }"
        />
      </div>

      <div class="mt-4 flex items-center gap-2">
        <button
          v-for="tone in TONES"
          :key="tone"
          type="button"
          class="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
          :class="[`bg-avatar-${tone}`, selected === tone ? 'border-accent' : 'border-transparent']"
          :title="`头像底色 ${tone}`"
          @click="selected = tone"
        />
      </div>

      <div class="mt-4 flex w-full items-center gap-3">
        <span class="text-micro text-tertiary-foreground">缩放</span>
        <input v-model.number="zoom" type="range" min="0.8" max="1.4" step="0.05" class="flex-1" />
        <span class="w-10 text-right text-micro text-secondary-foreground"
          >{{ Math.round(zoom * 100) }}%</span
        >
      </div>
      <p class="mt-2 text-micro text-tertiary-foreground">预览尺寸 {{ size }}px · 首字头像</p>
    </div>

    <template #footer>
      <button
        type="button"
        class="inline-flex h-9 items-center justify-center rounded-sm border border-border bg-input px-4 text-label text-foreground transition-colors hover:bg-item-hover"
        @click="emit('close')"
      >
        取消
      </button>
      <button type="button" class="btn-primary h-9 px-4" @click="emit('confirm', selected)">
        保存头像
      </button>
    </template>
  </PopupDialog>
</template>
