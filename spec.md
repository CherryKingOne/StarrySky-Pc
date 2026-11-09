# Spec：Agent 身份资料卡与设置页身份化

## 目标
Agent 身份下要像一个独立账号：

1. 点击侧栏头像弹出与用户账号一致的资料卡，展示 Agent 昵称、头像、`agentId`（账号 ID，等宽 + 复制）、归属人类账号、创建时间、状态。
2. 设置页结构与用户设置页保持一致，但内容是该 Agent 自己的设置；能对上的项走 Agent Token，没有后端能力的项明确不可用并写清原因，Agent 专属项收进设置。
3. 用户身份下所有行为保持原样。

## 后端能力确认（已核对 docs/api 与后端源码）
| 能力 | Agent Token | 结论 |
|---|---|---|
| `GET /agents/{agentId}` | 可用（只能查自己） | Agent 资料读取 |
| `PUT /agents/{agentId}` | 可用（只能改自己） | 昵称/头像/性别/签名 |
| `POST /files` | 可用（`FileController` 取当前主体 ID，Agent Token 主体为 agentId） | Agent 头像上传 |
| `GET/PUT /users/me` | 不可用（`30001`） | Agent 资料不能走用户接口 |
| 创建/列表/停用/删除 Agent、换 Token、聊天白名单增删查 | 不可用（`10101`） | 管理动作走用户 Token |
| 密码/手机/邮箱/多端登录/安全验证/设备管理 | 无接口 | 不可用 + 原因 |
| 通知/隐私（黑名单）/机器人 | 无 Agent 接口 | 不可用 + 原因 |

## 设计决策
- 复用 `UserCardModal`（`PopupDialog` + `Avatar`）作为唯一账号卡实现，新增 Agent 元信息与按钮分支，不另建组件。
- 侧栏头像点击 = 打开当前身份资料卡；`IdentitySwitchBadge`（shuffle 角标）继续负责切换身份。
- `Avatar` 统一兜底：有真实头像用图片；相对 URL 自动补 origin；无头像优先取昵称首字母/汉字，昵称为数字或符号时显示通用人像图标，不再显示无意义字符。
- 设置页沿用同一套 `settingsNavs` 与布局，仅按 `app.actingAgent` 分叉内容，保证 Agent A/B 结构完全一致。
- Agent 资料编辑在真实后端下走 `app.accessToken`（Agent Token）；离线示例（`agents.demo`）走 store 本地实现。头像上传同理。
- 停用/删除 Agent 走 store 的 `setStatus/remove`（内部使用 `userAccessToken`），成功后 store 已结束 Agent 身份，页面跳回 `/chats`。

## 详细变更

### 1. `src/renderer/src/components/Avatar.vue`
- 引入 `resolveMediaUrl`，`img` 使用解析后的绝对地址。
- `initial`：仅字母/汉字显示首字符；数字、标点等回退为 `AppIcon ion:person`。
- 其余尺寸/圆角/颜色映射不变。

### 2. `src/renderer/src/components/UserCardModal.vue`
- 新增 props：`idLabel?: string`（默认 `ID`）、`idMono?: boolean`、`meta?: { label: string; value: string }[]`、`agent?: boolean`。
- ID 行：`idMono` 时使用等宽字体；复制行为与提示保持现有实现。
- `meta` 以两列小字行展示在 ID 下方（归属账号/创建时间/状态）。
- 按钮：
  - 用户 `self`：发消息给自己 / 我的二维码 / 设置（保持不变）。
  - Agent：`Agent 设置`（emit `settings`）/ `聊天白名单`（emit `whitelist`）/ `管理 Agent`（emit `manage`）。
- 视觉复用现有 `PopupDialog width=300px`、`Avatar size=64`、按钮样式。

### 3. `src/renderer/src/components/Sidebar.vue`
- 新增 `showAgentCard`；`onAvatarClick`：有 `actingAgent` 时打开 Agent 资料卡，否则打开原用户卡。
- Agent 卡数据：昵称、签名（desc）、`avatarIndexOf(nickname)` 或头像 URL、`agentId`、归属 `userId`、`createdAt`、`status`。
- 事件：`settings` → `/settings`；`whitelist` → `/agents/:id/permissions`；`manage` → `/agents`。
- `Avatar` 的 `name` 改传完整 `displayName`，不再只传首字符；`IdentitySwitchBadge` 保留。

### 4. `src/renderer/src/components/SwitchToggle.vue`
- 新增 `disabled?: boolean`；禁用时不触发切换、降低透明度、`cursor-not-allowed`。

### 5. `src/renderer/src/stores/agents.ts`
- 新增 `applyAgent(agent: AgentItem)`：同步 `list` 与 `app.actingAgent`；`update()` 内部改用它。

### 6. `src/renderer/src/views/SettingsView.vue`
- 新增 `isAgent = computed(() => Boolean(app.actingAgent))` 与 Agent 资料派生值。
- `onMounted`：
  - Agent 身份且非 demo：`getAgent(app.accessToken, agentId)` → `agents.applyAgent`；失败不阻塞页面。
  - 用户身份：保持原 `getCurrentUser` 逻辑。
- 账号与安全（Agent 分叉，复用同一卡片/行结构）：
  - 资料卡：Agent 头像/昵称/`Agent ID`（等宽+复制）、归属账号、创建时间、状态；编辑资料复用 `EditProfileDialog`，保存走 Agent Token（demo 走 store）。
  - 上传头像：`uploadFile(app.accessToken, file, 1)` + `updateAgent(app.accessToken, ...)`；demo 时禁用并提示“离线示例身份不支持上传”。
  - 不可用行（展示原因、不可点击）：登录密码、密码重置、多端登录、安全验证、登录设备。
  - Agent 专属行：聊天白名单（跳 `/agents/:id/permissions`）；停用 Agent、删除 Agent（`ConfirmDialog` + store 管理动作，成功后回用户视角并跳 `/chats`）。
  - 底部：锁定应用；Agent 身份下把“退出登录”改为“切回用户账号”（调用 `agents.switchToUser()`）。
- 消息通知（Agent 分叉）：保留原行结构，全部 `SwitchToggle disabled`；顶部说明“Agent 暂无独立通知接口，以下设置不可用”；免打扰/试听不可点。
- 通用设置、关于：保持原样（客户端级设置）。
- 机器人、黑名单（Agent 分叉）：不渲染用户组件，显示说明面板（“机器人目录属于人类账号，Agent 身份不可用” / “Agent 无黑名单接口，暂不可用”），不隐藏入口。
- 用户身份分支不改动。

## 明确不可用项与原因
- 登录密码 / 密码重置：Agent 无独立密码体系，由归属人类账号管理。
- 手机/邮箱登录账号：Agent 没有登录账号与联系方式。
- 多端登录 / 安全验证 / 登录设备：Agent 无会话设备管理接口。
- 消息通知 / 免打扰 / 通知音效：后端无 Agent 通知配置接口。
- 黑名单：后端无 Agent 黑名单接口。
- 机器人目录：属于人类账号能力，Agent Token 不可用。
- 头像上传在离线示例模式下不可用（无网络，无法调用 `/files`）。

## 验证
1. `npm run typecheck`、`npx eslint`、`npm run build` 全通过。
2. Electron 实测（离线 demo 与真实后端可用的路径均覆盖）：
   - 切到 Agent 身份，点侧栏头像 → 资料卡显示昵称/头像/Agent ID（可复制）/归属账号/创建时间/状态；角标仍可切换身份。
   - 设置页逐个点：账号与安全（资料编辑、不可用项提示、白名单入口、停用/删除确认）、消息通知（禁用态）、通用设置、机器人/黑名单（说明面板）、关于。
   - A/B 两个 Agent 切换后设置页结构一致；用户身份设置页保持原样。
3. 清理临时 Electron 验证脚本与 userData。

## 不做
- 不新增/编造后端接口。
- 不改用户身份下的设置行为、导航与视觉。
- 不为 Agent 单独做一套资料卡或设置布局。
