> ✅ Completed: 2026-04-06
> Summary: Reduced the workspace project dropdown to a tighter compact menu while preserving visible hover contrast and alignment.
> Duration: TBD
> Key learnings: TBD

# Tighten workspace project dropdown density

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: Tighten the workspace project dropdown so the floating layer reads smaller and denser while preserving the corrected hover contrast and alignment.
- **Scope**: `apps/desktop/src/renderer/src/components/workspace/workspace-empty-state.tsx` plus validation and plan sync.
- **Non-goals**: Rework the broader empty-state composition, theme tokens, or interaction model.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/tighten-workspace-project-dropdown-density.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The previous polish pass fixed hover visibility and alignment, but it overshot
the intended scale: the popover width, internal padding, and row sizing now
read as a roomy card rather than the compact floating menu shown in the
reference.

## Optimized Task Brief

- **Outcome**: Ship a visibly smaller, tighter project picker whose panel,
  search area, and rows feel compact at first glance.
- **Problem**: The current dropdown is too wide and padded, so even with correct
  alignment it no longer matches the target compactness.
- **Scope**:
  - reduce popover width and shadow spread
  - compress search paddings and row height
  - slightly reduce typography and icon sizing inside the menu
  - keep hover visibility and row/CTA alignment intact
- **Non-goals**:
  - new icons or asset changes
  - changes to filtering, selection, or focus behavior
- **Constraints**:
  - preserve the visible light-mode hover state
  - preserve the corrected left alignment between list rows and the add-project CTA
  - keep the implementation local to the current component
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-empty-state.tsx`
- **Validation**:
  - `bun run desktop:test`
  - `bun run desktop:typecheck`
- **Docs to sync**:
  - docs/exec-plans/active/tighten-workspace-project-dropdown-density.md
  - docs/PLANS.md
- **Open assumptions**:
  - The user feedback refers to the floating dropdown surface itself, so the
    highest-value fix is to tighten panel density before revisiting the trigger.

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

  - TBD
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | Shrink the dropdown by reducing width, padding, row height, and shadow together. | Scale perception comes from the whole surface; changing only one variable would not make the menu read compact enough. |
| 2026-04-06 | Keep the corrected neutral hover fill while tightening density. | The previous pass fixed an actual usability problem in light mode and should not regress. |

## Validation Log

- `bun run desktop:test` -> pass (`3` files, `8` tests)
- `bun run desktop:typecheck` -> pass
- Visual density tightened by reducing popover width from `29.5rem` cap to `22.75rem` cap and compressing internal row/search spacing

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
