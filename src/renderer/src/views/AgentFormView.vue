<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import Toast from '@renderer/components/Toast.vue'
import { useAgentsStore, AGENT_LIMIT } from '@renderer/stores/agents'
import { useAppStore } from '@renderer/stores/app'
import { getAgent, type AgentItem } from '@renderer/api/agents'
import { uploadFile } from '@renderer/api/files'
import { avatarIndexOf } from '@renderer/utils/chat'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const agents = useAgentsStore()

const agentId = computed(() => String(route.params.agentId ?? ''))
const isEdit = computed(() => route.name === 'agent-edit')
const nickname = ref('')
const signature = ref('')
const avatarUrl = ref<string | null>(null)
const uploading = ref(false)
const saving = ref(false)
const loading = ref(false)
const loadError = ref('')
const toastMessage = ref('')
const avatarInput = ref<HTMLInputElement | null>(null)

const nicknameError = computed(() => {
  const value = nickname.value.trim()
  if (!value) return '请填写 Agent 名称'
  if (value.length > 32) return '名称最多 32 个字符'
  return ''
})
const signatureError = computed(() => (signature.value.length > 128 ? '签名最多 128 个字符' : ''))
const canSave = computed(
  () =>
    !nicknameError.value &&
    !signatureError.value &&
    !saving.value &&
    !uploading.value &&
    (isEdit.value || agents.canCreate)
)
const previewIndex = computed(() => avatarIndexOf(nickname.value || 'A'))
const userName = computed(() => app.nickname)
const userId = computed(() => app.user?.userId ?? '')

function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}

function back(): void {
  void router.push('/agents')
}

async function loadAgent(): Promise<void> {
  if (!isEdit.value) return
  const cached = agents.list.find((item) => item.agentId === agentId.value)
  if (cached) {
    fill(cached)
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    if (agents.demo) throw new Error('本地示例模式下无法读取该 Agent')
    const agent = await getAgent(agents.userToken(), agentId.value)
    fill(agent)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载 Agent 失败'
  } finally {
    loading.value = false
  }
}

function fill(agent: AgentItem): void {
  nickname.value = agent.nickname
  signature.value = agent.signature ?? ''
  avatarUrl.value = agent.avatarUrl
}

onMounted(() => {
  void agents.load().then(loadAgent)
})

function pickAvatar(): void {
  avatarInput.value?.click()
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

async function onAvatarFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    showToast('头像图片不能超过 2MB')
    return
  }
  uploading.value = true
  try {
    if (agents.demo) {
      avatarUrl.value = await readAsDataUrl(file)
      return
    }
    const info = await uploadFile(app.userAccessToken || app.accessToken, file, 1)
    avatarUrl.value = info.url
  } catch (error) {
    showToast(error instanceof Error ? error.message : '头像上传失败')
  } finally {
    uploading.value = false
  }
}

async function save(): Promise<void> {
  if (!canSave.value) return
  saving.value = true
  try {
    const payload = {
      nickname: nickname.value.trim(),
      signature: signature.value.trim() || null,
      avatarUrl: avatarUrl.value
    }
    if (isEdit.value) {
      await agents.update(agentId.value, payload)
    } else {
      await agents.create(payload)
    }
    void router.push('/agents')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex h-full min-w-0 flex-1 flex-col bg-tertiary">
    <header class="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-6">
      <button
        v-tooltip="'返回'"
        type="button"
        class="icon-button h-8 w-8 border border-border bg-background"
        @click="back"
      >
        <AppIcon name="ion:chevron-back" :size="18" />
      </button>
      <div class="min-w-0">
        <h1 class="text-page text-foreground">
          {{ isEdit ? '编辑 Agent' : '创建 Agent' }}
        </h1>
        <p class="text-caption text-tertiary-foreground">
          {{
            isEdit
              ? '修改资料后立即生效，白名单请在列表中单独配置'
              : '填写资料后即可创建，名额与当前账号绑定'
          }}
        </p>
      </div>

      <span
        class="ml-auto inline-flex h-7 items-center gap-1 rounded-badge px-2.5 text-caption"
        :class="agents.canCreate ? 'bg-accent-subtle text-accent' : 'bg-[#FD802E14] text-warning'"
      >
        <span
          class="h-1.5 w-1.5 rounded-full"
          :class="agents.canCreate ? 'bg-status-success' : 'bg-status-warning'"
        />
        名额 {{ agents.activeCount }}/{{ AGENT_LIMIT }}
      </span>

      <span
        class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-input px-3 text-small text-foreground"
      >
        <Avatar
          :name="userName"
          :index="app.avatarIndex"
          :avatar-url="app.user?.avatarUrl"
          :size="28"
        />
        <span class="max-w-[96px] truncate">{{ userName }}</span>
        <span class="rounded-sm bg-background px-1.5 py-0.5 text-micro text-tertiary-foreground"
          >只读归属</span
        >
      </span>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto p-6">
      <div
        v-if="loadError"
        class="mx-auto mt-24 flex max-w-[420px] flex-col items-center gap-3 text-center"
      >
        <AppIcon name="ion:alert-circle-outline" :size="32" class="text-tertiary-foreground" />
        <p class="text-section text-foreground">无法加载该 Agent</p>
        <p class="text-caption text-tertiary-foreground">{{ loadError }}</p>
        <button type="button" class="btn-primary mt-2 h-8 px-4" @click="back">返回列表</button>
      </div>

      <div v-else-if="loading" class="mt-24 text-center text-caption text-tertiary-foreground">
        正在加载 Agent 资料…
      </div>

      <div
        v-else
        class="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)_360px] items-start gap-6"
      >
        <!-- 资料表单 -->
        <section class="rounded-lg bg-background p-7 shadow-card">
          <h2 class="text-section text-foreground">基础资料</h2>
          <p class="mt-1 text-caption text-tertiary-foreground">
            这些信息会展示在 Agent 的资料卡与发起会话的提示中
          </p>

          <div class="mt-6 flex items-center gap-4">
            <button
              type="button"
              class="group relative h-[72px] w-[72px] overflow-hidden rounded-[12px] bg-input"
              @click="pickAvatar"
            >
              <Avatar
                :name="nickname || 'A'"
                :index="previewIndex"
                :avatar-url="avatarUrl"
                :size="64"
                class="!h-[72px] !w-[72px] !rounded-[12px] !text-xl"
              />
              <span
                class="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <AppIcon :name="uploading ? 'ion:sync' : 'ion:camera'" :size="20" />
              </span>
            </button>
            <div>
              <p class="text-label text-foreground">Agent 头像</p>
              <p class="mt-1 text-caption text-tertiary-foreground">
                建议 1:1 正方形，JPG/PNG，不超过 2MB
              </p>
              <button type="button" class="mt-2 text-caption text-link" @click="pickAvatar">
                {{ uploading ? '上传中…' : '更换头像' }}
              </button>
            </div>
            <input
              ref="avatarInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onAvatarFile"
            />
          </div>

          <div class="section-divider mt-6" />

          <div class="mt-6 flex flex-col gap-1.5">
            <label class="text-label text-foreground">
              Agent 名称
              <span class="text-danger">*</span>
            </label>
            <input
              v-model="nickname"
              type="text"
              maxlength="32"
              placeholder="例如：小野"
              class="h-10 w-full rounded-sm border bg-input px-3 text-small text-foreground outline-none transition-colors placeholder:text-placeholder-foreground focus:border-accent"
              :class="nicknameError ? 'border-danger' : 'border-border'"
            />
            <div class="flex items-center justify-between text-caption">
              <span class="text-danger">{{ nicknameError }}</span>
              <span class="text-tertiary-foreground">{{ nickname.length }}/32</span>
            </div>
          </div>

          <div class="mt-4 flex flex-col gap-1.5">
            <label class="text-label text-foreground">个性签名</label>
            <textarea
              v-model="signature"
              rows="3"
              maxlength="128"
              placeholder="一句话介绍你的 Agent，例如：你的贴心助理，随时在线"
              class="w-full resize-none rounded-sm border border-border bg-input px-3 py-2 text-small text-foreground outline-none transition-colors placeholder:text-placeholder-foreground focus:border-accent"
            />
            <div class="flex items-center justify-between text-caption">
              <span class="text-danger">{{ signatureError }}</span>
              <span class="text-tertiary-foreground">{{ signature.length }}/128</span>
            </div>
          </div>

          <div class="mt-6">
            <p class="text-label text-foreground">归属信息</p>
            <div class="mt-2 flex items-center gap-3 rounded-md bg-secondary p-3">
              <Avatar
                :name="userName"
                :index="app.avatarIndex"
                :avatar-url="app.user?.avatarUrl"
                :size="28"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-small text-foreground">
                  {{ userName }}
                  <span class="ml-1 text-micro text-tertiary-foreground">当前登录账号</span>
                </p>
                <p class="truncate text-caption text-tertiary-foreground">
                  userId：{{ userId || '—' }}
                </p>
              </div>
              <span
                class="rounded-sm border border-border bg-background px-1.5 py-0.5 text-micro text-tertiary-foreground"
              >
                只读
              </span>
            </div>
            <p class="mt-2 text-caption text-tertiary-foreground">
              归属账号由系统绑定，不可修改；页面不提供 userId 输入项。
            </p>
          </div>

          <div class="mt-7 flex items-center justify-end gap-3">
            <p v-if="!isEdit && !agents.canCreate" class="mr-auto text-caption text-warning">
              名额已满（{{ AGENT_LIMIT }}/{{ AGENT_LIMIT }}），停用或删除后可继续创建
            </p>
            <button
              type="button"
              class="h-8 rounded-sm border border-border bg-background px-4 text-small text-foreground transition-colors hover:bg-item-hover"
              @click="back"
            >
              取消
            </button>
            <button type="button" class="btn-primary h-8 px-5" :disabled="!canSave" @click="save">
              {{ saving ? '保存中…' : isEdit ? '保存修改' : '创建 Agent' }}
            </button>
          </div>
        </section>

        <!-- 右侧说明 -->
        <aside class="flex flex-col gap-4">
          <section class="rounded-lg bg-background p-5 shadow-card">
            <h3 class="text-section text-foreground">创建规则</h3>
            <ul class="mt-3 flex flex-col gap-2 text-caption text-tertiary-foreground">
              <li class="flex gap-2">
                <span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-tertiary-foreground" />
                每个账号最多同时拥有 {{ AGENT_LIMIT }} 个可用 Agent，名额满后需停用或删除。
              </li>
              <li class="flex gap-2">
                <span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-tertiary-foreground" />
                Agent 拥有独立 userId，不可与用户账号或其他 Agent 混用。
              </li>
              <li class="flex gap-2">
                <span class="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-tertiary-foreground" />
                默认拒绝白名单外的账号与群聊发起会话，需在「白名单」中单独授权。
              </li>
            </ul>
          </section>

          <section class="rounded-lg bg-background p-5 shadow-card">
            <h3 class="text-section text-foreground">资料预览</h3>
            <div class="mt-3 flex items-center gap-3 rounded-md bg-secondary p-3">
              <Avatar
                :name="nickname || 'A'"
                :index="previewIndex"
                :avatar-url="avatarUrl"
                :size="40"
              />
              <div class="min-w-0">
                <p class="truncate text-label text-foreground">{{ nickname || 'Agent 名称' }}</p>
                <p class="truncate text-caption text-tertiary-foreground">
                  {{ signature || '暂无签名' }}
                </p>
              </div>
            </div>
          </section>

          <section class="rounded-lg bg-background p-5 shadow-card">
            <div class="flex items-center justify-between">
              <h3 class="text-section text-foreground">名额</h3>
              <span class="text-caption text-tertiary-foreground">
                {{ agents.activeCount }}/{{ AGENT_LIMIT }}
              </span>
            </div>
            <div class="mt-3 flex gap-1.5">
              <span
                v-for="index in AGENT_LIMIT"
                :key="index"
                class="h-1.5 flex-1 rounded-full"
                :class="index <= agents.activeCount ? 'bg-accent' : 'bg-input'"
              />
            </div>
          </section>
        </aside>
      </div>
    </div>

    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
