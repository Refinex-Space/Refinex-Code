> ✅ Completed: 2026-04-05
> Summary: Restored the full startup onboarding layout by excluding Harness route-map AGENTS.md files from onboarding completion while preserving AGENTS.md runtime support and repairing stale cached onboarding state.
> Duration: one session
> Key learnings: Runtime instruction discovery and onboarding completion are different invariants; a valid shared instruction file is not always a signal that the onboarding UI should disappear.; State migrations matter for UI regressions: persisted onboarding-complete flags must be corrected in code, not only by changing the forward predicate.

# restore-startup-onboarding-layout

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-05
- **Completed**: 2026-04-05
- **Severity**: Medium
- **Goal**: restore the full startup onboarding layout for repositories whose root `AGENTS.md` is only a Harness routing map
- **Impact**: the startup welcome panel collapsed into condensed mode, hiding the right-column onboarding/tips panel and changing first-run visual behavior
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/restore-startup-onboarding-layout.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Symptom and Context

- **Expected**: this repository should still show the full welcome/onboarding layout because its root `AGENTS.md` is a Harness routing map, not the `/init`-style project instruction file the onboarding step refers to
- **Observed**: after the AGENTS standardization change, startup treated the root Harness `AGENTS.md` as onboarding-complete and `LogoV2` fell back to condensed mode
- **Impact**: the visible startup experience regressed and the "Tips for getting started" panel disappeared
- **Evidence**:
  - User screenshot showed the bordered welcome/onboarding panel before the change and the condensed logo-only startup afterwards.
  - `LogoV2.tsx` renders condensed mode when `showOnboarding === false`.
  - Running onboarding evaluation in the real repository initially returned `hide-onboarding` because `getSteps()` treated the root Harness `AGENTS.md` as a completed project instruction file.

## Optimized Bug Brief

- **Reproduction**:
  - Open this repository where root `AGENTS.md` is the Harness routing map and no `.claude/AGENTS.md` or legacy `CLAUDE.md` exists.
  - Evaluate `shouldShowProjectOnboarding()` or launch the app.
  - Observe condensed startup instead of the full welcome panel.
- **Likely surfaces**:
  - `src/projectOnboardingState.ts`
  - `src/utils/instructionFiles.ts`
  - startup welcome path in `src/components/LogoV2/LogoV2.tsx`
- **Hypotheses**:
  - The previous AGENTS migration widened onboarding completion from "instruction file created for onboarding" to "any AGENTS candidate exists".
  - Root Harness route maps must be excluded from onboarding completion even though they remain valid runtime instruction files.
- **Validation**:
  - The current repository should evaluate to `show-onboarding`.
  - Tests should prove:
    - `.claude/AGENTS.md` still completes onboarding
    - root Harness `AGENTS.md` does not
    - stale cached completion state is repaired automatically
- **Docs to sync**:
  - docs/exec-plans/active/restore-startup-onboarding-layout.md
  - docs/PLANS.md

## Investigation and Repair Slices

### Slice 1 — Reproduce or bound the failure

- [x] Reproduce / collect evidence
- [x] Record findings

### Slice 2 — Isolate root cause

- [x] Isolate
- [x] Record findings

### Slice 3 — Repair, add regression protection, and verify

- [x] Repair
- [x] Regression protection
- [x] Validate

## Risks and Rollback

- If Harness route-map detection is too broad, it could keep onboarding visible in repos that really are complete.
- If cached project-onboarding state is not repaired, users who already launched the regressed build would stay stuck in condensed mode.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-05 | Treat root Harness route-map `AGENTS.md` differently from onboarding-created instruction files | Runtime instruction loading should accept the file, but the welcome/onboarding UI should not collapse just because the repository has a Harness routing map. |
| 2026-04-05 | Repair stale `hasCompletedProjectOnboarding` state in code instead of requiring manual config cleanup | The regression may already be persisted in users' project config, so a pure forward logic fix would not recover existing workspaces. |

## Validation Log

- `bun -e ... getProjectInstructionCandidatePaths()/hasProjectOnboardingInstructionFile(...)` in the real repo showed only root `AGENTS.md`, and after the fix it is classified as `harness: true` with `result: false`.
- `bun -e ... shouldShowProjectOnboarding()` in the real repo -> `show-onboarding`
- `bun test src/agentInstructionsStandard.test.ts` -> 6 passed
- `bun test` -> 34 passed
- `python3 scripts/check_harness.py` -> OK: True

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
