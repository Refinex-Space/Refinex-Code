> ✅ Completed: 2026-04-06
> Summary: Compacted the workspace project dropdown further and separated adjacent hover surfaces with explicit row spacing.
> Duration: TBD
> Key learnings: TBD

# Compact workspace project dropdown spacing

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: Reduce the project picker to a visibly smaller floating menu and add explicit spacing between adjacent row hover surfaces.
- **Scope**: `apps/desktop/src/renderer/src/components/workspace/workspace-empty-state.tsx` plus validation and plan sync.
- **Non-goals**: Change project selection behavior, filtering behavior, or the overall page composition.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/compact-workspace-project-dropdown-spacing.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The current dropdown still reads oversized relative to the reference image, and
adjacent list items do not have enough vertical separation, so when moving the
pointer between them the hover surfaces visually merge.

## Optimized Task Brief

- **Outcome**: Ship a smaller, denser popover whose row hovers stay visually
  discrete even when the pointer moves across adjacent items.
- **Problem**: Width, padding, and row height are still too generous, and the
  list currently stacks row backgrounds without enough true gap.
- **Scope**:
  - reduce popover width and inner padding again
  - reduce row height and text scale slightly
  - add explicit inter-row spacing so hover backgrounds do not touch
  - preserve visible light-mode hover contrast and left alignment
- **Non-goals**:
  - changing the trigger behavior
  - changing the icon assets
- **Constraints**:
  - keep light-mode hover visibility intact
  - keep the add-project row aligned with the project rows
  - preserve current tests and type safety
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-empty-state.tsx`
- **Validation**:
  - `bun run desktop:test`
  - `bun run desktop:typecheck`
- **Docs to sync**:
  - docs/exec-plans/active/compact-workspace-project-dropdown-spacing.md
  - docs/PLANS.md
- **Open assumptions**:
  - The highest-value change is local density and spacing tuning inside the
    popover, not a broader rewrite of the empty-state trigger.

## Frontend Art Direction

- **Visual thesis**: A compact Mac-style sheet with crisp white paper, short row rhythm, and enough air between surfaces to keep each option distinct.
- **Content plan**: Keep the search affordance minimal, compress the project list into a tight stack, and let the add-project action sit as a final aligned row.
- **Interaction thesis**:
  - adjacent hover states should feel like separate chips, not a merged slab
  - motion remains minimal and secondary to spacing clarity
  - compactness comes from proportion, not from lowering contrast

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
| 2026-04-06 | Reduce popover width and row metrics together instead of trimming only padding. | The oversized feel came from proportion as a whole, not from one spacing token. |
| 2026-04-06 | Add explicit `gap` between list rows. | Adjacent hover surfaces need a real visual separator; stacked rounded rows without spacing still read as one block. |

## Validation Log

- `python3 scripts/check_harness.py` -> pass
- `bun run desktop:test` -> pass (`3` files, `8` tests)
- `bun run desktop:typecheck` -> pass
- Visual density tightened by reducing popover cap to `19.75rem`, shrinking row/search metrics, and inserting explicit inter-row spacing

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
