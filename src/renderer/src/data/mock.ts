import type {
  ChannelEntry,
  ContactEntry,
  Conversation,
  FavoriteEntry,
  FileEntry,
  FriendRequest,
  GroupEntry,
  OrgNode,
  SettingsNav,
  WorkbenchApp
} from '@renderer/types'

const designMembers = [
  { name: '林晓', index: 1, role: '群主' as const },
  { name: '陈默', index: 5, role: '管理员' as const },
  { name: '王芳', index: 2, role: '成员' as const },
  { name: '安子', index: 3, role: '成员' as const },
  { name: '张三', index: 6, role: '成员' as const }
]

export const conversations: Conversation[] = [
  {
    id: 'conv-1',
    name: '产品设计组',
    avatarIndex: 3,
    preview: '林晓：收到，下午评审用这个版本',
    time: '14:32',
    unread: 8,
    pinned: true,
    group: true,
    owner: '林晓',
    notice: '本周五下午 15:00 进行版本评审，请提前提交设计稿。',
    members: designMembers,
    messages: [
      {
        id: 'm-101',
        direction: 'in',
        kind: 'text',
        sender: '林晓',
        time: '14:20',
        text: '新版客户端的会话列表间距调好了吗？'
      },
      {
        id: 'm-102',
        direction: 'out',
        kind: 'text',
        time: '14:22',
        text: '已经按 68px 行高统一了，稍后把稿子发你'
      },
      {
        id: 'm-103',
        direction: 'in',
        kind: 'file',
        sender: '林晓',
        time: '14:25',
        fileName: '野火IM-PC-设计规范.pdf',
        fileSize: '2.4 MB'
      },
      {
        id: 'm-104',
        direction: 'out',
        kind: 'quote',
        time: '14:28',
        quotedSender: '林晓',
        quoted: '周五下午三点，已经发到群里了',
        text: '好的，我下午整理好发你'
      },
      {
        id: 'm-105',
        direction: 'in',
        kind: 'forward',
        sender: '陈默',
        time: '14:30',
        forwardTitle: '产品设计组 的聊天记录',
        forwardLines: [
          '林晓：新版会话列表已同步',
          '陈默：文件卡片的间距再确认下',
          '我：已按 8px 统一'
        ]
      },
      {
        id: 'm-106',
        direction: 'in',
        kind: 'notification',
        time: '14:31',
        text: '你撤回了一条消息'
      },
      {
        id: 'm-107',
        direction: 'in',
        kind: 'poll',
        sender: '安子',
        time: '14:32',
        text: '本周评审时间投票',
        options: [
          { label: '周五 15:00（设计评审）', votes: 5 },
          { label: '周四 10:00（需求预评审）', votes: 2 }
        ]
      },
      {
        id: 'm-108',
        direction: 'in',
        kind: 'image',
        sender: '王芳',
        time: '14:34',
        imageLabel: '首页改版视觉稿.png',
        imageTone: 2
      }
    ]
  },
  {
    id: 'conv-2',
    name: '林晓',
    avatarIndex: 1,
    preview: '下午的评审材料我发你邮箱',
    time: '13:18',
    unread: 2,
    messages: [
      {
        id: 'm-201',
        direction: 'in',
        kind: 'text',
        sender: '林晓',
        time: '13:10',
        text: '下午评审的 PPT 更新了吗？'
      },
      {
        id: 'm-202',
        direction: 'out',
        kind: 'text',
        time: '13:16',
        text: '最后一版正在导出，三分钟好'
      },
      {
        id: 'm-203',
        direction: 'in',
        kind: 'text',
        sender: '林晓',
        time: '13:18',
        text: '下午的评审材料我发你邮箱'
      },
      {
        id: 'm-204',
        direction: 'in',
        kind: 'audio',
        sender: '林晓',
        time: '13:19',
        duration: '0:12'
      }
    ]
  },
  {
    id: 'conv-3',
    name: '陈默',
    avatarIndex: 5,
    preview: '文件卡片的间距再确认下',
    time: '12:40',
    unread: 0,
    messages: [
      {
        id: 'm-301',
        direction: 'out',
        kind: 'text',
        time: '12:32',
        text: '消息输入区的工具条顺序整理好了'
      },
      {
        id: 'm-302',
        direction: 'in',
        kind: 'text',
        sender: '陈默',
        time: '12:40',
        text: '文件卡片的间距再确认下'
      }
    ]
  },
  {
    id: 'conv-4',
    name: '设计评审群',
    avatarIndex: 1,
    preview: '王芳：需求文档已更新',
    time: '11:26',
    unread: 3,
    group: true,
    owner: '王芳',
    notice: '设计评审材料统一放到群文件，评审前 30 分钟冻结版本。',
    members: designMembers.slice(1),
    messages: [
      {
        id: 'm-401',
        direction: 'in',
        kind: 'text',
        sender: '王芳',
        time: '11:20',
        text: '需求文档已更新，评审改到周五'
      },
      { id: 'm-402', direction: 'out', kind: 'text', time: '11:26', text: '收到，我同步下设计排期' }
    ]
  },
  {
    id: 'conv-5',
    name: '安然',
    avatarIndex: 4,
    preview: '设计规范 v2.0 已归档',
    time: '10:05',
    unread: 0,
    messages: [
      {
        id: 'm-501',
        direction: 'in',
        kind: 'text',
        sender: '安然',
        time: '10:05',
        text: '设计规范 v2.0 已归档，记得同步给移动端'
      }
    ]
  },
  {
    id: 'conv-6',
    name: '野火移动端小分队',
    avatarIndex: 6,
    preview: '张三：打包脚本已更新',
    time: '昨天',
    unread: 0,
    group: true,
    owner: '张三',
    notice: '每日构建 09:30 出包，移动端同学请及时回归。',
    members: [
      { name: '张三', index: 6, role: '群主' as const },
      { name: '赵子龙', index: 3, role: '成员' as const },
      { name: '林晓', index: 1, role: '成员' as const }
    ],
    messages: [
      {
        id: 'm-601',
        direction: 'in',
        kind: 'text',
        sender: '张三',
        time: '昨天',
        text: '打包脚本已更新，支持 960/1280/1440 三档'
      }
    ]
  },
  {
    id: 'conv-7',
    name: '产品公告',
    avatarIndex: 2,
    preview: '本周版本发布计划已确认',
    time: '昨天',
    unread: 1,
    channel: true,
    messages: [
      {
        id: 'm-701',
        direction: 'in',
        kind: 'text',
        sender: '产品公告',
        time: '昨天',
        text: '本周版本发布计划已确认，周四提测，周五灰度。'
      }
    ]
  }
]

export const contacts: ContactEntry[] = [
  { id: 'c-0', name: '新的朋友', avatarIndex: 3, desc: '3 条好友申请', group: '快捷入口' },
  { id: 'c-1', name: '群聊', avatarIndex: 2, desc: '12 个群聊', group: '快捷入口' },
  { id: 'c-2', name: '频道', avatarIndex: 5, desc: '4 个频道', group: '快捷入口' },
  { id: 'c-3', name: '组织架构', avatarIndex: 1, desc: '野火科技', group: '快捷入口' },
  {
    id: 'c-4',
    name: '安然',
    avatarIndex: 4,
    desc: '设计总监',
    group: 'A',
    online: true,
    department: '设计中心'
  },
  {
    id: 'c-5',
    name: '陈默',
    avatarIndex: 5,
    desc: '前端工程师',
    group: 'A',
    online: true,
    department: '研发中心'
  },
  {
    id: 'c-6',
    name: '林晓',
    avatarIndex: 1,
    desc: '产品经理',
    group: 'A',
    online: true,
    department: '产品中心'
  },
  {
    id: 'c-7',
    name: '张三',
    avatarIndex: 6,
    desc: '测试工程师',
    group: 'A',
    online: false,
    department: '研发中心'
  },
  {
    id: 'c-8',
    name: '王芳',
    avatarIndex: 2,
    desc: '交互设计师',
    group: 'B',
    online: false,
    department: '设计中心'
  },
  {
    id: 'c-9',
    name: '赵子龙',
    avatarIndex: 3,
    desc: '服务端工程师',
    group: 'C',
    online: true,
    department: '研发中心'
  }
]

export const favorites: FavoriteEntry[] = [
  {
    id: 'f-1',
    name: '产品设计评审结论',
    avatarIndex: 3,
    desc: '产品设计组 · 11-04',
    kind: '文本',
    source: '产品设计组',
    time: '11-04 16:20',
    text: '结论：会话列表行高 68px；输入区工具条顺序对齐设计稿；文件卡片间距 8px。'
  },
  {
    id: 'f-2',
    name: '野火IM-PC-设计规范.pdf',
    avatarIndex: 6,
    desc: '陈默 · 11-03',
    kind: '文件',
    source: '陈默',
    time: '11-03 10:12',
    fileSize: '2.4 MB'
  },
  {
    id: 'f-3',
    name: '群公告：本周发布计划',
    avatarIndex: 1,
    desc: '设计评审群 · 11-02',
    kind: '群公告',
    source: '设计评审群',
    time: '11-02 09:00',
    text: '周四提测、周五灰度，发布前请确认回归清单。'
  },
  {
    id: 'f-4',
    name: '首页改版视觉稿',
    avatarIndex: 2,
    desc: '林晓 · 11-01',
    kind: '链接',
    source: '林晓',
    time: '11-01 18:30',
    text: 'https://design.wildfire.local/home-redesign-v2'
  }
]

export const settingsNavs: SettingsNav[] = [
  { key: 'account', label: '账号与安全' },
  { key: 'notifications', label: '消息通知' },
  { key: 'general', label: '通用设置' },
  { key: 'bots', label: '机器人' },
  { key: 'blacklist', label: '黑名单' },
  { key: 'about', label: '关于' }
]

export const files: FileEntry[] = [
  {
    id: 'file-1',
    name: '野火IM-PC-设计规范.pdf',
    size: '2.4 MB',
    kind: 'pdf',
    from: '林晓',
    time: '今天 14:25',
    conversationId: 'conv-1',
    starred: true
  },
  {
    id: 'file-2',
    name: '首页改版视觉稿.png',
    size: '1.8 MB',
    kind: 'image',
    from: '王芳',
    time: '今天 14:34',
    conversationId: 'conv-1'
  },
  {
    id: 'file-3',
    name: '评审材料-最终版.pptx',
    size: '6.2 MB',
    kind: 'ppt',
    from: '林晓',
    time: '今天 13:16',
    conversationId: 'conv-2'
  },
  {
    id: 'file-4',
    name: '打包脚本更新说明.doc',
    size: '320 KB',
    kind: 'doc',
    from: '张三',
    time: '昨天 18:02',
    conversationId: 'conv-6'
  },
  {
    id: 'file-5',
    name: '移动端回归包.zip',
    size: '48.7 MB',
    kind: 'zip',
    from: '张三',
    time: '昨天 17:40',
    conversationId: 'conv-6'
  }
]

export const channels: ChannelEntry[] = [
  {
    id: 'ch-1',
    name: '产品公告',
    desc: '公司产品版本与发布节奏',
    avatarIndex: 2,
    following: true,
    unread: 1,
    posts: [
      {
        id: 'p-1',
        title: '本周版本发布计划',
        time: '昨天 18:00',
        text: '周四提测，周五灰度 10%，下周全量。'
      },
      {
        id: 'p-2',
        title: 'PC 端 1.2.0 更新说明',
        time: '11-02 10:20',
        text: '新增会话浮窗、消息上下文定位与工作台入口。'
      }
    ]
  },
  {
    id: 'ch-2',
    name: '设计中心',
    desc: '设计规范、组件库与走查结论',
    avatarIndex: 3,
    following: true,
    unread: 0,
    posts: [
      {
        id: 'p-3',
        title: '设计规范 v2.0 已归档',
        time: '11-03 09:40',
        text: '新增深色主题令牌与三档窗口适配变体。'
      }
    ]
  },
  {
    id: 'ch-3',
    name: '技术分享',
    desc: '每周技术主题分享与回放',
    avatarIndex: 5,
    following: false,
    unread: 0,
    posts: [
      {
        id: 'p-4',
        title: 'Electron 性能优化实践',
        time: '11-01 20:00',
        text: '启动耗时优化、渲染进程拆分与内存治理。'
      }
    ]
  },
  {
    id: 'ch-4',
    name: '行政通知',
    desc: '办公与行政相关信息',
    avatarIndex: 4,
    following: false,
    unread: 0,
    posts: [
      {
        id: 'p-5',
        title: '本周五下午茶',
        time: '11-04 11:00',
        text: '15:30 于 3F 休息区，欢迎自取。'
      }
    ]
  }
]

export const groups: GroupEntry[] = [
  {
    id: 'g-1',
    name: '产品设计组',
    avatarIndex: 3,
    memberCount: 5,
    owner: '林晓',
    notice: '本周五下午 15:00 进行版本评审，请提前提交设计稿。',
    conversationId: 'conv-1'
  },
  {
    id: 'g-2',
    name: '设计评审群',
    avatarIndex: 1,
    memberCount: 4,
    owner: '王芳',
    notice: '评审材料统一放到群文件。',
    conversationId: 'conv-4'
  },
  {
    id: 'g-3',
    name: '野火移动端小分队',
    avatarIndex: 6,
    memberCount: 3,
    owner: '张三',
    notice: '每日构建 09:30 出包。',
    conversationId: 'conv-6'
  }
]

export const friendRequests: FriendRequest[] = [
  {
    id: 'fr-1',
    name: '周舟',
    avatarIndex: 2,
    message: '我是设计中心的周舟，想同步下新版视觉稿',
    time: '10:12',
    status: 'pending'
  },
  {
    id: 'fr-2',
    name: '李雷',
    avatarIndex: 4,
    message: '产品中心李雷，申请加你好友',
    time: '昨天',
    status: 'pending'
  },
  {
    id: 'fr-3',
    name: '韩梅梅',
    avatarIndex: 6,
    message: '来自组织架构：研发中心',
    time: '昨天',
    status: 'pending'
  }
]

export const orgTree: OrgNode[] = [
  {
    id: 'org-1',
    name: '野火科技',
    children: [
      {
        id: 'org-2',
        name: '产品中心',
        children: [
          { id: 'org-21', name: '林晓', title: '产品经理', avatarIndex: 1 },
          { id: 'org-22', name: '李雷', title: '产品专员', avatarIndex: 4 }
        ]
      },
      {
        id: 'org-3',
        name: '设计中心',
        children: [
          { id: 'org-31', name: '安然', title: '设计总监', avatarIndex: 4 },
          { id: 'org-32', name: '王芳', title: '交互设计师', avatarIndex: 2 },
          { id: 'org-33', name: '周舟', title: '视觉设计师', avatarIndex: 3 }
        ]
      },
      {
        id: 'org-4',
        name: '研发中心',
        children: [
          { id: 'org-41', name: '陈默', title: '前端工程师', avatarIndex: 5 },
          { id: 'org-42', name: '赵子龙', title: '服务端工程师', avatarIndex: 3 },
          { id: 'org-43', name: '张三', title: '测试工程师', avatarIndex: 6 },
          { id: 'org-44', name: '韩梅梅', title: '运维工程师', avatarIndex: 6 }
        ]
      }
    ]
  }
]

export const workbenchApps: WorkbenchApp[] = [
  { id: 'wb-1', name: '审批中心', desc: '请假 / 报销 / 用印', icon: 'ion:document-text', tone: 1 },
  { id: 'wb-2', name: '日历日程', desc: '会议室与日程安排', icon: 'ion:calendar', tone: 2 },
  { id: 'wb-3', name: '知识库', desc: '企业文档与规范', icon: 'ion:book', tone: 3 },
  { id: 'wb-4', name: '数据看板', desc: '项目与研发效能数据', icon: 'ion:stats-bars', tone: 4 },
  { id: 'wb-5', name: '招聘内推', desc: '内推职位与进度', icon: 'ion:person-add', tone: 5 },
  { id: 'wb-6', name: 'IT 服务台', desc: '设备与账号问题', icon: 'ion:build', tone: 6 }
]
