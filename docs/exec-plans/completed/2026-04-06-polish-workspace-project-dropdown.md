> ✅ Completed: 2026-04-06
> Summary: Polished the workspace project dropdown to match the compact floating reference with visible hover contrast and aligned actions.
> Duration: TBD
> Key learnings: TBD

# Polish workspace project dropdown

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: Match the empty-state project picker to the provided compact floating menu reference with clear hover contrast and strict alignment.
- **Scope**: `apps/desktop/src/renderer/src/components/workspace/workspace-empty-state.tsx` and the smoke test that covers the dropdown entry path.
- **Non-goals**: Re-theme the entire desktop shell, change sidebar behavior, or replace the app icon asset set.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/polish-workspace-project-dropdown.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The current empty-state project picker is functionally complete but misses the
target composition in four visible ways: vertical rhythm is too loose, the
light-theme hover state blends into the white menu surface, the bottom CTA does
not share the same left start line as list rows, and the trigger/menu pairing
does not yet read like the tighter reference popover.

## Optimized Task Brief

- **Outcome**: Ship a denser, reference-matched project dropdown in the workspace
  empty state, with a clearer trigger hierarchy, compact search/list rhythm,
  visible light-mode hover treatment, and exact left alignment between list rows
  and the add-project action.
- **Problem**: The current menu uses pill-like icon containers, generous padding,
  and translucent white hover fills on a white panel, so the list feels sparse
  and the interactive affordance is weak in light mode.
- **Scope**:
  - tighten the empty-state trigger hierarchy around the selected project label
  - compress menu spacing and row density
  - replace the hover/selected fills with visible neutral surfaces in light mode
  - align search, list rows, divider, and add-project CTA to one column rhythm
  - preserve filtering and selection behavior
- **Non-goals**:
  - changing worktree data flow or menu behavior
  - changing the broader page background treatment
  - introducing new dependencies or visual test infrastructure
- **Constraints**:
  - keep the existing dropdown, search, and selection interactions working
  - preserve dark-mode readability
  - stay within the existing desktop renderer stack and current component boundaries
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-empty-state.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run desktop:test`
- **Docs to sync**:
  - docs/exec-plans/active/polish-workspace-project-dropdown.md
  - docs/PLANS.md
- **Open assumptions**:
  - The provided reference image is the visual source of truth for density,
    alignment, and hover legibility, while the existing repository icon asset
    remains acceptable for this slice.

## Frontend Art Direction

- **Visual thesis**: A Mac-native floating picker with paper-white surfaces,
  sharper neutral contrast, and compressed spacing so the menu reads as one
  deliberate column instead of a stack of padded rows.
- **Content plan**: Keep the hero minimal, make the active project name the
  anchor under the heading, then present search, project list, and add-project
  action as one aligned menu surface.
- **Interaction thesis**:
  - the trigger should feel lighter and more typographic than button-like
  - hover and active rows should switch to a visible neutral tint in light mode
  - the chevron rotation should remain the main motion cue while row motion stays
    restrained

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

- Risk: compacting the layout too far can reduce touch target comfort or clip long
  project names.
- Mitigation: keep row height above a comfortable desktop minimum and preserve
  text truncation only where needed.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | Keep the work inside the existing empty-state component instead of widening scope to global theming. | The user feedback is specific to the floating project picker and that path is already isolated. |
| 2026-04-06 | Treat the reference screenshot as the density and alignment target, but keep the current icon asset. | The repo does not expose a matching monochrome icon asset, and the reported issues focus on the picker surface. |
| 2026-04-06 | Remove list-row icon pills and use one aligned content column for search, list rows, and the add-project action. | The reference composition depends on a single left start line; the icon pills were the main source of visual drift and CTA misalignment. |
| 2026-04-06 | Use explicit neutral hover fills instead of translucent white surfaces in the menu. | In light mode the old hover state disappeared against the white popover, so affordance had to come from contrast, not blur. |

## Validation Log

- `python3 scripts/check_harness.py` -> pass
- `bun run desktop:test` -> pass (`3` files, `8` tests)
- `bun run desktop:typecheck` -> pass
- Visual implementation review completed against the provided reference image for density, hover contrast, and left-edge alignment

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
