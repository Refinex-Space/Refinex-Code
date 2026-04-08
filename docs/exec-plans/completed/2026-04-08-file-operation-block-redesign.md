# File Operation Block — 深度样式重构

**Created**: 2026-04-08
**Completed**: 2026-04-08
**Status**: ✅ Completed

## Outcome

将 Desktop GUI 中文件编辑/创建/查看的工具调用展示从普通 ToolCallCard 卡片升级为
Codex 风格的专业内联文件操作块，包含实时状态指示、行数统计、可折叠 diff 视图。

## Why It Matters

当前 Edit File 工具展示为一个简陋卡片，展开后仅显示 "The file ... has been updated
successfully."，用户无法看到实际修改内容。参考 Codex App 的设计，文件操作应以更
紧凑、信息密度更高的方式呈现。

## Scope

- 新建 `FileOperationBlock` 组件取代文件类工具的 ToolCallCard 渲染
- 折叠行：动态状态词 + 文件名链接 + `+N`/`-N` 行数徽章 + 展开箭头
- 展开区：统一 diff 代码块 + 文件名头部 + 复制按钮
- 适配三种工具：`Edit` (str_replace)、`Write` (创建/覆盖)、`Read` (查看)
- 从 `block.input` 计算 diff（Edit: old_string → new_string; Write: 全新内容）

## Non-Goals

- 不修改 Bash、Search、MCP 等非文件工具的渲染
- 不实现真实的文件链接打开（标记为"敬请期待"）
- 不改变后端 NDJSON 数据结构

## Hard Constraints

- 工具名精确匹配：`"Edit"`, `"Write"`, `"Read"`
- 输入字段：Edit 用 `file_path`/`old_string`/`new_string`; Write 用 `file_path`/`content`; Read 用 `file_path`
- 必须保持 66/66 测试通过、TypeScript 零报错

## Affected Surfaces

1. `blocks/file-edit-diff-block.tsx` → 删除（被新组件替代）
2. `blocks/tool-call-card.tsx` → 移除文件操作分支
3. `block-renderer.tsx` → 文件类 tool_use 路由到新组件
4. 新文件 `blocks/file-operation-block.tsx`

## Validation Target

- `bun run typecheck` 通过
- `bun run test` 66/66 通过
- 肉眼确认：折叠/展开/状态词/行数/diff 正确渲染

## Slices

### Slice 1: 创建 FileOperationBlock 组件

- [x] 文件操作类型检测（edit/create/read）
- [x] 动态状态词（正在编辑/已编辑/正在创建/已创建/正在查看 等）
- [x] 文件名提取与显示
- [x] +N/-N diff 行数统计
- [x] 折叠/展开切换
- [x] 展开区 unified diff 渲染
- [x] 复制按钮
- [x] 文件名链接样式（点击提示"敬请期待"）

### Slice 2: 路由整合

- [x] block-renderer.tsx 中文件类 tool_use 路由到新组件
- [x] tool-call-card.tsx 移除文件操作分支
- [x] 清理旧的 file-edit-diff-block.tsx

### Slice 3: 验证

- [x] TypeScript typecheck
- [x] 66/66 test pass
