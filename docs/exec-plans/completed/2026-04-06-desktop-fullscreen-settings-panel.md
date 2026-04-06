> ✅ Completed: 2026-04-06
> Summary: Delivered the fullscreen desktop settings panel with an Appearance page, sidebar settings entry, runtime theme/pointer/font-size controls, and renderer regression coverage.
> Duration: TBD
> Key learnings: TBD

# desktop-fullscreen-settings-panel

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: Add a full-screen desktop settings surface with a dedicated sidebar entry and an Appearance page that controls theme, pointer cursor, and base UI/code font sizes.
- **Scope**: Desktop renderer shell, workspace sidebar, UI store, global theme/css application, and renderer tests for the new settings flow.
- **Non-goals**: No persistent settings storage, no multi-category settings IA beyond Appearance, no backend/main-process config sync, and no redesign of workspace/terminal flows outside what settings mode requires.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/desktop-fullscreen-settings-panel.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The desktop shell already has a two-column layout, runtime `theme`
state, and a workspace sidebar with clear navigation affordances. The
requested feature should reuse those shell primitives instead of opening
another modal or introducing a parallel routing system. The smallest
coherent change is to add a shell-level "settings mode" that swaps the
sidebar content and main stage while preserving the existing titlebar,
sidebar width, and terminal/workspace state.

## Optimized Task Brief

- **Outcome**: Users can open a full-screen settings view from a bottom sidebar entry, navigate an Appearance section, preview/select theme mode, toggle pointer cursor behavior, and adjust base UI/code font sizes from a cohesive desktop settings layout.
- **Problem**: The shell currently exposes only transient header controls; there is no discoverable settings entry point or structured settings surface, so appearance configuration cannot scale beyond one-off chrome buttons.
- **Scope**:
  - Add a bottom "设置" entry to the workspace sidebar.
  - Introduce a shell-level settings mode with a left settings navigation rail and a right settings content panel.
  - Build the first settings category: `Appearance`.
  - Extend renderer UI state to track settings mode and appearance preferences.
  - Apply appearance preferences to theme resolution, pointer cursor behavior, and shared font-size CSS variables/terminal font size.
- **Non-goals**:
  - Persisting appearance preferences across launches.
  - Implementing additional settings categories beyond Appearance.
  - Reworking the command palette, workspace state model, or backend settings files.
- **Constraints**:
  - Preserve the existing desktop two-column shell and sidebar width behavior.
  - Keep the settings flow full-screen, not modal.
  - Reuse the current visual language instead of introducing a separate design system.
  - Do not break existing workspace navigation, terminal toggles, or theme cycling shortcuts.
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/app/layout.tsx`
  - `apps/desktop/src/renderer/src/components/sidebar/workspace-sidebar.tsx`
  - `apps/desktop/src/renderer/src/components/settings/*`
  - `apps/desktop/src/renderer/src/stores/ui.ts`
  - `apps/desktop/src/renderer/src/app/providers.tsx`
  - `apps/desktop/src/renderer/src/styles/globals.css`
  - renderer tests and this execution plan
- **Validation**:
  - `bun run --cwd apps/desktop typecheck`
  - `bun run --cwd apps/desktop test`
  - targeted smoke assertions for entering settings, returning to the app, and applying appearance controls
- **Docs to sync**:
  - docs/exec-plans/active/desktop-fullscreen-settings-panel.md
  - docs/PLANS.md
- **Open assumptions**:
  - Runtime-only storage is acceptable for this slice because the request focuses on UI delivery, not cross-launch persistence.
  - Applying UI/code font size through shared CSS variables plus terminal font size is sufficient for the current renderer surface.

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

- Appearance preferences are currently renderer-local, so a reload resets them.
- The renderer still contains many hard-coded pixel utilities; UI font size changes will be strongest where components inherit shared CSS variables and less complete where sizes are explicitly fixed.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | Implement settings as a shell mode instead of a dialog route. | The requested UX is full-screen and reuses the existing two-column desktop frame. |
| 2026-04-06 | Keep appearance settings runtime-only in this slice. | The user asked for the panel/interaction first; persistence can layer on later without blocking the shell architecture. |
| 2026-04-06 | Apply UI and code sizing through shared CSS variables plus terminal font binding. | This gives the new settings surface immediate visible effect without forcing a risky full-app typography refactor in one slice. |

## Validation Log

- `python3 scripts/check_harness.py` -> pass
- Read `docs/PLANS.md`, `docs/generated/harness-manifest.md`, `docs/OBSERVABILITY.md`, and `docs/FRONTEND.md`
- Inspected `layout`, `workspace-sidebar`, `providers`, `ui store`, and renderer smoke/store tests to bound the change
- `bun run --cwd apps/desktop typecheck` -> pass
- `bun run --cwd apps/desktop test` -> pass
- Added smoke coverage for opening the settings view, returning to the workspace, and applying theme/pointer/font-size controls

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
