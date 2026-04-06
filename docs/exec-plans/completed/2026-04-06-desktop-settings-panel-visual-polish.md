> ✅ Completed: 2026-04-06
> Summary: Polished the desktop Appearance settings surface by merging the controls into one card, tightening the radius, correcting light/dark preview border colors, and updating renderer regression coverage.
> Duration: TBD
> Key learnings: TBD

# desktop-settings-panel-visual-polish

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: Polish the fullscreen desktop settings panel so the Appearance page reads as one cohesive card and the theme preview borders match the active light/dark visual treatment.
- **Scope**: `Appearance` settings layout/card structure, preview border palette, and renderer regression coverage updates.
- **Non-goals**: No new settings controls, no persistence changes, and no redesign of the surrounding shell or sidebar navigation.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/desktop-settings-panel-visual-polish.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The first settings-panel slice shipped the required interactions, but the
Appearance page still feels visually split because the controls sit in a
second card beneath the theme preview. The preview borders also use a
light-theme border token in both appearances, which makes the light mode
too dark and the dark mode too bright. This polish pass should correct
those visual mismatches without reopening the underlying state model.

## Optimized Task Brief

- **Outcome**: The Appearance page renders as a single settings card with a tighter radius, and the preview chrome/pane borders use light gray in light mode and dark gray in dark mode.
- **Problem**: The current split-card composition adds unnecessary visual separation, and the preview border color is inverted relative to the requested mock.
- **Scope**:
  - Merge the theme area and remaining controls into one card container.
  - Reduce the oversized outer card radius.
  - Apply explicit light/dark border colors to preview chrome and inner code panes.
  - Keep renderer test coverage aligned with the current localized control labels.
- **Non-goals**:
  - Adding new settings categories or controls.
  - Changing the runtime behavior of theme, pointer cursor, or font-size settings.
- **Constraints**:
  - Preserve the existing fullscreen settings structure and interaction flow.
  - Keep the changes local to the desktop renderer.
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/settings/appearance-settings-panel.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run --cwd apps/desktop typecheck`
  - `bun run --cwd apps/desktop test`
- **Docs to sync**:
  - docs/exec-plans/active/desktop-settings-panel-visual-polish.md
  - docs/PLANS.md
- **Open assumptions**:
  - Existing smoke coverage is sufficient for this polish slice because behavior did not change beyond structure and styling.

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

- This slice intentionally limits itself to renderer layout and test strings; it does not address any broader typography or persistence concerns from the original settings feature.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | Merge the Appearance controls into the same card as the theme preview. | The user explicitly wants one cohesive settings surface rather than stacked cards. |
| 2026-04-06 | Use appearance-specific border colors instead of a shared neutral border token. | The requested light/dark preview chrome differs materially between appearances, so a single token cannot satisfy both. |

## Validation Log

- `python3 scripts/check_harness.py` -> pass
- Inspected `apps/desktop/src/renderer/src/components/settings/appearance-settings-panel.tsx`
- `bun run --cwd apps/desktop typecheck` -> pass
- `bun run --cwd apps/desktop test` -> pass

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
