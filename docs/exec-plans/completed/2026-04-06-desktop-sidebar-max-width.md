> ✅ Completed: 2026-04-06
> Summary: 限制桌面侧边栏拖拽宽度，并增加最大宽度约束与回归测试。
> Duration: single turn
> Key learnings: State-level width clamping plus drag-time transition disablement keeps the sidebar bounded without introducing resize lag.

# 限制侧边栏最大宽度

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: Add a bounded, smooth sidebar width resize path so the desktop shell never lets the sidebar crowd out the main workspace.
- **Scope**: `apps/desktop` renderer UI state, shell layout, and a focused regression test for width clamping.
- **Non-goals**: Persisting sidebar width across launches, redesigning sidebar content, or changing terminal resize behavior.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-06-desktop-sidebar-max-width.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The shell currently renders sidebar width from a single visual width token.
That is enough for static layout, but not enough to enforce safe bounds once
drag-based resizing is introduced or refined. The width constraint needs to
live in state so every resize path shares the same invariants.

## Optimized Task Brief

- **Outcome**: Users can drag the desktop sidebar width, but the width is clamped to a clear maximum and still feels immediate during resize.
- **Problem**: An unconstrained sidebar can grow until it meaningfully reduces the available workspace, especially on smaller desktop windows.
- **Scope**: Add sidebar width state, clamp logic, viewport-aware max-width behavior, a drag handle, and regression coverage.
- **Non-goals**: Session persistence, sidebar information architecture changes, or unrelated header polish.
- **Constraints**:
  - Preserve existing sidebar open/close behavior.
  - Prefer state-layer constraints over one-off DOM checks.
  - Keep the main content usable on narrower windows.
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/stores/ui.ts`
  - `apps/desktop/src/renderer/src/app/layout.tsx`
  - `apps/desktop/src/renderer/src/test/`
- **Validation**:
  - `bun run --cwd apps/desktop typecheck`
  - `bun run --cwd apps/desktop test`
- **Docs to sync**:
  - docs/exec-plans/completed/2026-04-06-desktop-sidebar-max-width.md
  - docs/PLANS.md
- **Open assumptions**:
  - A viewport-aware hard cap is preferable to a purely visual CSS-only max-width.
  - A small inline drag handle is acceptable for the desktop shell interaction model.

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

- Store-level clamping could feel laggy if width updates are animated during drag; disable transition while the pointer is active.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | Clamp sidebar width in the UI store instead of only in the component tree. | This keeps every resize path on the same min/max invariant and makes the behavior testable without DOM coupling. |
| 2026-04-06 | Make the sidebar max width viewport-aware in addition to using a hard cap. | A fixed maximum alone still lets the sidebar crowd out the main workspace on narrow windows. |

## Validation Log

- `python3 scripts/check_harness.py` -> pass
- `bun run --cwd apps/desktop typecheck` -> pass
- `bun run --cwd apps/desktop test` -> pass (`3` files, `6` tests)

## Archive Notes

- Ready to archive after noting that sidebar resizing now clamps in state and remains immediate by disabling width animation during pointer drag.
