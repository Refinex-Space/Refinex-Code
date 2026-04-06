> ✅ Completed: 2026-04-06
> Summary: 清理桌面主区域，并迁入 RefineX Omni 风格的会话输入框工作台。
> Duration: single turn
> Key learnings: Removing scaffolding UI can be the highest-leverage feature work when the core interaction surface is known; migrating only the composer shell preserved the right UX focus without overcommitting to unfinished chat plumbing.

# 清理桌面主区域并迁移输入框样式

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: Remove the oversized information panels from the desktop main workspace and replace them with a clean session composer that visually follows the `Refinex-Omni` input component.
- **Scope**: Desktop renderer `WorkspaceHome`, a new composer component, updated layout props, and smoke-test coverage for the simplified main stage.
- **Non-goals**: Migrating the Omni model picker behavior, bottom config/status strip, or the actual chat send pipeline.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-06-desktop-main-stage-and-session-composer.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The current desktop main area is dominated by explanatory panels that were useful during shell scaffolding but now crowd out the real interaction target. The user wants the main stage reduced to a clean work surface and specifically wants the input composer to inherit the visual language from `Refinex-Omni`.

## Optimized Task Brief

- **Outcome**: The right main area becomes a focused session workspace with a centered island-style composer, while the old `项目信息 / Current context / Storage design` blocks are removed.
- **Problem**: The current layout spends most of the main stage on scaffolding copy instead of the core interaction surface.
- **Scope**: Rebuild `WorkspaceHome`, add a `WorkspaceComposer`, preserve only minimal open-project / create-thread affordances, and keep a TODO model entry without migrating the Omni bottom status row.
- **Non-goals**: Provider-backed model selection, message send persistence, transcript rendering, or moving extra Omni chrome into this shell.
- **Constraints**:
  - Preserve the existing sidebar-driven navigation model.
  - Keep the main stage materially cleaner than the old panel layout.
  - Reproduce the Omni composer shell and action row, but omit the bottom configuration strip by design.
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-home.tsx`
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/app/layout.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run --cwd apps/desktop typecheck`
  - `bun run --cwd apps/desktop test`
- **Docs to sync**:
  - docs/exec-plans/completed/2026-04-06-desktop-main-stage-and-session-composer.md
  - docs/PLANS.md
- **Open assumptions**:
  - A visual TODO model entry is sufficient for this slice.
  - The send button can remain a visual shell with a TODO toast until the chat pipeline arrives.

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

- The composer currently exposes visual TODO affordances for model switch, file attach, and send; future functional work must replace those toasts rather than layering a second interaction model on top.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | Drop the old information-heavy `WorkspaceHome` panel grid entirely instead of trimming it incrementally. | The user explicitly wanted a clean main stage, and partial trimming would preserve the wrong layout center of gravity. |
| 2026-04-06 | Recreate only the Omni composer shell and action row, not its bottom status/config strip. | The user asked for the input style specifically and said the lower configuration row should not be migrated. |

## Validation Log

- Inspected `apps/desktop/src/components/chat/chat-input.tsx` and `model-selector.tsx` in `Refinex-Omni` and copied the input-shell, model-pill, and send-button structure.
- Removed the old `Shipped in this slice`, `Current context`, and `Storage design` surfaces from the desktop main area.
- `bun run --cwd apps/desktop typecheck` -> pass
- `bun run --cwd apps/desktop test` -> pass (`3` files, `8` tests)

## Archive Notes

- Ready to archive. The new main stage is intentionally UI-first and keeps the behavior boundary explicit through TODO toasts.
