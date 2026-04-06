> ✅ Completed: 2026-04-06
> Summary: 完成 desktop 侧边栏 hover 间距修复与真实线程创建接入
> Duration: TBD
> Key learnings: TBD

# desktop sidebar spacing and real thread creation

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: 修复 desktop 左侧项目 hover 背景重叠，并把“新线程”从占位准备态接成真实 session 创建能力
- **Scope**: desktop sidebar spacing、desktop shell session creation wiring、sidebar/command palette renderer tests
- **Non-goals**: 不接入完整聊天消息流，不改 CLI transcript/remote session 协议，不改已有 session 删除语义
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/desktop-sidebar-spacing-and-real-thread-creation.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

desktop main 层已经具备 `createSession()`、`selectSession()`、`removeSession()` 和按 `sessionId` 隔离 terminal 的基础能力，但 renderer 当前“新线程”仍然调用 `prepareSession()`，只会把 `activeSessionId` 置空，未真正创建线程记录，导致一个项目下多线程能力停留在骨架阶段。

## Optimized Task Brief

- **Outcome**: 用户在当前项目下点击“新线程”会立即创建并选中新 session；每个 session 保持独立持久化记录并沿用独立 terminal sessionId；左侧项目 hover 之间保留轻微间隙
- **Problem**: 当前 UI 的线程创建入口没有落到真实 session 创建，多个线程的底层隔离能力虽已存在但未被正确暴露
- **Scope**: sidebar UI、desktop shell hook/layout/command palette wiring、session creation tests、计划归档
- **Non-goals**: 聊天消息发送、thread rename、跨线程共享运行态治理
- **Constraints**:
  - 复用现有 `worktree-state-store` 的 session 持久化模型
  - 保持 “一个 worktree 下多个 session” 的命名空间边界，不引入全局共享 terminal id
  - 变更后仍需兼容已有空 worktree / 无 session 状态
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/sidebar/workspace-sidebar.tsx`
  - `apps/desktop/src/renderer/src/components/command/command-palette.tsx`
  - `apps/desktop/src/renderer/src/hooks/use-desktop-shell.ts`
  - `apps/desktop/src/renderer/src/app/layout.tsx`
  - `apps/desktop/src/renderer/src/test/setup.ts`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run desktop:typecheck`
  - `bun run desktop:test`
  - `python3 scripts/check_harness.py`
- **Docs to sync**:
  - docs/exec-plans/active/desktop-sidebar-spacing-and-real-thread-creation.md
  - docs/PLANS.md
- **Open assumptions**:
  - 当前 desktop 的专业线程隔离最小闭环定义为：独立 session record + 独立 selected session + 独立 terminal sessionId

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

- renderer 继续调用 `prepareSession()` 会导致线程模型和底层持久化能力脱节
- 多线程隔离若不复用现有 `sessionId`，后续 terminal/chat runtime 会出现状态串扰
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | desktop 线程隔离继续以 `worktree -> many sessions` 建模 | main store、terminal panel 和 openwork 参考实现都采用 workspace/session 二级命名空间 |
| 2026-04-06 | “新线程”交互统一改为真实 `createSession()` | 用户期望是立即创建可切换线程，而不是进入无 active session 的准备态 |
| 2026-04-06 | 线程隔离的当前最小专业闭环定义为“独立 session record + 独立选中态 + 独立 terminal sessionId” | 现有 desktop 还没有消息流，但 terminal 已经按 `sessionId` 隔离，能先把线程边界做对 |

## Validation Log

- `python3 scripts/check_harness.py` -> pass
- `bun run desktop:typecheck` -> pass
- `bun run desktop:test` -> pass

## Archive Notes

- 归档时说明：sidebar hover gap 已修复；new thread 已接入真实 session 创建；command palette 与 sidebar 入口保持一致
