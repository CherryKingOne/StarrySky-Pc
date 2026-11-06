<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    title?: string
  }>(),
  { title: '选择日期' }
)

const emit = defineEmits<{
  close: []
  confirm: [value: string]
}>()

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']

const cursor = ref(new Date())
const selectedKey = ref('')

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      cursor.value = new Date()
      selectedKey.value = ''
    }
  }
)

const year = computed(() => cursor.value.getFullYear())
const month = computed(() => cursor.value.getMonth())

const monthLabel = computed(() => `${year.value} 年 ${month.value + 1} 月`)

interface DayCell {
  key: string
  day: number
  muted: boolean
  today: boolean
}

const cells = computed<DayCell[]>(() => {
  const first = new Date(year.value, month.value, 1)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(year.value, month.value + 1, 0).getDate()
  const today = new Date()
  const result: DayCell[] = []
  for (let i = 0; i < offset; i += 1) {
    result.push({ key: `prev-${i}`, day: 0, muted: true, today: false })
  }
  for (let day = 1; day <= days; day += 1) {
    result.push({
      key: `${year.value}-${month.value + 1}-${day}`,
      day,
      muted: false,
      today:
        today.getFullYear() === year.value &&
        today.getMonth() === month.value &&
        today.getDate() === day
    })
  }
  return result
})

const selectedLabel = computed(() => {
  if (!selectedKey.value) return ''
  const [y, m, d] = selectedKey.value.split('-')
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
})

function shiftMonth(delta: number): void {
  cursor.value = new Date(year.value, month.value + delta, 1)
}

function confirm(): void {
  if (!selectedKey.value) return
  emit('confirm', selectedLabel.value)
  emit('close')
}
</script>

<template>
  <PopupDialog
    :visible="visible"
    :title="title"
    subtitle="选择提醒或筛选的日期"
    width="300px"
    @close="emit('close')"
  >
    <div class="flex items-center justify-between px-1">
      <button
        v-tooltip="'上个月'"
        type="button"
        class="icon-button h-7 w-7 rounded-sm"
        @click="shiftMonth(-1)"
      >
        <AppIcon name="ion:ios-arrow-left" :size="14" />
      </button>
      <span class="text-label text-foreground">{{ monthLabel }}</span>
      <button
        v-tooltip="'下个月'"
        type="button"
        class="icon-button h-7 w-7 rounded-sm"
        @click="shiftMonth(1)"
      >
        <AppIcon name="ion:ios-arrow-right" :size="14" />
      </button>
    </div>

    <div class="mt-3 grid grid-cols-7 gap-y-1">
      <span
        v-for="label in WEEK_LABELS"
        :key="label"
        class="h-5 text-center text-micro text-tertiary-foreground"
      >
        {{ label }}
      </span>
      <button
        v-for="cell in cells"
        :key="cell.key"
        type="button"
        class="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-small transition-colors"
        :class="[
          cell.muted ? 'pointer-events-none opacity-0' : '',
          selectedKey === cell.key
            ? 'bg-accent text-on-accent'
            : cell.today
              ? 'text-accent hover:bg-item-hover'
              : 'text-foreground hover:bg-item-hover'
        ]"
        @click="selectedKey = cell.key"
      >
        {{ cell.day || '' }}
      </button>
    </div>

    <template #footer>
      <span class="mr-auto text-caption text-secondary-foreground">
        {{ selectedLabel || '未选择日期' }}
      </span>
      <button
        type="button"
        class="btn-primary h-9 px-5 disabled:opacity-50"
        :disabled="!selectedKey"
        @click="confirm"
      >
        确定
      </button>
    </template>
  </PopupDialog>
</template>
