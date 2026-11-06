<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    title?: string
    subtitle?: string
    width?: string
    /** 仅这些日期可点击（YYYY-MM-DD）；不传表示所有日期可选 */
    enabledDates?: string[]
    /** 最早可选日期 */
    minDate?: string
    /** 禁用今天之后的日期 */
    disableFuture?: boolean
    /** 点击日期立即确认并关闭 */
    selectOnClick?: boolean
    /** 打开时定位到的日期与默认选中日期 */
    initialDate?: string
  }>(),
  {
    title: '选择日期',
    subtitle: '选择提醒或筛选的日期',
    width: '300px',
    minDate: '',
    disableFuture: false,
    selectOnClick: false,
    initialDate: ''
  }
)

const emit = defineEmits<{
  close: []
  confirm: [value: string]
}>()

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function keyOf(yearValue: number, monthValue: number, dayValue: number): string {
  return `${yearValue}-${pad(monthValue + 1)}-${pad(dayValue)}`
}

function todayKey(): string {
  const now = new Date()
  return keyOf(now.getFullYear(), now.getMonth(), now.getDate())
}

function dateFromKey(key: string): Date {
  const [yearValue, monthValue, dayValue] = key.split('-').map(Number)
  return new Date(yearValue, (monthValue || 1) - 1, dayValue || 1)
}

const cursor = ref(new Date())
const selectedKey = ref('')

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    cursor.value = props.initialDate ? dateFromKey(props.initialDate) : new Date()
    selectedKey.value = props.initialDate || ''
  }
)

const year = computed({
  get: () => cursor.value.getFullYear(),
  set: (value: number) => {
    cursor.value = new Date(value, cursor.value.getMonth(), 1)
  }
})

const month = computed({
  get: () => cursor.value.getMonth(),
  set: (value: number) => {
    cursor.value = new Date(cursor.value.getFullYear(), value, 1)
  }
})

/** 年份下拉：覆盖当前年份前后一段范围，切换后范围自动扩展 */
const yearOptions = computed(() => {
  const current = new Date().getFullYear()
  const target = year.value
  const start = Math.min(current - 20, target)
  const end = Math.max(current + 3, target)
  const list: number[] = []
  for (let value = start; value <= end; value += 1) list.push(value)
  return list
})

interface DayCell {
  key: string
  day: number
  muted: boolean
  today: boolean
  enabled: boolean
  hasMessages: boolean
}

const cells = computed<DayCell[]>(() => {
  const first = new Date(year.value, month.value, 1)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(year.value, month.value + 1, 0).getDate()
  const today = todayKey()
  const enabledSet = props.enabledDates ? new Set(props.enabledDates) : null
  const result: DayCell[] = []
  for (let i = 0; i < offset; i += 1) {
    result.push({
      key: `prev-${i}`,
      day: 0,
      muted: true,
      today: false,
      enabled: false,
      hasMessages: false
    })
  }
  for (let day = 1; day <= days; day += 1) {
    const key = keyOf(year.value, month.value, day)
    const hasMessages = enabledSet ? enabledSet.has(key) : true
    const enabled =
      hasMessages &&
      (!props.minDate || key >= props.minDate) &&
      (!props.disableFuture || key <= today)
    result.push({ key, day, muted: false, today: key === today, enabled, hasMessages })
  }
  return result
})

const selectedLabel = computed(() => selectedKey.value)

function shiftMonth(delta: number): void {
  cursor.value = new Date(year.value, month.value + delta, 1)
}

function pick(cell: DayCell): void {
  if (!cell.enabled) return
  selectedKey.value = cell.key
  if (props.selectOnClick) confirm()
}

function confirm(): void {
  if (!selectedKey.value) return
  emit('confirm', selectedKey.value)
  emit('close')
}
</script>

<template>
  <PopupDialog
    :visible="visible"
    :title="title"
    :subtitle="subtitle"
    :width="width"
    @close="emit('close')"
  >
    <div class="flex items-center justify-between gap-2 px-1">
      <button
        v-tooltip="'上个月'"
        type="button"
        class="icon-button h-7 w-7 shrink-0 rounded-sm"
        @click="shiftMonth(-1)"
      >
        <AppIcon name="ion:chevron-back" :size="14" />
      </button>
      <div class="flex min-w-0 items-center gap-1">
        <select
          v-model.number="year"
          class="h-7 min-w-0 rounded-sm border border-border bg-input px-1.5 text-small text-foreground outline-none"
        >
          <option v-for="item in yearOptions" :key="item" :value="item">{{ item }} 年</option>
        </select>
        <select
          v-model.number="month"
          class="h-7 shrink-0 rounded-sm border border-border bg-input px-1.5 text-small text-foreground outline-none"
        >
          <option v-for="item in 12" :key="item" :value="item - 1">{{ item }} 月</option>
        </select>
      </div>
      <button
        v-tooltip="'下个月'"
        type="button"
        class="icon-button h-7 w-7 shrink-0 rounded-sm"
        @click="shiftMonth(1)"
      >
        <AppIcon name="ion:chevron-forward" :size="14" />
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
        :disabled="!cell.enabled"
        class="relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-small transition-colors"
        :class="[
          cell.muted ? 'pointer-events-none opacity-0' : '',
          selectedKey === cell.key
            ? 'bg-accent text-on-accent'
            : !cell.enabled
              ? 'cursor-not-allowed text-tertiary-foreground opacity-40'
              : cell.today
                ? 'text-accent hover:bg-item-hover'
                : 'text-foreground hover:bg-item-hover'
        ]"
        @click="pick(cell)"
      >
        {{ cell.day || '' }}
        <span
          v-if="enabledDates && cell.enabled"
          class="absolute bottom-1 h-1 w-1 rounded-full bg-current"
        />
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
