> ✅ Completed: 2026-04-06
> Summary: 完成桌面端 MCP 服务器设置面板与用户级配置持久化
> Duration: TBD
> Key learnings: TBD

# desktop mcp settings panel

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: 在桌面端设置页新增可视化的 `MCP 服务器` 配置区，支持查看、创建、编辑、启用/禁用和卸载用户级 MCP 服务器，并与 CLI 读取的全局用户配置保持兼容。
- **Scope**: `apps/desktop` 的主进程持久化、preload/bridge 契约、renderer 设置页与测试；配置读写目标为 `~/.claude.json` 顶层 `mcpServers` 与 `disabledMcpServers`。
- **Non-goals**:
  - 不在首版接入 project/local/enterprise/claude.ai/plugin 等多来源 MCP 管理
  - 不在首版暴露 OAuth、headersHelper、XAA 等高级远程认证能力
  - 不重做 CLI `/mcp` TUI，本次仅实现桌面端设置体验
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-06-desktop-mcp-settings-panel.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

CLI 已支持从全局配置、项目配置和本地配置聚合 MCP 服务器，但桌面端当前只有 Appearance / 供应商设置，缺少用户级 MCP 的可视化入口。用户希望沿用 CLI 的配置语义，把最常见的用户级自定义 MCP 迁移到桌面设置中，同时保持更直观的添加、编辑和启用切换体验。

## Optimized Task Brief

- **Outcome**: 交付一个和现有全屏设置面板风格一致的 `MCP 服务器` 页面，包含列表页、添加页和编辑页，并将修改稳定写回用户全局 Claude 配置。
- **Problem**: 当前桌面端无法查看或维护 CLI 中已有的用户级 MCP 服务器，用户必须回到命令行或手改配置文件，体验割裂且容易出错。
- **Scope**:
  - 在设置侧边栏新增 `MCP 服务器`
  - 在 renderer 新增 MCP 列表页和编辑/创建页
  - 在 main process 新增 `~/.claude.json` 的 MCP 读取与写入 store
  - 暴露新增 bridge 合约并补测试
- **Non-goals**:
  - 不管理 `.mcp.json` 审批态字段
  - 不同步 CLI 运行态连接状态，仅管理用户配置层的启用/禁用
  - 不新增 MCP 连接探活或 OAuth 登录流程
- **Constraints**:
  - 保持与桌面端现有 Appearance / 供应商面板统一的视觉层级与交互密度
  - 解释文案面向终端用户，避免把 CLI 内部实现直接暴露成生硬术语
  - 持久化必须尽量原子化，避免破坏已有全局配置结构
  - 只支持桌面端首版明确覆盖的 transport，未覆盖项必须优雅降级
- **Affected surfaces**:
  - `apps/desktop/src/shared/*`
  - `apps/desktop/src/main/*`
  - `apps/desktop/src/preload/index.ts`
  - `apps/desktop/src/renderer/src/components/settings/*`
  - `apps/desktop/src/renderer/src/stores/ui.ts`
  - `apps/desktop/src/renderer/src/app/layout.tsx`
  - `apps/desktop/src/renderer/src/test/*`
- **Validation**:
  - `python3 scripts/check_harness.py`
  - `bun run --cwd apps/desktop typecheck`
  - `bun run --cwd apps/desktop test`
- **Docs to sync**:
  - docs/exec-plans/active/desktop-mcp-settings-panel.md
  - docs/PLANS.md
- **Open assumptions**:
  - 桌面端首版以用户级 `~/.claude.json` 顶层 `mcpServers` + `disabledMcpServers` 为唯一持久化来源
  - 首版以 `stdio`、`http`、`sse` 作为可读写 transport；更复杂 transport 暂不暴露

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

- 用户全局配置文件已有其他字段，写入时必须保留未知字段
- 不同 transport 的 schema 差异较大，需要限制首版表单边界并做输入校验
- 若存在桌面端暂不支持的 transport，需要显式提示而不是静默覆盖
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | 桌面端首版仅管理用户级全局 MCP | 避免把 project/local/enterprise 的审批与多源合并逻辑引入桌面设置 |
| 2026-04-06 | 启用/禁用通过 `disabledMcpServers` 表示 | 这与 CLI 全局配置的禁用语义一致，而不是给每个 server 写入 `enabled` 字段 |
| 2026-04-06 | 高级远程认证能力不在首版表单暴露 | OAuth / headersHelper / XAA 的复杂度高，先保证基础配置稳定可用 |

## Validation Log

- `python3 scripts/check_harness.py` -> passed
- `bun run --cwd apps/desktop typecheck` -> passed
- `bun run --cwd apps/desktop test` -> passed
- `python3 scripts/check_harness.py` -> passed after implementation

## Archive Notes

- 完成时间：2026-04-06
- 完成摘要：交付桌面端 MCP 服务器设置页，支持用户级 `~/.claude.json` 的读取、创建、编辑、启用/禁用和卸载
- 关键收获：桌面端首版只聚焦用户级 MCP，可在兼容 CLI 语义的同时控制 UI 与实现复杂度
