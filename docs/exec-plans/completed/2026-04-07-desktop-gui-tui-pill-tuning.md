> ✅ Completed: 2026-04-07
> Summary: Tuned the desktop header GUI/TUI mode pills with smaller sizing and darker dark-theme colors.
> Duration: within the same working session
> Key learnings: Small visual tuning is more maintainable when component sizing stays in JSX and theme contrast moves into dedicated tokens.

# desktop gui tui pill tuning

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: Reduce the visual footprint of the desktop header `GUI` / `TUI` mode pills and retune their dark-theme colors so the control stays legible without appearing overly bright.
- **Scope**: `apps/desktop` renderer toggle styles, theme tokens, and targeted validation for the header mode switcher.
- **Non-goals**: Broader header layout changes, unrelated button redesign, or changes to the actual GUI/TUI mode behavior.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-07-desktop-gui-tui-pill-tuning.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The right-side main panel header centers a two-pill mode switcher for `GUI` and `TUI`. The current implementation hard-codes a relatively tall pill height and uses `--color-fg` as the active background, which makes the dark-theme active pill read too bright compared with the surrounding chrome.

## Optimized Task Brief

- **Outcome**: Deliver a visibly smaller mode toggle with balanced dark-theme contrast while preserving existing tab semantics and interaction behavior.
- **Problem**: The current pills feel oversized in the titlebar, and the active dark-theme state is too luminous because it reuses the general foreground token as a solid fill.
- **Scope**: Update `ThreadModeToggle` sizing classes, introduce dedicated theme tokens for the control, and validate existing desktop shell behavior.
- **Non-goals**: Reworking titlebar spacing, adding new modes, or changing state persistence logic.
- **Constraints**:
  - Preserve `tablist` / `tab` accessibility roles and labels.
  - Keep the change local to the desktop renderer.
  - Prefer theme-token driven styling over scattering hard-coded dark-mode values in JSX.
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/thread-mode-toggle.tsx`
  - `apps/desktop/src/renderer/src/styles/globals.css`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx` if targeted validation needs coverage
- **Validation**:
  - Run focused desktop renderer tests covering GUI/TUI mode switching.
  - Review the resulting class/token changes for light/dark contrast correctness.
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-desktop-gui-tui-pill-tuning.md
  - docs/PLANS.md
- **Open assumptions**:
  - The user request targets only the centered header switcher, not the composer send-target pills.

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

- Tight coupling to visual classes may require minor test updates if any assertions rely on exact sizing classes.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | Introduce dedicated toggle color tokens instead of relying on generic foreground/background tokens. | This keeps dark-theme tuning local and avoids future regressions from unrelated palette changes. |
| 2026-04-07 | Reduce the pills from `h-7` / `min-w-[42px]` / `text-[11px]` to `h-6` / `min-w-[38px]` / `text-[10px]`. | The request was for a smaller visual footprint, and this is a modest reduction that preserves readability for three-letter labels. |

## Validation Log

- `python3 scripts/check_harness.py` -> pass
- Located the header usage in `apps/desktop/src/renderer/src/app/layout.tsx` and confirmed the toggle is the centered titlebar control.
- `bun run test -- src/renderer/src/test/shell.smoke.test.tsx` -> pass (`20` tests)
- `bun run typecheck` -> pass
- Visual verification is code-and-test based in this pass; no scripted Electron screenshot surface was used.

## Archive Notes

- Ready to archive. Summary: tightened the header mode pills and replaced the dark-theme active fill with dedicated, darker toggle tokens.
