> ✅ Completed: 2026-04-05
> Summary: Clarified and stabilized the /provider numeric-step flow so Enter visibly advances from context-window to auto-compact configuration and the next-step defaults derive from the entered window size.
> Duration: one short fix session
> Key learnings: For adjacent text-input steps, visible step labels and step-specific remounts matter as much as the underlying state update.; Numeric provider settings need immediate validation and derived next-step defaults, otherwise users interpret the flow as stuck even when the state machine advances.

# Provider wizard numeric step fix

## Metadata

- **Status**: Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-05
- **Completed**: 2026-04-05
- **Goal**: Fix the /provider Codex numeric configuration flow so Enter reliably advances through context-window and auto-compact steps and the UI clearly communicates step transitions.
- **Scope**: Tighten the ProviderManager numeric-step interaction, improve step differentiation, and add focused verification for the text-step transition behavior without changing the underlying provider semantics.
- **Non-goals**: No provider schema changes; no new import/migration features; no unrelated command redesign.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/provider-wizard-numeric-step-fix.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The new Codex provider wizard appears stuck when pressing Enter on the context-window step, making the numeric configuration flow feel unreliable even though the rest of the wizard advances normally.

## Optimized Task Brief

- **Outcome**: Fix the /provider Codex numeric configuration flow so Enter reliably advances through context-window and auto-compact steps and the UI clearly communicates step transitions.
- **Problem**: The new Codex provider wizard appears stuck when pressing Enter on the context-window step, making the numeric configuration flow feel unreliable even though the rest of the wizard advances normally.
- **Scope**: Tighten the ProviderManager numeric-step interaction, improve step differentiation, and add focused verification for the text-step transition behavior without changing the underlying provider semantics.
- **Non-goals**: No provider schema changes; no new import/migration features; no unrelated command redesign.
- **Constraints**:
  - Keep the existing provider values and persistence semantics unchanged.
  - The fix should preserve existing base URL/API key/model entry behavior while making numeric steps unambiguous.
- **Affected surfaces**:
  - TBD
- **Validation**:
  - Manual or focused module validation shows Enter advances past the context-window step.
  - python3 scripts/check_harness.py passes.
- **Docs to sync**:
  - docs/exec-plans/active/provider-wizard-numeric-step-fix.md
  - docs/PLANS.md
- **Open assumptions**:
  - TBD

## Incremental Slices

### Slice 1 — Identify the numeric-step failure mode

- [x] Implement
- [x] Validate

### Slice 2 — Tighten numeric-step transitions

- [x] Implement
- [x] Validate

### Slice 3 — Sync and close

- [x] Sync docs and generated surfaces
- [x] Final validation

## Risks and Rollback

- This slice improves the wizard's transition clarity and numeric validation but does not add a full interaction test harness for terminal input simulation.
- Git revert or restore the modified files

## Delivered

- Added explicit step labels for each text-input phase in the Codex provider wizard.
- Forced the numeric steps to be visually distinct:
  - `Step 4 of 7 · Context Window`
  - `Step 5 of 7 · Auto-Compact Trigger`
- Added immediate numeric validation on Enter for:
  - context window
  - auto-compact trigger
- Derived the auto-compact default shown on the next step from the just-entered context window value, so `1,050,000` now leads to a visible `945,000` default instead of the old provider default.
- Forced text-input step remounts via per-step keys so the cursor/input state resets cleanly between wizard stages.

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-05 | Treat the issue as a step-transition UX/state bug, not a provider-semantics bug | The underlying values already persisted correctly; the failure was that the numeric steps looked and felt like they did not advance. |
| 2026-04-05 | Derive the auto-compact placeholder from the current context-window draft | Showing a stale `244,800` placeholder immediately after entering `1,050,000` made the flow appear broken even when state advanced. |

## Validation Log

- `bun -e "await Promise.all([import('./src/components/provider/ProviderManager.tsx'), import('./src/commands/provider/provider.tsx')]); console.log('provider-step-fix-ok')"` -> success
- `python3 scripts/check_harness.py` -> OK: True

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
