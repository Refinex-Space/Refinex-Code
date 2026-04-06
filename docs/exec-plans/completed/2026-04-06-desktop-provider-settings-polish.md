> ✅ Completed: 2026-04-06
> Summary: Polished the desktop provider settings panel with user-facing copy, provider logos, aligned controls, and a file-reveal menu.
> Duration: ~1h
> Key learnings: User-facing settings panels should expose actions like opening config locations rather than raw file paths.; A fixed two-column row layout is more robust than flexible wrapping when settings descriptions vary in length.

# desktop provider settings polish

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: Polish the desktop provider settings panel so the provider copy, icons, control layout, and file-entry affordances feel user-facing and visually consistent with the existing Appearance panel.
- **Scope**: Replace engineering-heavy copy, add brand icons, unify provider row layout, add configuration file reveal affordances, and tighten interaction styling without changing the underlying provider persistence semantics.
- **Non-goals**: No new provider types, no changes to the provider file schema, and no redesign of the surrounding settings shell outside the provider panel.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-06-desktop-provider-settings-polish.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The initial desktop provider panel landed with correct persistence
semantics, but the surface still read like an internal tool: the copy
referenced `/provider`, the Codex form used an uneven grid layout, the
icons were placeholders, and direct file paths were exposed in a low
signal block. This pass focuses on making the panel feel intentional and
user-facing while preserving the established Anthropic/Codex behavior.

## Optimized Task Brief

- **Outcome**: The provider settings panel reads in user-friendly language, uses the supplied Claude/OpenAI icons, keeps the right-side controls aligned to a consistent column width, and exposes provider file locations behind a compact “打开配置” menu instead of raw path text.
- **Problem**: The current panel is technically correct but visually uneven and too implementation-centric, which makes it harder to scan and less aligned with the Appearance settings experience.
- **Scope**:
  - replace engineering-oriented copy with user-facing wording
  - use the provided SVG provider logos in the panel
  - refactor the Codex settings body into single-row settings like Appearance
  - localize English-facing field labels such as verbosity and reasoning effort
  - replace raw config path output with a reveal-in-finder menu
  - normalize right-column control widths and simplify button styling
- **Non-goals**:
  - changing the persisted provider data model
  - adding provider auth flows beyond the existing desktop/CLI semantics
  - redesigning non-provider settings sections
- **Constraints**:
  - provider persistence semantics must remain aligned with the existing desktop provider store
  - desktop renderer must stay resilient when preload and renderer hot reload drift
  - the updated panel should visually match the established Appearance card structure
- **Affected surfaces**:
  - `apps/desktop/resources/provider-logos/*`
  - `apps/desktop/src/shared/contracts.ts`
  - `apps/desktop/src/main/index.ts`
  - `apps/desktop/src/preload/index.ts`
  - `apps/desktop/src/renderer/src/components/settings/provider-settings-panel.tsx`
  - `apps/desktop/src/renderer/src/test/*`
- **Validation**:
  - `bun run --cwd apps/desktop typecheck`
  - `bun run --cwd apps/desktop test`
- **Docs to sync**:
  - docs/exec-plans/completed/2026-04-06-desktop-provider-settings-polish.md
  - docs/PLANS.md
- **Open assumptions**:
  - Opening the containing Finder location for each config file is a good desktop substitute for rendering raw filesystem paths inline.

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

- Preserve the underlying Anthropic/Codex save semantics; this pass only changes presentation and local desktop affordances.
- The config-file menu uses a desktop bridge to reveal the selected file or its containing folder, instead of showing raw paths in the UI.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | Replace the raw provider path block with a compact reveal menu | The file paths are implementation detail; users need an action, not a raw dump. |
| 2026-04-06 | Keep the Codex panel on a single-row settings rhythm like Appearance | The prior grid created uneven control widths and made scanning harder. |
| 2026-04-06 | Use a lightweight custom config menu instead of pushing Radix Themes trigger semantics further | The Themes dropdown trigger constraints were causing avoidable runtime friction for a very small menu. |

## Validation Log

- `python3 scripts/check_harness.py` ✅
- `bun run --cwd apps/desktop typecheck` ✅
- `bun run --cwd apps/desktop test` ✅

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
