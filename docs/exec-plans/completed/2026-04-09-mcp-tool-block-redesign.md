# MCP Tool Block — 内联折叠 + 高度受限展开

**Created**: 2026-04-09  
**Completed**: 2026-04-09
**Status**: ✅ Completed

## Outcome

优化 MCP 工具块的 UI 从现有的"展开后铺满"改为"内联折叠头 + 高度受限滚动展开区"，与 FileOperationBlock 设计语言一致。

## Why It Matters

MCP 工具（网络搜索、知识库检索等）可能返回大量结果。当前无限展开会破坏消息纵向布局，用户难以快速扫描。受限高度 + 滚动条让 MCP 结果永不"重"。

## Scope

- 修改 `mcp-tool-block.tsx`：折叠/展开 UI + 高度限制
- 修改 `tool-call-card.tsx`：MCP 块的折叠头部逻辑
- 保持 MCP result 解析逻辑不变

## Non-Goals

- 不改 Bash/Search/其他非 MCP 工具
- 不改 MCP protocol 或数据结构

## Hard Constraints

- 必须保持 66/66 测试通过、TypeScript 零报错
- 折叠头必须内联（无块、边框、投影）
- 展开区必须 `max-h-[520px] overflow-y-auto`

## Likely Affected Surfaces

1. `tool-call-card.tsx` — MCP 块分支重写
2. `mcp-tool-block.tsx` — 添加折叠头 + 高度限制展开区
3. 无生成制品变更

## Slices

### Slice 1: 理解 MCP 块结构与测试  
- [x] Read mcp-tool-block.tsx + 了解现有设计
- [x] Read tool-call-card.tsx 了解工具卡片如何分支路由 MCP
- [x] 检查是否有 MCP 块的测试 (无)

### Slice 2: 实现折叠/展开逻辑与高度限制
- [x] 创建 McpToolBlockWrapper 组件（内联折叠头 + 受限展开区）
- [x] 修改 McpToolBlock 支持 isNested 参数
- [x] block-renderer 中添加 MCP 工具路由
- [x] ToolCallCard 中移除 MCP 分支

### Slice 3: 验证
- [x] TypeScript typecheck ✅
- [x] 66/66 tests pass ✅
