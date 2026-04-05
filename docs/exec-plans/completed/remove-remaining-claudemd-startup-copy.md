> ✅ Completed: 2026-04-05
> Summary: Verified that startup onboarding now renders AGENTS.md text from current source, found no remaining CLAUDE.md startup-copy source in the runtime path, and recorded that earlier screenshot evidence came from stale pre-fix state rather than current code.
> Duration: one session
> Key learnings: Literal search plus live runtime evaluation is necessary to distinguish stale screenshots from real residual source paths.; The onboarding feed currently resolves text from projectOnboardingState.ts, so once getSteps() reports AGENTS.md there is no second startup-copy branch still emitting CLAUDE.md in the current path.

# remove-remaining-claudemd-startup-copy

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-05
- **Completed**: 2026-04-05
- **Severity**: Low
- **Goal**: verify and remove any remaining startup-path `CLAUDE.md` copy after the AGENTS migration and onboarding-layout fix
- **Impact**: investigation confirmed current startup runtime no longer emits the old `CLAUDE.md` copy; the screenshot reflected stale pre-fix state rather than a surviving source path
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/remove-remaining-claudemd-startup-copy.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Symptom and Context

- **Expected**: startup onboarding should source its instruction-file tip from the updated AGENTS-aware code path
- **Observed**: the user screenshot still showed `Run /init to create a CLAUDE.md file...`
- **Impact**: risk of a hidden stale startup branch or build artifact remaining after the migration
- **Evidence**:
  - Exact string search no longer finds the old startup line in the current source tree.
  - Live `bun -e ... getSteps()` evaluation returns `Run /init to create an AGENTS.md file with instructions for Refinex Code`.
  - Live `rg` across startup-related sources found no remaining startup-path literal for the old `CLAUDE.md` copy.

## Optimized Bug Brief

- **Reproduction**:
  - Search current source for the old startup literal and inspect the live onboarding feed text through `getSteps()`.
- **Likely surfaces**:
  - `src/projectOnboardingState.ts`
  - startup feed plumbing in `src/components/LogoV2/*`
- **Hypotheses**:
  - If the string still existed, it would be in a second startup copy path or a stale build artifact.
  - If not, the screenshot was captured from a pre-fix process/state.
- **Validation**:
  - Current runtime onboarding text resolves to `AGENTS.md`.
  - No remaining old literal exists in the startup runtime path.
- **Docs to sync**:
  - docs/exec-plans/active/remove-remaining-claudemd-startup-copy.md
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

- No direct code repair was needed beyond the previously shipped onboarding fix; the remaining work here was evidence gathering and confirmation of the live runtime path.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-05 | Treat the remaining `CLAUDE.md` startup screenshot as an investigation task, not an assumed new code bug | Exact source search and live runtime inspection are cheaper and more reliable than blind patching when a screenshot may come from stale state. |

## Validation Log

- `rg -n "Run /init to create a CLAUDE.md file|create a CLAUDE.md file with instructions for Refinex Code"` -> no current startup-source hits
- `bun -e ... getSteps()` -> onboarding text resolves to `Run /init to create an AGENTS.md file with instructions for Refinex Code`
- `rg -n "Refinex Code" src | rg "CLAUDE.md|AGENTS.md|/init"` -> only AGENTS-aware startup copy remains
- `python3 scripts/check_harness.py` -> OK: True

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
