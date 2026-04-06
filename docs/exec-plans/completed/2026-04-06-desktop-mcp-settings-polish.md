> ✅ Completed: 2026-04-06
> Summary: 完成 MCP 设置面板列表与表单布局打磨
> Duration: TBD
> Key learnings: TBD

# desktop mcp settings polish

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: 打磨桌面端 MCP 设置面板的列表与表单布局，提升信息安全和可读性，同时保持现有保存逻辑不变。
- **Scope**: `apps/desktop/src/renderer/src/components/settings/mcp-settings-panel.tsx` 的列表布局、连接方式选中态、参数 placeholder 与环境变量 / 请求头编辑区。
- **Non-goals**:
  - 不改动主进程 MCP 持久化语义
  - 不新增新的 MCP 配置字段
  - 不扩展超出当前面板的视觉系统
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-06-desktop-mcp-settings-polish.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

首版 MCP 设置页已经完成，但列表行的设置图标位置、敏感信息暴露、连接方式活跃态，以及环境变量 / 请求头的横向拥挤问题仍需要一轮快速 polish。

## Optimized Task Brief

- **Outcome**: 交付一版更克制、安全且更符合用户心智的 MCP 设置面板细节。
- **Problem**: 当前列表页会展示 `summary`，可能暴露命令或 URL 细节；右侧操作层级不够清晰；表单中环境变量与请求头过挤。
- **Scope**:
  - 调整列表页右侧操作顺序
  - 移除列表摘要与状态文案
  - 强化连接方式活跃态
  - 修正多行 placeholder
  - 将环境变量 / 请求头改为下方整块编辑区
- **Non-goals**:
  - 不修改 renderer 之外的 bridge / store / shared schema
  - 不额外增加新的测试场景，除非现有测试被布局改动影响
- **Constraints**:
  - 保持现有交互语义和测试稳定
  - 优先控制敏感信息展示
  - 视觉风格继续对齐 Appearance / 供应商面板
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/settings/mcp-settings-panel.tsx`
- **Validation**:
  - `bun run --cwd apps/desktop typecheck`
  - `bun run --cwd apps/desktop test`
- **Docs to sync**:
  - docs/exec-plans/active/desktop-mcp-settings-polish.md
  - docs/PLANS.md
- **Open assumptions**:
  - 列表页只展示名称与 transport 标签即可满足用户识别需求

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

- 列表项摘要移除后，用户仍需依赖名称区分不同服务器
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | 列表页不再展示 server summary | 避免暴露命令、URL、token 片段等敏感信息，也减少界面噪音 |
| 2026-04-06 | 环境变量与请求头改为下方整块编辑区 | 比放在右侧窄列更易读，也更适合多行键值配置 |

## Validation Log

- `python3 scripts/check_harness.py` -> passed
- `bun run --cwd apps/desktop typecheck` -> passed
- `bun run --cwd apps/desktop test` -> passed

## Archive Notes

- 完成时间：2026-04-06
- 完成摘要：收紧 MCP 设置页列表与表单布局，移除敏感摘要并优化键值配置编辑体验
- 关键收获：MCP 列表页越克制越安全，复杂键值配置应使用整块区域承载
