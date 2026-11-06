# 代码规范

## 1. 包名与命名

- 项目名称使用大驼峰命名（如 `StarrySky-Pc`），但内部所有引用、包名、模块名必须使用**小写**。
- npm 包名不允许大写，所有依赖包名必须使用小写。
- 内部模块引用、文件引用一律使用小写，禁止使用大写字母。

## 2. 导入路径

- **禁止**使用相对路径导入（如 `../../../components/Button`）。
- **必须**使用绝对路径导入，通过项目配置的 `alias`（如 `@/`、`~/`）来引用模块。
- 示例：
  - ✅ 正确：`import { Button } from '@/components/Button'`
  - ❌ 错误：`import { Button } from '../../../components/Button'`

## 3. 包管理器

- 本项目使用 **pnpm** 作为包管理器，禁止使用 `npm` 或 `yarn`。
- 所有安装、更新、运行命令均使用 `pnpm`：
  - 安装依赖：`pnpm install`
  - 添加依赖：`pnpm add <package-name>`
  - 移除依赖：`pnpm remove <package-name>`
  - 运行脚本：`pnpm <script-name>`
  - 开发模式：`pnpm dev`
  - 构建项目：`pnpm build`

## 4. 通用代码规范

- 使用 ESLint 和 Prettier 保持代码风格一致，提交前请确保通过 lint 检查。
- 文件命名统一使用 kebab-case（短横线命名）：`user-profile.vue`、`auth-service.ts`。
- 组件文件名使用 PascalCase 命名：`UserProfile.vue`、`AppSidebar.vue`（仅组件文件除外）。
- 常量使用全大写下划线命名：`MAX_RETRY_COUNT`、`DEFAULT_TIMEOUT`。
- 变量和函数使用 camelCase 命名：`userName`、`getUserInfo`。

## 5. Vue 组件规范

- 使用组合式 API（Composition API）。
- `<script setup>` 优先。
- Props 必须定义类型，推荐使用 TypeScript 泛型语法。

## 6. TypeScript 规范

- 严格模式（strict: true），禁止隐式 any。
- 接口和类型定义使用 PascalCase：`interface UserInfo`、`type StatusType`。

## 7. CSS / TailwindCSS 规范

- 本项目样式统一使用 **TailwindCSS** 实现，优先通过原子化工具类（utility-first）编写样式。
- **禁止**在组件中使用内联 `style` 属性编写静态样式；仅允许用于动态计算值（如 `:style="{ width: dynamicWidth + 'px' }"`）。
- 避免编写大量自定义 CSS；确需自定义时，通过 Tailwind 配置扩展（`theme.extend`）或使用 `@layer` 组织，保持与设计令牌一致。
- 颜色、间距、圆角、字号等必须使用设计令牌对应的 Tailwind 类（如 `bg-background`、`text-foreground`、`rounded-lg`），禁止硬编码十六进制色值或任意像素值。
- 组件根元素建议不直接写具体尺寸，尺寸通过父级容器传入的类（class）控制。
- 重复出现的样式组合应抽取为可复用组件或使用 `@apply` 收敛，避免在模板中堆叠过长的类名。
- 响应式样式使用 Tailwind 断点前缀（`sm:`、`md:`、`lg:`、`xl:`、`2xl:`），移动优先：先写默认样式，再逐层增强。
- 暗色模式统一使用 `dark:` 前缀，配合 `darkMode: 'class'` 方案，禁止在业务代码中硬编码颜色切换逻辑。
- 类名顺序建议遵循 Tailwind 官方排序（布局 → 盒模型 → 排版 → 视觉 → 交互），可使用 `prettier-plugin-tailwindcss` 自动排序。
- 不要在模板字符串或 `:class` 中拼接 Tailwind 类名，确保类名完整可被扫描工具识别，避免样式丢失。
