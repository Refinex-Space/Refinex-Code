> ✅ Completed: 2026-04-06
> Summary: 优化桌面空态层级、项目标签字号和项目弹层紧凑度。
> Duration: single turn
> Key learnings: Once the interaction model is correct, most perceived polish comes from typography hierarchy and popup density rather than adding more UI.

# 优化桌面空态层级与项目弹层

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: Tighten the new desktop empty-state hierarchy so the title, project label, and project picker popup better match the provided visual reference while keeping the Radix Themes integration intact.
- **Scope**: Typography adjustments, popup density/width refinement, project-row icons, and hover feedback improvements in the new project picker.
- **Non-goals**: Changing the project-picker data model, composer behavior, or introducing new dependencies beyond the existing Themes integration.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-06-desktop-empty-state-visual-tuning.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

After the first pass landed the correct centered empty-state structure and Themes-based picker, the visual hierarchy still felt too loose: the title was oversized, the project label too weak, and the popup too wide and under-styled.

## Optimized Task Brief

- **Outcome**: The empty state reads closer to the reference: smaller headline, stronger project label, narrower/tighter popup, no visible path text, explicit project icons, and visible hover feedback.
- **Problem**: The first implementation got the structure right but the visual rhythm and popup density were still off.
- **Scope**: Refine only the empty-state and picker presentation layer.
- **Non-goals**: Reworking the composer, changing copy outside the affected hierarchy, or expanding the project rows with extra metadata.
- **Constraints**:
  - Preserve the existing Radix Themes `DropdownMenu` integration.
  - Keep tests green without asserting hidden controls while the menu is open.
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-empty-state.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run --cwd apps/desktop typecheck`
  - `bun run --cwd apps/desktop test`
  - `python3 scripts/check_harness.py`
- **Docs to sync**:
  - docs/exec-plans/completed/2026-04-06-desktop-empty-state-visual-tuning.md
  - docs/PLANS.md
- **Open assumptions**:
  - TBD

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

- Popup density is now optimized for the reference case; if project names become much longer, the narrower width may need revisiting.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | Keep only the project label in each popup row and drop visible path text. | The user explicitly asked for a tighter popup and the visible path made each row too tall and noisy. |
| 2026-04-06 | Use icon + checkmark + stronger hover feedback for project rows. | The popup needed clearer interaction affordances once the secondary text was removed. |

## Validation Log

- Reduced the headline size, increased the project label size, narrowed and tightened the popup, added project icons, and strengthened hover feedback.
- `bun run --cwd apps/desktop typecheck` -> pass
- `bun run --cwd apps/desktop test` -> pass (`3` files, `8` tests)
- `python3 scripts/check_harness.py` -> pass

## Archive Notes

- Ready to archive after normalizing the completed filename to the date-first convention.
