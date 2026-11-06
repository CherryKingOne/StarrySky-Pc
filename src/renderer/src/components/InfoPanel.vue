<script setup lang="ts">
import Avatar from '@renderer/components/Avatar.vue'
import IconButton from '@renderer/components/IconButton.vue'

interface PanelMember {
  name: string
  index: number
}

withDefaults(
  defineProps<{
    title: string
    subtitle: string
    avatarIndex: number
    members?: PanelMember[]
    notice?: string
  }>(),
  {
    members: () => [],
    notice: ''
  }
)

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <aside class="flex h-full w-info shrink-0 flex-col border-l border-divider bg-info-panel">
    <div class="flex items-center justify-between px-5 pt-5">
      <h3 class="text-section text-foreground">聊天信息</h3>
      <IconButton icon="ion:close" :size="18" :box="28" @click="emit('close')" />
    </div>

    <div class="mt-4 flex justify-center px-5">
      <Avatar :name="title" :index="avatarIndex" :size="36" />
    </div>
    <h4 class="mt-3 px-5 text-center text-section text-foreground">{{ title }}</h4>
    <p class="mt-1 px-5 text-center text-caption text-secondary-foreground">{{ subtitle }}</p>

    <div class="section-divider mx-5 mt-5" />

    <div class="mt-5 px-5">
      <p class="text-caption text-secondary-foreground">群成员（{{ members.length || 5 }}）</p>
      <div class="mt-3 flex items-center gap-3">
        <Avatar
          v-for="member in members"
          :key="member.name"
          :name="member.name"
          :index="member.index"
          :size="32"
          :rounded="false"
        />
      </div>
      <button
        type="button"
        class="mt-4 flex h-10 w-full items-center justify-center rounded-md bg-item-hover text-small text-secondary-foreground transition-colors hover:text-foreground"
      >
        查看全部 {{ members.length || 5 }} 位群成员
      </button>
    </div>

    <div class="section-divider mx-5 mt-5" />

    <div class="mt-4 px-5">
      <p class="text-caption text-secondary-foreground">群公告</p>
      <p class="mt-2 text-small text-foreground">
        {{ notice || '本周五下午 15:00 进行版本评审，请提前提交设计稿。' }}
      </p>
    </div>
  </aside>
</template>
