> ✅ Completed: 2026-04-06
> Summary: Audited the desktop app for residual dark variants and normalized the workspace project trigger to token-driven theme styling.
> Duration: TBD
> Key learnings: TBD

# Audit remaining desktop dark variant usage

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: Verify that the desktop renderer no longer contains `dark:`-variant styling that can drift from the repository's CSS-variable theme system, and remove any remaining conflicts if found.
- **Scope**: Audit `apps/desktop/src` for residual `dark:` usage and normalize any conflicting theme-sensitive component styles.
- **Non-goals**: Broader palette redesign beyond the already in-flight theme token work.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/audit-remaining-desktop-dark-variant-usage.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The desktop theme system now resolves light and dark appearance through
`data-theme` plus CSS variables. Any remaining Tailwind `dark:` variants inside
the desktop UI would be a hidden divergence point, especially after the recent
theme retune and the dark-mode visibility issue on the workspace project
trigger.

## Optimized Task Brief

- **Outcome**: Establish a clean baseline where desktop theming is driven by
  shared tokens only, without residual `dark:` usage in the app code.
- **Problem**: Mixed theming mechanisms can produce component-level regressions
  that are hard to spot until a specific dark-mode path breaks.
- **Scope**:
  - audit the desktop app source for `dark:` variant usage
  - remove any remaining conflicting styling if found
  - record the audit result and validation evidence
- **Non-goals**:
  - redesigning components whose token-based styles already behave correctly
  - changing non-desktop packages
- **Constraints**:
  - preserve the current CSS-variable theme model
  - keep verification scriptable
- **Affected surfaces**:
  - `apps/desktop/src`
  - `apps/desktop/src/renderer/src/components/workspace/workspace-empty-state.tsx`
- **Validation**:
  - `rg -n --glob '*.tsx' --glob '*.ts' --glob '*.css' 'dark:' apps/desktop/src`
  - `python3 scripts/check_harness.py`
  - `bun run desktop:typecheck`
  - `bun run desktop:test`
- **Docs to sync**:
  - docs/exec-plans/active/audit-remaining-desktop-dark-variant-usage.md
  - docs/PLANS.md
- **Open assumptions**:
  - The latest visible regression was caused by mixed styling mechanisms rather
    than by missing theme tokens themselves.

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

- Risk: a zero-result text scan can miss theme drift caused by hardcoded colors
  that are not expressed as `dark:` variants.
- Mitigation: keep using token-driven styles for theme-sensitive surfaces and
  continue reviewing hardcoded color literals during UI work.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | Keep the audit focused on `apps/desktop/src` and on the project trigger regression path. | The user asked to clear residual `dark:` drift in the desktop UI, and that is the relevant execution surface. |
| 2026-04-06 | Replace the project trigger's mixed `dark:` and hardcoded black/white classes with CSS-variable tokens. | The broken dark-mode label confirmed that token-only styling is the safer invariant. |

## Validation Log

- `rg -n --glob '*.tsx' --glob '*.ts' --glob '*.css' 'dark:' apps/desktop/src` -> no matches
- `python3 scripts/check_harness.py` -> pass
- `bun run desktop:typecheck` -> pass
- `bun run desktop:test` -> pass (`3` files, `8` tests)
- Verified the workspace project trigger now uses theme tokens for label, icon, popover, divider, and hover surfaces

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
