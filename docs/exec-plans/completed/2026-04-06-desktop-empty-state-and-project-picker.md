> ✅ Completed: 2026-04-06
> Summary: 重构桌面主舞台空态，并用 Radix Themes DropdownMenu 接入项目选择器。
> Duration: single turn
> Key learnings: When a shell screen is mostly empty, visual hierarchy matters more than feature density; splitting the center framing from the bottom composer made the product intent much clearer while keeping the implementation bounded.

# 重构桌面主舞台空态与项目选择器

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: Rebuild the desktop main-stage empty state so the center stack matches the referenced design: logo, “开始构建”, and a current-project dropdown with searchable project selection and add-project action, while keeping the session composer centered at the bottom.
- **Scope**: Desktop renderer main-stage layout, project picker interaction, worktree selection wiring, and smoke-test coverage for the new empty-state flow.
- **Non-goals**: Implementing model switching, message send behavior, or migrating chat transcript surfaces into the main stage.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-06-desktop-empty-state-and-project-picker.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The previous main-stage pass cleaned up the right pane and moved the composer to the bottom, but the empty state still did not match the intended product composition. The user provided a concrete reference and explicitly asked for a one-to-one center stack plus a proper project picker popup.

## Optimized Task Brief

- **Outcome**: The right main panel now has a centered empty-state stack with brand/logo, “开始构建”, and a searchable current-project dropdown, while the composer remains bottom-centered.
- **Problem**: The previous helper-copy based empty state did not reflect the intended information hierarchy and lacked a proper project-switch workflow.
- **Scope**: Replace the center helper text with a purpose-built empty-state component, wire it to the existing worktree store and desktop shell actions, and use Radix Themes `DropdownMenu` for the popup.
- **Non-goals**: Bringing over the full Omni chat workflow, session creation controls in the center stack, or any backend changes.
- **Constraints**:
  - Keep the composer at the bottom and horizontally centered inside the main panel.
  - Use the existing desktop worktree state and actions instead of introducing a parallel project model.
  - Correctly integrate Radix Themes `DropdownMenu` rather than a custom popup.
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-home.tsx`
  - `apps/desktop/src/renderer/src/components/workspace/workspace-empty-state.tsx`
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/app/layout.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run --cwd apps/desktop typecheck`
  - `bun run --cwd apps/desktop test`
  - `python3 scripts/check_harness.py`
- **Docs to sync**:
  - docs/exec-plans/completed/2026-04-06-desktop-empty-state-and-project-picker.md
  - docs/PLANS.md
- **Open assumptions**:
  - Using the existing worktree labels and add-project flow is enough to satisfy the project picker requirements in this slice.

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

- Radix Themes `DropdownMenu` changes the accessibility tree and focus handling when open, so tests must avoid asserting hidden base-layer controls after the menu opens.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | Split the right panel into a centered empty-state layer and a bottom composer layer. | This is the simplest structure that satisfies both the centered product framing and the bottom-docked input requirement. |
| 2026-04-06 | Use Radix Themes `DropdownMenu` as the project picker shell. | The user explicitly asked for the proper Themes integration instead of a custom popup fallback. |
| 2026-04-06 | Remove project path text from the visible list rows and rely on label + icon + active checkmark. | The user asked for a tighter, more reference-accurate popup. |

## Validation Log

- Rebuilt the center stack to show logo, title, and a searchable project picker anchored to the current project label.
- Wired picker selection to the existing `selectWorktree` action and bottom action to `openWorkspace`.
- `bun run --cwd apps/desktop typecheck` -> pass
- `bun run --cwd apps/desktop test` -> pass (`3` files, `8` tests)
- `python3 scripts/check_harness.py` -> pass

## Archive Notes

- Ready to archive after normalizing the completed plan filename to the repository's date-first convention.
