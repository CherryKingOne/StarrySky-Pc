# Tasks：Agent 身份资料卡与设置页身份化

- [x] 1. `Avatar.vue`：相对头像 URL 解析；首字符仅为字母/汉字，否则人像图标兜底。
- [x] 2. `UserCardModal.vue`：新增 `idLabel` / `idMono` / `meta` / `agent` props；Agent 按钮分支（设置/聊天白名单/管理 Agent），视觉保持不变。
- [x] 3. `Sidebar.vue`：Agent 身份点头像打开 Agent 资料卡；绑定 Agent 元信息与跳转事件；`Avatar` 传完整名称；保留身份切换角标。
- [x] 4. `SwitchToggle.vue`：新增 `disabled` 支持（不触发、降透明度、禁用光标）。
- [x] 5. `stores/agents.ts`：新增 `applyAgent` 并让 `update()` 复用。
- [x] 6. `SettingsView.vue`：
  - [x] 6.1 Agent 身份初始化：`getAgent(app.accessToken)` 刷新当前 Agent；用户身份保持 `getCurrentUser`。
  - [x] 6.2 账号与安全 Agent 分叉：Agent 资料卡/编辑/上传头像（Agent Token；demo 禁用并说明）。
  - [x] 6.3 账号与安全不可用行 + 原因：密码、密码重置、多端登录、安全验证、登录设备。
  - [x] 6.4 Agent 专属：聊天白名单入口、停用/删除 Agent（确认后回用户身份并跳 `/chats`）。
  - [x] 6.5 Agent 底部操作：锁定应用 + 切回用户账号。
  - [x] 6.6 消息通知 Agent 分叉：保留结构，全部禁用 + 原因。
  - [x] 6.7 机器人/黑名单 Agent 分叉：说明面板，不隐藏入口。
  - [x] 6.8 用户身份分支保持原样。
- [x] 7. 运行 `npm run typecheck`、`npx eslint`、`npm run build`。
- [x] 8. Electron 实测：Agent 资料卡、设置各 nav、不可用项、白名单、停用/删除、用户设置回归。
- [x] 9. 清理临时验证脚本与 userData；输出后端缺口清单。
