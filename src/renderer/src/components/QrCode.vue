<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ size?: number; value?: string }>(), {
  size: 250,
  value: 'starrysky://login'
})

const MODULES = 25
const cellSize = computed(() => props.size / MODULES)

interface Cell {
  x: number
  y: number
}

function hash(value: string): number {
  let result = 2166136261
  for (const char of value) {
    result ^= char.charCodeAt(0)
    result = Math.imul(result, 16777619)
  }
  return Math.abs(result)
}

function isFinderZone(x: number, y: number): boolean {
  const finder = 7
  const offset = MODULES - finder
  const topLeft = x < finder && y < finder
  const topRight = x >= offset && y < finder
  const bottomLeft = x < finder && y >= offset
  return topLeft || topRight || bottomLeft
}

const cells = computed<Cell[]>(() => {
  const seed = hash(props.value)
  const result: Cell[] = []
  for (let y = 0; y < MODULES; y += 1) {
    for (let x = 0; x < MODULES; x += 1) {
      if (isFinderZone(x, y)) continue
      const bit = (seed >> ((x * 7 + y * 13) % 24)) & 1
      if (bit) result.push({ x, y })
    }
  }
  return result
})

const finders = computed(() => {
  const offset = MODULES - 7
  return [
    { key: 'tl', x: 0, y: 0 },
    { key: 'tr', x: offset, y: 0 },
    { key: 'bl', x: 0, y: offset }
  ]
})
</script>

<template>
  <svg
    :viewBox="`0 0 ${size} ${size}`"
    :width="size"
    :height="size"
    class="block rounded-md text-foreground"
  >
    <rect width="100%" height="100%" class="fill-background" />
    <rect
      v-for="cell in cells"
      :key="`${cell.x}-${cell.y}`"
      :x="cell.x * cellSize"
      :y="cell.y * cellSize"
      :width="cellSize"
      :height="cellSize"
      class="fill-current"
    />
    <g v-for="finder in finders" :key="finder.key">
      <rect
        :x="finder.x * cellSize"
        :y="finder.y * cellSize"
        :width="7 * cellSize"
        :height="7 * cellSize"
        class="fill-foreground"
      />
      <rect
        :x="(finder.x + 1) * cellSize"
        :y="(finder.y + 1) * cellSize"
        :width="5 * cellSize"
        :height="5 * cellSize"
        class="fill-background"
      />
      <rect
        :x="(finder.x + 2) * cellSize"
        :y="(finder.y + 2) * cellSize"
        :width="3 * cellSize"
        :height="3 * cellSize"
        class="fill-foreground"
      />
    </g>
  </svg>
</template>
