> ✅ Completed: 2026-04-06
> Summary: 完成头部 MCP 快捷入口与悬浮切换卡
> Duration: TBD
> Key learnings: TBD

# desktop mcp quick access menu

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: 在工作区头部新增 MCP 快捷入口，支持悬浮查看当前 MCP 列表、快速启用/禁用，并跳转到完整 MCP 设置页。
- **Scope**: `apps/desktop` renderer 头部操作区、MCP 快捷悬浮卡组件、现有测试与计划文档同步。
- **Non-goals**:
  - 不改动 MCP 主进程持久化语义
  - 不在快捷卡中支持新增、编辑或删除 MCP
  - 不接入运行态健康检查，仅展示配置态列表与开关
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-06-desktop-mcp-quick-access-menu.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

完整的 MCP 设置页已经可用，但常规对话界面缺少就近入口。用户希望在头部操作区直接看到一个 MCP 图标，展开后快速启用或停用某个 MCP，并能一键进入完整设置页。

## Optimized Task Brief

- **Outcome**: 交付一个位于终端按钮左侧的 MCP 快捷入口，下拉卡内可查看列表、即时开关，并带一个小字入口跳转到 `MCP 服务器` 设置页。
- **Problem**: 现在若想切换某个 MCP 的启用状态，用户必须进入完整设置页，操作路径偏长。
- **Scope**:
  - 在 `layout.tsx` 的头部按钮区接入 MCP 快捷入口
  - 新增独立的 MCP 快捷悬浮卡组件
  - 使用现有 `desktopApp.getMcpSettings` / `toggleMcpServer`
  - 增加 smoke test 覆盖快速开关和跳转设置页
- **Non-goals**:
  - 不在悬浮卡中展示命令 / URL 摘要
  - 不在悬浮卡中处理 unsupported transports
- **Constraints**:
  - 视觉上必须保持与现有头部按钮克制统一
  - 快捷卡中的切换不能意外关闭或破坏当前工作区视图
  - 不泄露 MCP 详细连接信息
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/app/layout.tsx`
  - `apps/desktop/src/renderer/src/components/mcp/mcp-quick-access-menu.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run --cwd apps/desktop typecheck`
  - `bun run --cwd apps/desktop test`
- **Docs to sync**:
  - docs/exec-plans/active/desktop-mcp-quick-access-menu.md
  - docs/PLANS.md
- **Open assumptions**:
  - 快捷卡按配置态展示 MCP 列表即可满足快速切换诉求

## Incremental Slices

### Slice 1 — Establish context and the smallest viable change

- [x] Implement
- [x] Validate

### Slice 2 — Deliver the core implementation

- [x] Implement
- [x] Validate

### Slice 3 — Documentation, observability, and finish-up

- [x] Sync docs and generated surfaces
- [x] Final validation

## Risks and Rollback

- 快捷卡与头部按钮的焦点/展开交互需要保持稳定
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | 快捷卡只展示名称、transport 与启用开关 | 这是最小且安全的头部摘要，不暴露连接细节 |
| 2026-04-06 | 使用独立头部组件承载 MCP 快捷卡 | 避免把 `layout.tsx` 头部操作区继续膨胀 |

## Validation Log

- `python3 scripts/check_harness.py` -> passed
- `bun run --cwd apps/desktop typecheck` -> passed
- `bun run --cwd apps/desktop test` -> passed

## Archive Notes

- 完成时间：2026-04-06
- 完成摘要：在工作区头部新增 MCP 快捷入口，支持悬浮查看、快速开关与跳转完整设置
- 关键收获：头部工具菜单应展示最小安全摘要，把详细配置留给完整设置页
