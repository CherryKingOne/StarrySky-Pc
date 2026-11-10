<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import OptionPickerDialog from '@renderer/components/OptionPickerDialog.vue'
import PopupDialog from '@renderer/components/PopupDialog.vue'
import type { MomentAuthor, PublishMomentPayload } from '@renderer/stores/moments'
import {
  MOMENT_LOCATION_OPTIONS,
  MOMENT_MAX_IMAGES,
  MOMENT_MAX_LENGTH,
  MOMENT_VISIBILITY_OPTIONS,
  NO_LOCATION,
  readImageFile
} from '@renderer/utils/moments'

const props = defineProps<{
  visible: boolean
  author: MomentAuthor
}>()

const emit = defineEmits<{
  close: []
  publish: [payload: PublishMomentPayload]
  toast: [message: string]
}>()

const content = ref('')
const images = ref<string[]>([])
const location = ref(NO_LOCATION)
const visibility = ref(MOMENT_VISIBILITY_OPTIONS[0])
const showLocation = ref(false)
const showVisibility = ref(false)
const picking = ref(false)

watch(
  () => props.visible,
  (visible) => {
    if (!visible) return
    content.value = ''
    images.value = []
    location.value = NO_LOCATION
    visibility.value = MOMENT_VISIBILITY_OPTIONS[0]
    showLocation.value = false
    showVisibility.value = false
  }
)

const remaining = computed(() => MOMENT_MAX_LENGTH - content.value.length)
const canPublish = computed(() => Boolean(content.value.trim() || images.value.length))

async function onPickFiles(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (!files.length || picking.value) return

  picking.value = true
  try {
    for (const file of files.slice(0, MOMENT_MAX_IMAGES - images.value.length)) {
      const dataUrl = await readImageFile(file)
      images.value.push(dataUrl)
    }
  } catch (error) {
    emit('toast', error instanceof Error ? error.message : '图片读取失败')
  } finally {
    picking.value = false
  }
}

function removeImage(index: number): void {
  images.value.splice(index, 1)
}

function submit(): void {
  if (!canPublish.value) return
  emit('publish', {
    content: content.value.trim(),
    images: [...images.value],
    location: location.value,
    visibility: visibility.value
  })
}

function onComposerKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submit()
}
</script>

<template>
  <PopupDialog
    :visible="visible"
    title="发布动态"
    width="600px"
    :padded="false"
    @close="emit('close')"
  >
    <div class="px-6 pb-1">
      <div class="flex items-center gap-3">
        <Avatar
          :name="author.name"
          :index="author.avatarIndex"
          :avatar-url="author.avatarUrl"
          :size="36"
        />
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <p class="truncate text-label text-foreground">{{ author.name }}</p>
            <span
              v-if="author.type === 'AGENT'"
              class="rounded-full bg-accent-subtle px-1.5 py-0.5 text-micro leading-none text-accent"
            >
              Agent
            </span>
          </div>
          <p class="mt-0.5 text-micro text-tertiary-foreground">{{ visibility }}</p>
        </div>
      </div>

      <textarea
        v-model="content"
        :maxlength="MOMENT_MAX_LENGTH"
        class="mt-3 min-h-[120px] w-full resize-none rounded-md bg-tertiary p-3 text-small leading-relaxed text-foreground outline-none placeholder:text-placeholder-foreground"
        placeholder="这一刻的想法…"
        @keydown="onComposerKeydown"
      />
      <p class="text-right text-micro text-tertiary-foreground">还可以输入 {{ remaining }} 字</p>

      <div class="mt-1 flex flex-wrap gap-2">
        <div
          v-for="(image, index) in images"
          :key="`draft-image-${index}`"
          class="group relative h-24 w-24 overflow-hidden rounded-md"
        >
          <img :src="image" alt="待发布图片" class="h-full w-full object-cover" />
          <button
            v-tooltip="'移除图片'"
            type="button"
            class="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
            @click="removeImage(index)"
          >
            <AppIcon name="ion:close" :size="12" />
          </button>
        </div>

        <label
          v-if="images.length < MOMENT_MAX_IMAGES"
          class="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-strong bg-secondary text-tertiary-foreground transition-colors hover:bg-item-hover"
        >
          <AppIcon name="ion:ios-plus-outline" :size="18" />
          <span class="text-micro">{{ picking ? '处理中' : '添加图片' }}</span>
          <input
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            :disabled="picking"
            @change="onPickFiles"
          />
        </label>
      </div>

      <div class="mt-3 border-t border-divider">
        <button
          type="button"
          class="flex h-10 w-full items-center gap-2 text-small text-foreground"
          @click="showLocation = true"
        >
          <AppIcon name="ion:ios-location" :size="14" class="shrink-0 text-icon" />
          <span class="shrink-0">所在位置</span>
          <span class="ml-auto truncate text-caption text-tertiary-foreground">{{ location }}</span>
          <AppIcon name="ion:ios-arrow-right" :size="12" class="shrink-0 text-icon" />
        </button>
        <div class="h-px w-full bg-divider" />
        <button
          type="button"
          class="flex h-10 w-full items-center gap-2 text-small text-foreground"
          @click="showVisibility = true"
        >
          <AppIcon name="ion:ios-people" :size="14" class="shrink-0 text-icon" />
          <span class="shrink-0">谁可以看</span>
          <span class="ml-auto truncate text-caption text-tertiary-foreground">
            {{ visibility }}
          </span>
          <AppIcon name="ion:ios-arrow-right" :size="12" class="shrink-0 text-icon" />
        </button>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="h-8 rounded-md border border-border px-4 text-small text-foreground transition-colors hover:bg-item-hover"
        @click="emit('close')"
      >
        取消
      </button>
      <button type="button" class="btn-primary h-8 px-5" :disabled="!canPublish" @click="submit">
        发布
      </button>
    </template>
  </PopupDialog>

  <OptionPickerDialog
    :visible="showLocation"
    title="所在位置"
    :options="MOMENT_LOCATION_OPTIONS"
    :model-value="location"
    @close="showLocation = false"
    @confirm="location = $event"
  />
  <OptionPickerDialog
    :visible="showVisibility"
    title="谁可以看"
    :options="MOMENT_VISIBILITY_OPTIONS"
    :model-value="visibility"
    @close="showVisibility = false"
    @confirm="visibility = $event"
  />
</template>
