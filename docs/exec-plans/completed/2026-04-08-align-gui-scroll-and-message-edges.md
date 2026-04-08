> ✅ Completed: 2026-04-08
> Summary: Aligned GUI scroll and message edges with composer container and right-side scroll rail
> Duration: TBD
> Key learnings: TBD

# align gui scroll and message edges

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-08
- **Goal**: 让 GUI 对话滚动条贴近应用右侧，并使消息左右边界与输入框左右边界对齐
- **Scope**: `workspace-home.tsx` 与 `workspace-conversation.tsx` 布局容器对齐修正
- **Non-goals**: 不改消息生成逻辑、不改 TUI 行为、不改后端接口
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-08-align-gui-scroll-and-message-edges.md`

## Harness Preflight

- **Repo check**: available with findings
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

当前滚动条仍与应用右缘存在间距，且消息列宽度（760）小于输入框容器宽度（920），导致消息与输入框左右边界不对齐。

## Optimized Task Brief

- **Outcome**: GUI 滚动条位于主内容最右边；AI 消息左边界与输入框左边界对齐，用户消息右边界与输入框右边界对齐
- **Problem**: 外层容器 `px-4` 与消息列 `max-w-[760px]` 导致滚动与边界错位
- **Scope**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-home.tsx`
  - `apps/desktop/src/renderer/src/components/workspace/workspace-conversation.tsx`
- **Non-goals**:
  - 不调整消息气泡内容样式策略
- **Constraints**:
  - 保持现有交互与测试行为不变
  - 保持 composer 组件 API 不变
- **Affected surfaces**:
  - 线程内容滚动容器
  - GUI 消息列宽度与边距
- **Validation**:
  - `apps/desktop` 的 `shell.smoke.test.tsx` 全通过
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-08-align-gui-scroll-and-message-edges.md
  - docs/PLANS.md
  - docs/generated/harness-manifest.md
- **Open assumptions**:
  - 输入框对齐基准为 `data-thread-composer="surface"` 的 `max-w-[920px]` 容器

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
- [ ] Archive the active plan and refresh Harness generated surfaces

## Risks and Rollback

  - TBD
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-08 | 移除 workspace 根容器横向 `px-4` | 让 thread-surface 滚动条贴近应用最右侧 |
| 2026-04-08 | GUI 消息列宽度改为 `max-w-[920px]` 并移除横向内边距 | 与 composer 容器边界对齐，满足左右对齐要求 |

## Validation Log

- Plan initialized; add real validation commands and outcomes
- 2026-04-08: `cd /Users/refinex/develop/code/refinex/Refinex-Code/apps/desktop && bun run test src/renderer/src/test/shell.smoke.test.tsx` 通过（28 passed）

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
- Confirm the plan moved into `docs/exec-plans/completed/` after archiving
- If `docs/generated/harness-manifest.md` exists, confirm it was refreshed after archiving
