<!-- HARNESS:MANAGED FILE -->
# Development Plans

> Read this file before starting work so the current active plans and
> priority are known.

## Current State

- **Active plans directory**: `docs/exec-plans/active/`
- **Harness status**: maintained via `scripts/check_harness.py`
- **Structural debt**: `docs/exec-plans/tech-debt-tracker.md`

## Active Plan Entry Points

> 暂无进行中计划。

## Recently Completed

### MCP Tool Block — 内联折叠 + 高度受限展开

优化 MCP 工具块的 UI，从"展开后铺满"改为"内联折叠头 + 高度受限滚动展开区"。

- [MCP Tool Block Redesign](exec-plans/completed/2026-04-09-mcp-tool-block-redesign.md) ✅ Completed

### File Operation Block — 深度样式重构

将文件编辑/创建/查看工具展示从 ToolCallCard 卡片升级为 Codex 风格内联文件操作块。

- [File Operation Block Redesign](exec-plans/completed/2026-04-08-file-operation-block-redesign.md) ✅ Completed

### Desktop GUI AI Response Panel（响应交互面板）

目标：为 Refinex-Code Desktop 设计并实现生产级 AI 响应交互面板，覆盖流式 Markdown、工具调用、差异审批、子代理可视化等全部 CLI 输出类型。

- [Phase A — Data Model & Type System](exec-plans/completed/2026-04-08-desktop-gui-response-panel-phase-a-data-model.md) ✅ Completed
- [Phase B — Message Renderer Components](exec-plans/completed/2026-04-08-desktop-gui-response-panel-phase-b-message-renderer.md) ✅ Completed
- [Phase C — Tool Components](exec-plans/completed/2026-04-08-desktop-gui-response-panel-phase-c-tool-components.md) ✅ Completed
- [Phase D — Advanced Features](exec-plans/completed/2026-04-08-desktop-gui-response-panel-phase-d-advanced.md) ✅ Completed

## Rules

1. New work should create or reuse an active plan under `docs/exec-plans/active/`
2. Completed plans move to `docs/exec-plans/completed/`
3. Structural debt and deferred cleanup belong in `docs/exec-plans/tech-debt-tracker.md`
4. `PLANS.md` stays short and points to detailed execution plans
