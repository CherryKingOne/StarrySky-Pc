import type { ContactEntry, Conversation, FavoriteEntry, SettingsNav } from '@renderer/types'

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
      { id: 'm-201', direction: 'in', kind: 'text', time: '13:10', text: '下午评审的 PPT 更新了吗？' },
      {
        id: 'm-202',
        direction: 'out',
        kind: 'text',
        time: '13:16',
        text: '最后一版正在导出，三分钟好'
      },
      { id: 'm-203', direction: 'in', kind: 'text', time: '13:18', text: '下午的评审材料我发你邮箱' }
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
      { id: 'm-301', direction: 'out', kind: 'text', time: '12:32', text: '消息输入区的工具条顺序整理好了' },
      { id: 'm-302', direction: 'in', kind: 'text', time: '12:40', text: '文件卡片的间距再确认下' }
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
    messages: [
      { id: 'm-401', direction: 'in', kind: 'text', sender: '王芳', time: '11:20', text: '需求文档已更新，评审改到周五' },
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
      { id: 'm-501', direction: 'in', kind: 'text', time: '10:05', text: '设计规范 v2.0 已归档，记得同步给移动端' }
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
    messages: [
      { id: 'm-601', direction: 'in', kind: 'text', sender: '张三', time: '昨天', text: '打包脚本已更新，支持 960/1280/1440 三档' }
    ]
  }
]

export const contacts: ContactEntry[] = [
  { id: 'c-0', name: '新的朋友', avatarIndex: 3, desc: '3 条好友申请', group: '快捷入口' },
  { id: 'c-1', name: '群聊', avatarIndex: 2, desc: '12 个群聊', group: '快捷入口' },
  { id: 'c-2', name: '频道', avatarIndex: 5, desc: '4 个频道', group: '快捷入口' },
  { id: 'c-3', name: '组织架构', avatarIndex: 1, desc: '野火科技', group: '快捷入口' },
  { id: 'c-4', name: '安然', avatarIndex: 4, desc: '设计总监', group: 'A' },
  { id: 'c-5', name: '陈默', avatarIndex: 5, desc: '前端工程师', group: 'A' },
  { id: 'c-6', name: '林晓', avatarIndex: 1, desc: '产品经理', group: 'A' },
  { id: 'c-7', name: '张三', avatarIndex: 6, desc: '测试工程师', group: 'A' },
  { id: 'c-8', name: '王芳', avatarIndex: 2, desc: '交互设计师', group: 'B' },
  { id: 'c-9', name: '赵子龙', avatarIndex: 3, desc: '服务端工程师', group: 'C' }
]

export const favorites: FavoriteEntry[] = [
  { id: 'f-1', name: '产品设计评审结论', avatarIndex: 3, desc: '产品设计组 · 11-04' },
  { id: 'f-2', name: '野火IM-PC-设计规范.pdf', avatarIndex: 6, desc: '陈默 · 11-03' },
  { id: 'f-3', name: '群公告：本周发布计划', avatarIndex: 1, desc: '设计评审群 · 11-02' },
  { id: 'f-4', name: '首页改版视觉稿', avatarIndex: 2, desc: '林晓 · 11-01' }
]

export const settingsNavs: SettingsNav[] = [
  { key: 'account', label: '账号与安全' },
  { key: 'notifications', label: '消息通知' },
  { key: 'general', label: '通用设置' },
  { key: 'about', label: '关于' }
]
