> ✅ Completed: 2026-04-06
> Summary: Added persisted desktop Appearance settings with per-theme sidebar and main-panel background colors, main/preload bridge support, renderer hydration/writeback, runtime bridge guards, and regression coverage.
> Duration: TBD
> Key learnings: TBD

# desktop-appearance-color-settings-persistence

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: Add configurable sidebar and main-panel background colors to the desktop Appearance settings and persist the full appearance configuration with explicit defaults.
- **Scope**: Shared appearance settings schema/defaults, main-process persistence, preload bridge, renderer store hydration/sync, Appearance settings UI, and regression coverage.
- **Non-goals**: No new settings categories, no remote sync, and no redesign of the broader desktop shell outside what the new color settings require.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/desktop-appearance-color-settings-persistence.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The desktop settings page already exposes theme, pointer cursor, and
font-size controls, but they are renderer-local and reset on reload.
The requested background-color controls introduce explicit default-value
requirements and persistent read/write behavior, so the right abstraction
is now a first-class desktop Appearance settings store backed by the
existing Electron `userData` pattern rather than ad hoc runtime state.

## Optimized Task Brief

- **Outcome**: Users can configure light/dark sidebar and main-panel background colors from the Appearance page, see color previews, and have the full appearance configuration reload correctly from persistent storage.
- **Problem**: The current Appearance controls are transient, and there is no persistent configuration surface for the newly requested per-theme background colors.
- **Scope**:
  - Define a shared appearance-settings schema with defaults and sanitization.
  - Persist appearance settings under the desktop app data directory.
  - Expose read/write bridge methods to the renderer.
  - Hydrate and sync renderer UI state from the persisted settings.
  - Add two new settings items above pointer cursor: sidebar background and main-panel background.
- **Non-goals**:
  - Theme preset import/export.
  - Per-project appearance overrides.
  - Persisting unrelated desktop shell state that is not part of Appearance settings.
- **Constraints**:
  - Preserve current light/dark defaults when no custom value exists.
  - Keep persistence deterministic and local to the desktop app's `userData` directory.
  - Avoid split-brain defaults between main and renderer; shared defaults should have one source of truth.
- **Affected surfaces**:
  - `apps/desktop/src/shared/*`
  - `apps/desktop/src/main/*`
  - `apps/desktop/src/preload/index.ts`
  - `apps/desktop/src/renderer/src/stores/ui.ts`
  - `apps/desktop/src/renderer/src/app/providers.tsx`
  - `apps/desktop/src/renderer/src/components/settings/appearance-settings-panel.tsx`
  - desktop main/renderer tests
- **Validation**:
  - `bun run --cwd apps/desktop typecheck`
  - `bun run --cwd apps/desktop test`
- **Docs to sync**:
  - docs/exec-plans/active/desktop-appearance-color-settings-persistence.md
  - docs/PLANS.md
- **Open assumptions**:
  - Persisting the entire Appearance state together is preferable to persisting only the two new color fields, because the page is already a single user-facing settings surface.

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

- Older running preload bundles may not yet expose the new appearance bridge methods, so the renderer now feature-detects them and degrades safely until the Electron main/preload process restarts.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | Persist the full Appearance state, not only the two new color fields. | A single settings page with mixed persistence semantics would be confusing; one persisted schema keeps behavior coherent. |
| 2026-04-06 | Store light and dark background colors separately. | The request explicitly depends on different light/dark defaults, so one shared color value would erase the intended theme behavior. |
| 2026-04-06 | Guard renderer persistence calls behind runtime bridge feature detection. | During dev or partial reloads the renderer can outpace preload/main updates, and the settings page must not crash in that mismatch window. |

## Validation Log

- `python3 scripts/check_harness.py` -> pass
- Inspected current desktop main/preload/store/settings surfaces before implementation
- `bun run --cwd apps/desktop typecheck` -> pass
- `bun run --cwd apps/desktop test` -> pass
- Added main-process persistence tests and renderer smoke coverage for color hydration/writeback

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
