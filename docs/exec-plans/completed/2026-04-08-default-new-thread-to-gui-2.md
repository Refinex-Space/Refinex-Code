> ✅ Completed: 2026-04-08
> Summary: Default new-session GUI flow now uses workspace-empty-state in place of the GUI intro card; smoke coverage updated
> Duration: TBD
> Key learnings: TBD

# default new thread to gui

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-08
- **Goal**: 新建线程时默认进入 GUI 对话模式，而不是 thread-tui
- **Scope**: desktop renderer 线程模式默认值、空 GUI 会话占位渲染与相关回归测试
- **Non-goals**: 不改 IPC 协议、不移除 TUI 能力、不改已有手动模式切换交互
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-08-default-new-thread-to-gui.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

当前新线程在未写入模式偏好时会回落到 tui，导致首次发送默认走 thread-tui 通道。
产品目标是默认以 GUI 对话为主，TUI 作为可显式切换的高级路径。
补充需求要求去除“开始一段 GUI 对话”卡片，并复用 `workspace-empty-state` 作为空会话中间态。

## Optimized Task Brief

- **Outcome**: TBD
- **Outcome**: 新建线程首次打开时默认显示 GUI，对应发送按钮默认走 GUI 通道
- **Problem**: 默认回落值写死为 tui，和期望的 GUI-first 体验不一致
- **Scope**:
  - `apps/desktop/src/renderer/src/stores/ui.ts`
  - `apps/desktop/src/renderer/src/components/workspace/thread-mode-toggle.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Non-goals**:
  - 不修改 main/preload 的 terminal 创建协议
  - 不修改 GUI 对话后端桥接逻辑
- **Constraints**:
  - 只做最小必要改动，保持手动切换 GUI/TUI 的行为不变
  - 保持 slash 命令等明确依赖 TUI 的路径可用
- **Affected surfaces**:
  - 线程模式默认解析
  - 顶栏模式切换控件初始选中态
  - smoke 测试中的默认发送行为断言
  - GUI 空会话视图占位组件
- **Validation**:
  - 运行 desktop renderer 相关 smoke test，验证默认发送走 GUI
  - 验证切换到 TUI 后仍可发送到 thread-tui
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-08-default-new-thread-to-gui.md
  - docs/PLANS.md
- **Open assumptions**:
  - 新建线程默认进入 GUI 不会破坏依赖 TUI 的主动命令流（可通过显式切换覆盖）

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

### Slice 4 — Replace GUI empty-card with workspace empty-state

- [x] Implement
- [x] Validate

## Risks and Rollback

- 风险: 依赖“默认 TUI”的测试或隐式行为可能回归。
- 缓解: 仅调整默认值，保留显式切换与 TUI 发送路径；补充 smoke 断言覆盖。
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-08 | 采用 GUI-first 默认值，仅改 renderer 侧回落逻辑 | 以最小改动达成体验目标，避免触及 IPC/后端流程 |
| 2026-04-08 | 同步 thread-mode-toggle 的无偏好回落值为 gui | 避免顶部模式选择显示与会话实际模式不一致 |
| 2026-04-08 | 保留 slash 命令走 TUI 的测试路径，但改为先显式切换到 TUI | 保证 GUI-first 默认与 TUI 专用能力可并存 |
| 2026-04-08 | 空 GUI 会话改由 workspace-empty-state 渲染 | 满足补充需求并复用现有空态视觉体系 |

## Validation Log

- 2026-04-08: `python3 scripts/check_harness.py` 通过（OK: True, No findings）
- 2026-04-08: `cd apps/desktop && bun run test src/renderer/src/test/shell.smoke.test.tsx` 通过（28 passed）
- 2026-04-08: `cd /Users/refinex/develop/code/refinex/Refinex-Code && python3 scripts/check_harness.py` 通过（OK: True；提示 PLANS 未列 active 计划）
- 2026-04-08: `cd /Users/refinex/develop/code/refinex/Refinex-Code/apps/desktop && bun run test src/renderer/src/test/shell.smoke.test.tsx` 通过（28 passed，包含空会话占位替换断言）

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
