<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AddActions from '@renderer/components/AddActions.vue'
import AppIcon from '@renderer/components/AppIcon.vue'
import Avatar from '@renderer/components/Avatar.vue'
import CallOverlay from '@renderer/components/CallOverlay.vue'
import EmptyState from '@renderer/components/EmptyState.vue'
import GroupQrDialog from '@renderer/components/GroupQrDialog.vue'
import ListRow from '@renderer/components/ListRow.vue'
import SearchBar from '@renderer/components/SearchBar.vue'
import Toast from '@renderer/components/Toast.vue'
import UserCardModal from '@renderer/components/UserCardModal.vue'
import { channels as channelSeed, orgTree } from '@renderer/data/mock'
import { useContactsStore } from '@renderer/stores/contacts'
import { useConversationsStore } from '@renderer/stores/conversations'
import { useAppStore } from '@renderer/stores/app'
import { blockUser } from '@renderer/api/blocks'
import type { CallMode, ContactEntry, FriendRequest } from '@renderer/types'

const router = useRouter()
const store = useConversationsStore()
const contacts = useContactsStore()
const app = useAppStore()

const keyword = ref('')
const selectedId = ref('')
const addActions = ref<InstanceType<typeof AddActions> | null>(null)
const toastMessage = ref('')

const channels = reactive(channelSeed.map((item) => ({ ...item, posts: [...item.posts] })))
const activeChannelId = ref('')
const expanded = ref<string[]>(['org-1', 'org-2', 'org-3', 'org-4'])
const showCall = ref(false)
const callMode = ref<CallMode>('audio')
const showCard = ref(false)
const showContactQr = ref(false)
const card = ref({ name: '', desc: '', index: 1, userId: '', avatarUrl: null as string | null })

function showToast(message: string): void {
  toastMessage.value = ''
  window.setTimeout(() => {
    toastMessage.value = message
  }, 0)
}

const quickEntries = computed<ContactEntry[]>(() => {
  const kw = keyword.value.trim().toLowerCase()
  return [
    {
      id: 'c-0',
      name: '新的朋友',
      avatarIndex: 3,
      desc: `${contacts.pendingRequests.length} 条好友申请`,
      group: '快捷入口'
    },
    {
      id: 'c-1',
      name: '群聊',
      avatarIndex: 2,
      desc: `${contacts.groups.length} 个群聊`,
      group: '快捷入口'
    },
    {
      id: 'c-2',
      name: '频道',
      avatarIndex: 5,
      desc: `${channels.length} 个频道`,
      group: '快捷入口'
    },
    { id: 'c-3', name: '组织架构', avatarIndex: 1, desc: '野火科技', group: '快捷入口' }
  ].filter((item) => !kw || item.name.toLowerCase().includes(kw))
})

interface ContactGroup {
  label: string
  items: ContactEntry[]
}

const groupsList = computed<ContactGroup[]>(() => {
  const kw = keyword.value.trim().toLowerCase()
  const map = new Map<string, ContactEntry[]>()
  for (const item of contacts.friends) {
    if (kw && !item.name.toLowerCase().includes(kw) && !item.desc.toLowerCase().includes(kw))
      continue
    const label = item.group ?? '#'
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(item)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, items]) => ({ label, items }))
})

const groupList = computed(() => contacts.groups)
const allEntries = computed(() => [...quickEntries.value, ...contacts.friends])
const selected = computed(
  () => allEntries.value.find((item) => item.id === selectedId.value) ?? null
)
const activeChannel = computed(
  () => channels.find((item) => item.id === activeChannelId.value) ?? null
)

const pendingRequests = computed(() => contacts.pendingRequests)
const requests = computed(() => contacts.requests)

function select(id: string): void {
  selectedId.value = id
  activeChannelId.value = ''
}

async function startChat(): Promise<void> {
  const target = selected.value
  if (!target?.userId) {
    showToast('缺少用户 ID')
    return
  }
  try {
    await store.openWithUser(target.userId)
    void router.push('/chats')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '打开会话失败')
  }
}

async function openGroup(conversationId: string): Promise<void> {
  await store.setActive(conversationId)
  void router.push('/chats')
}

async function acceptRequest(request: FriendRequest): Promise<void> {
  if (!request.requestId) return
  try {
    await contacts.acceptRequest(request.requestId)
    showToast(`已添加 ${request.name} 为好友`)
  } catch (error) {
    showToast(error instanceof Error ? error.message : '处理好友申请失败')
  }
}

async function ignoreRequest(request: FriendRequest): Promise<void> {
  if (!request.requestId) return
  try {
    await contacts.rejectRequest(request.requestId)
    showToast('已忽略该好友申请')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '处理好友申请失败')
  }
}

function enterChannel(id: string): void {
  activeChannelId.value = id
  selectedId.value = ''
}

function toggleFollow(id: string): void {
  const channel = channels.find((item) => item.id === id)
  if (!channel) return
  channel.following = !channel.following
  showToast(channel.following ? `已关注「${channel.name}」` : `已取消关注「${channel.name}」`)
}

function isExpanded(id: string): boolean {
  return expanded.value.includes(id)
}

function toggleExpand(id: string): void {
  const index = expanded.value.indexOf(id)
  if (index > -1) expanded.value.splice(index, 1)
  else expanded.value.push(id)
}

function openMember(name: string, title: string | undefined, index: number | undefined): void {
  card.value = {
    name,
    desc: title ?? '组织成员',
    index: index ?? 2,
    userId: '',
    avatarUrl: null
  }
  showCard.value = true
}

function startCall(mode: CallMode): void {
  callMode.value = mode
  showCall.value = true
}

async function onSelfChat(): Promise<void> {
  try {
    await store.openWithSelf()
    void router.push('/chats')
    showToast('已打开与自己的会话')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '打开会话失败')
  }
}

async function onAddStart(payload: { userId: string; name: string; index: number }): Promise<void> {
  if (!payload.userId) {
    showToast('缺少用户 ID')
    return
  }
  try {
    await store.openWithUser(payload.userId)
    void router.push('/chats')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '打开会话失败')
  }
}

async function onAddCreate(payload: {
  name: string
  members: { userId: string; name: string; index: number }[]
}): Promise<void> {
  const memberIds = payload.members.map((member) => member.userId).filter(Boolean)
  if (memberIds.length === 0) {
    showToast('请至少选择一位成员')
    return
  }
  try {
    await store.createGroup(payload.name, memberIds)
    await contacts.load(true)
    void router.push('/chats')
    showToast('群聊已创建')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '创建群聊失败')
  }
}

function openSelectedCard(): void {
  if (!selected.value) return
  card.value = {
    name: selected.value.name,
    desc: selected.value.desc,
    index: selected.value.avatarIndex,
    userId: selected.value.userId ?? '',
    avatarUrl: selected.value.avatarUrl ?? null
  }
  showCard.value = true
}

async function onCardStartChat(): Promise<void> {
  showCard.value = false
  if (!card.value.userId) {
    showToast('缺少用户 ID')
    return
  }
  try {
    await store.openWithUser(card.value.userId)
    void router.push('/chats')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '打开会话失败')
  }
}

async function onCardAddFriend(): Promise<void> {
  showCard.value = false
  if (!card.value.userId) {
    showToast('缺少用户 ID')
    return
  }
  try {
    await contacts.sendFriendRequest(card.value.userId, '你好，申请添加你为好友')
    showToast('已发送好友申请')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '好友申请发送失败')
  }
}

async function onCardBlock(): Promise<void> {
  showCard.value = false
  if (!card.value.userId || !app.accessToken) {
    showToast('缺少用户 ID')
    return
  }
  try {
    await blockUser(app.accessToken, card.value.userId)
    showToast(`已拉黑 ${card.value.name}`)
  } catch (error) {
    showToast(error instanceof Error ? error.message : '拉黑失败')
  }
}

onMounted(() => {
  void contacts.load()
})

function onCardQr(): void {
  showCard.value = false
  showContactQr.value = true
}
</script>

<template>
  <!-- P04 通讯录：左侧 261 面板 + 右侧 959 详情区 -->
  <div class="flex h-full w-full">
    <section class="flex h-full w-panel shrink-0 flex-col overflow-hidden bg-secondary">
      <SearchBar v-model="keyword" placeholder="搜索" @add="addActions?.open($event)" />

      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <ListRow
          v-for="entry in quickEntries"
          :key="entry.id"
          :name="entry.name"
          :index="entry.avatarIndex"
          :desc="entry.id === 'c-0' ? `${pendingRequests.length} 条好友申请` : entry.desc"
          :class="selectedId === entry.id ? 'bg-conv-active' : ''"
          @click="select(entry.id)"
        />

        <template v-for="group in groupsList" :key="group.label">
          <p class="px-4 pt-3 pb-1 text-micro text-secondary-foreground">分组 {{ group.label }}</p>
          <ListRow
            v-for="entry in group.items"
            :key="entry.id"
            :name="entry.name"
            :index="entry.avatarIndex"
            :avatar-url="entry.avatarUrl"
            :desc="entry.desc"
            :class="selectedId === entry.id ? 'bg-conv-active' : ''"
            @click="select(entry.id)"
          />
        </template>
      </div>
    </section>

    <!-- 详情区 -->
    <section class="flex h-full min-w-0 flex-1 flex-col bg-tertiary">
      <!-- 新的朋友 -->
      <template v-if="selected?.id === 'c-0'">
        <header
          class="flex h-[60px] shrink-0 items-center justify-between border-b border-divider bg-panel px-5"
        >
          <div>
            <h2 class="text-section text-foreground">新的朋友</h2>
            <p class="text-caption text-secondary-foreground">
              共 {{ requests.length }} 条好友申请
            </p>
          </div>
          <button type="button" class="btn-primary h-8 px-3" @click="addActions?.open('addFriend')">
            添加好友
          </button>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div
            v-for="request in requests"
            :key="request.id"
            class="mb-2 flex items-center gap-3 rounded-md bg-panel p-3"
          >
            <Avatar
              :name="request.name"
              :index="request.avatarIndex"
              :avatar-url="request.avatarUrl"
              :size="40"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-small text-foreground">{{ request.name }}</p>
              <p class="truncate text-micro text-secondary-foreground">{{ request.message }}</p>
            </div>
            <span class="shrink-0 text-micro text-tertiary-foreground">{{ request.time }}</span>
            <template v-if="request.status === 'pending'">
              <button
                type="button"
                class="btn-primary h-7 px-3 text-micro"
                @click="acceptRequest(request)"
              >
                接受
              </button>
              <button
                type="button"
                class="inline-flex h-7 items-center rounded-sm border border-border bg-input px-3 text-micro text-foreground transition-colors hover:bg-item-hover"
                @click="ignoreRequest(request)"
              >
                忽略
              </button>
            </template>
            <span
              v-else
              class="shrink-0 text-micro"
              :class="
                request.status === 'accepted' ? 'text-status-success' : 'text-tertiary-foreground'
              "
            >
              {{ request.status === 'accepted' ? '已添加' : '已忽略' }}
            </span>
          </div>
        </div>
      </template>

      <!-- 群聊 -->
      <template v-else-if="selected?.id === 'c-1'">
        <header
          class="flex h-[60px] shrink-0 items-center justify-between border-b border-divider bg-panel px-5"
        >
          <div>
            <h2 class="text-section text-foreground">群聊</h2>
            <p class="text-caption text-secondary-foreground">{{ groupList.length }} 个群聊</p>
          </div>
          <button
            type="button"
            class="btn-primary h-8 px-3"
            @click="addActions?.open('createGroup')"
          >
            创建群聊
          </button>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div
            v-for="group in groupList"
            :key="group.id"
            class="mb-2 flex items-center gap-3 rounded-md bg-panel p-3"
          >
            <Avatar
              :name="group.name"
              :index="group.avatarIndex"
              :avatar-url="group.avatarUrl"
              :size="40"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-small text-foreground">{{ group.name }}</p>
              <p class="truncate text-micro text-secondary-foreground">
                {{ group.memberCount }} 位成员 · 群主 {{ group.owner }}
              </p>
            </div>
            <button
              type="button"
              class="btn-primary h-7 px-3 text-micro"
              @click="openGroup(group.conversationId)"
            >
              打开会话
            </button>
          </div>
        </div>
      </template>

      <!-- 频道 -->
      <template v-else-if="selected?.id === 'c-2' || activeChannel">
        <header
          class="flex h-[60px] shrink-0 items-center justify-between border-b border-divider bg-panel px-5"
        >
          <div class="min-w-0">
            <h2 class="truncate text-section text-foreground">
              {{ activeChannel?.name || '频道' }}
            </h2>
            <p class="truncate text-caption text-secondary-foreground">
              {{ activeChannel?.desc || `${channels.length} 个频道` }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="activeChannel"
              type="button"
              class="inline-flex h-8 items-center rounded-sm border border-border bg-input px-3 text-small text-foreground transition-colors hover:bg-item-hover"
              @click="activeChannelId = ''"
            >
              全部频道
            </button>
            <button
              v-if="activeChannel"
              type="button"
              class="btn-primary h-8 px-3"
              @click="toggleFollow(activeChannel.id)"
            >
              {{ activeChannel.following ? '取消关注' : '关注频道' }}
            </button>
          </div>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <template v-if="!activeChannel">
            <div
              v-for="channel in channels"
              :key="channel.id"
              class="mb-2 flex items-center gap-3 rounded-md bg-panel p-3"
            >
              <Avatar :name="channel.name" :index="channel.avatarIndex" :size="40" />
              <div class="min-w-0 flex-1">
                <p class="truncate text-small text-foreground">
                  {{ channel.name }}
                  <span v-if="channel.following" class="ml-1 text-micro text-accent">已关注</span>
                </p>
                <p class="truncate text-micro text-secondary-foreground">{{ channel.desc }}</p>
              </div>
              <button
                type="button"
                class="inline-flex h-7 items-center rounded-sm border border-border bg-input px-3 text-micro text-foreground transition-colors hover:bg-item-hover"
                @click="enterChannel(channel.id)"
              >
                查看
              </button>
              <button
                type="button"
                class="btn-primary h-7 px-3 text-micro"
                @click="toggleFollow(channel.id)"
              >
                {{ channel.following ? '取消关注' : '关注' }}
              </button>
            </div>
          </template>

          <template v-else>
            <div
              v-for="post in activeChannel.posts"
              :key="post.id"
              class="mb-3 rounded-md bg-panel p-4"
            >
              <div class="flex items-center justify-between">
                <p class="text-label text-foreground">{{ post.title }}</p>
                <span class="text-micro text-tertiary-foreground">{{ post.time }}</span>
              </div>
              <p class="mt-2 text-small leading-relaxed text-secondary-foreground">
                {{ post.text }}
              </p>
            </div>
          </template>
        </div>
      </template>

      <!-- 组织架构 -->
      <template v-else-if="selected?.id === 'c-3'">
        <header
          class="flex h-[60px] shrink-0 items-center justify-between border-b border-divider bg-panel px-5"
        >
          <div>
            <h2 class="text-section text-foreground">组织架构</h2>
            <p class="text-caption text-secondary-foreground">野火科技 · 3 个部门</p>
          </div>
          <span class="text-micro text-tertiary-foreground">点击成员查看资料</span>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <template v-for="root in orgTree" :key="root.id">
            <button
              type="button"
              class="mb-1 flex h-9 w-full items-center gap-2 rounded-sm px-2 text-left text-label text-foreground transition-colors hover:bg-item-hover"
              @click="toggleExpand(root.id)"
            >
              <AppIcon
                :name="isExpanded(root.id) ? 'ion:ios-arrow-down' : 'ion:ios-arrow-forward'"
                :size="14"
              />
              {{ root.name }}
            </button>
            <template v-if="isExpanded(root.id)">
              <div v-for="department in root.children ?? []" :key="department.id" class="mb-1">
                <button
                  type="button"
                  class="flex h-9 w-full items-center gap-2 rounded-sm pl-6 pr-2 text-left text-small text-secondary-foreground transition-colors hover:bg-item-hover"
                  @click="toggleExpand(department.id)"
                >
                  <AppIcon
                    :name="
                      isExpanded(department.id) ? 'ion:ios-arrow-down' : 'ion:ios-arrow-forward'
                    "
                    :size="12"
                  />
                  {{ department.name }}
                  <span class="ml-auto text-micro text-tertiary-foreground">
                    {{ department.children?.length ?? 0 }} 人
                  </span>
                </button>
                <template v-if="isExpanded(department.id)">
                  <button
                    v-for="member in department.children ?? []"
                    :key="member.id"
                    type="button"
                    class="mb-1 flex w-full items-center gap-3 rounded-md bg-panel px-3 py-2 pl-9 text-left transition-colors hover:bg-item-hover"
                    @click="openMember(member.name, member.title, member.avatarIndex)"
                  >
                    <Avatar :name="member.name" :index="member.avatarIndex ?? 1" :size="32" />
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-small text-foreground">{{
                        member.name
                      }}</span>
                      <span class="block truncate text-micro text-tertiary-foreground">{{
                        member.title
                      }}</span>
                    </span>
                    <AppIcon name="ion:ios-arrow-right" :size="14" class="text-icon" />
                  </button>
                </template>
              </div>
            </template>
          </template>
        </div>
      </template>

      <!-- 普通联系人详情 -->
      <template v-else>
        <EmptyState
          v-if="!selected"
          title="选择一个联系人查看详情"
          hint="支持发消息、语音、视频与查看资料"
        />

        <div v-else class="flex flex-1 flex-col items-center justify-center gap-4">
          <Avatar
            :name="selected.name"
            :index="selected.avatarIndex"
            :avatar-url="selected.avatarUrl"
            :size="64"
          />
          <div class="text-center">
            <p class="text-section text-foreground">{{ selected.name }}</p>
            <p class="mt-1 text-caption text-secondary-foreground">
              {{ selected.desc }}
              <span v-if="selected.department"> · {{ selected.department }}</span>
            </p>
            <p
              class="mt-1 text-micro"
              :class="selected.online ? 'text-status-success' : 'text-tertiary-foreground'"
            >
              {{ selected.online ? '在线' : '离线' }}
            </p>
          </div>
          <div class="flex items-center gap-6">
            <button type="button" class="btn-primary h-9 w-[120px]" @click="startChat()">
              发消息
            </button>
            <button
              v-tooltip="'语音通话'"
              type="button"
              class="icon-button h-9 w-9 rounded-md"
              @click="startCall('audio')"
            >
              <AppIcon name="ion:ios-call" :size="20" />
            </button>
            <button
              v-tooltip="'视频通话'"
              type="button"
              class="icon-button h-9 w-9 rounded-md"
              @click="startCall('video')"
            >
              <AppIcon name="ion:ios-videocam" :size="20" />
            </button>
            <button
              v-tooltip="'查看资料卡'"
              type="button"
              class="icon-button h-9 w-9 rounded-md"
              @click="openSelectedCard"
            >
              <AppIcon name="ion:person" :size="20" />
            </button>
          </div>
          <p class="text-micro text-time-foreground">分组 {{ selected.group }}</p>
        </div>
      </template>
    </section>

    <AddActions
      ref="addActions"
      @start="onAddStart"
      @create="onAddCreate"
      @friend="showToast(`已向 ${$event} 发送好友申请`)"
      @self-chat="onSelfChat"
      @toast="showToast"
    />

    <UserCardModal
      :visible="showCard"
      :name="card.name"
      :desc="card.desc"
      :avatar-index="card.index"
      :avatar-url="card.avatarUrl"
      :account-id="card.userId || 'wildfire'"
      @close="showCard = false"
      @start-chat="onCardStartChat"
      @add-friend="onCardAddFriend"
      @qr="onCardQr"
      @block="onCardBlock"
    />

    <GroupQrDialog
      :visible="showContactQr"
      mode="contact"
      :name="card.name"
      :hint="`扫码添加 ${card.name} 为好友`"
      :value="`starrysky://user/${card.name}`"
      @close="showContactQr = false"
      @toast="showToast"
    />

    <CallOverlay
      :visible="showCall"
      :mode="callMode"
      :title="selected?.name || card.name"
      :avatar-index="selected?.avatarIndex || card.index"
      @close="showCall = false"
      @toast="showToast"
    />

    <Toast :message="toastMessage" @close="toastMessage = ''" />
  </div>
</template>
