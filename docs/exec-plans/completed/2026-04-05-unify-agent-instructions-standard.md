> ✅ Completed: 2026-04-05
> Summary: Standardized shared agent instructions on AGENTS.md, kept legacy CLAUDE.md compatibility, and switched init/onboarding guidance to the new default.
> Duration: one session
> Key learnings: Canonical shared instructions can move to AGENTS.md without breaking existing repos if loader precedence stays AGENTS-first and legacy-compatible.; CLAUDE.local.md still needs a separate product decision because Codex-compatible shared-file support does not replace private project-local preferences.

# unify-agent-instructions-standard

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-05
- **Completed**: 2026-04-05
- **Goal**: unify shared agent-instruction discovery and initialization around `AGENTS.md` without breaking existing `CLAUDE.md` users
- **Scope**: loader discovery, default memory paths, `/init`, startup onboarding, and directly user-visible instruction-file UI copy
- **Non-goals**: no full rename of every legacy `CLAUDE.md` identifier, no redesign of `CLAUDE.local.md`, no settings-sync protocol migration
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/unify-agent-instructions-standard.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

This repository now has first-class Codex/OpenAI provider work and a
Harness control plane rooted in `AGENTS.md`, but the runtime instruction
loader and `/init` flow still only default to `CLAUDE.md`. That creates
two competing standards: repository governance says `AGENTS.md`, while
runtime agent context and onboarding still point users to `CLAUDE.md`.

## Optimized Task Brief

- **Outcome**: make `AGENTS.md` the default shared instruction standard for Refinex Code while preserving legacy `CLAUDE.md` compatibility
- **Problem**: Codex-compatible repositories already use `AGENTS.md`, but this product only auto-discovers and generates `CLAUDE.md`, so multi-agent projects need duplicate instruction files or lose context on one side
- **Scope**:
  - add shared-instruction path helpers and precedence rules
  - load `AGENTS.md`, `.claude/AGENTS.md`, and `~/.claude/AGENTS.md`
  - keep loading legacy `CLAUDE.md` variants for compatibility
  - switch `/init` and startup onboarding to `AGENTS.md`
  - update directly user-visible settings/UI strings that mention instruction-file names
- **Non-goals**:
  - migrate or delete existing `CLAUDE.md` files automatically
  - replace `CLAUDE.local.md` with a new private-file design in this slice
  - rewrite every historical comment, telemetry key, or internal symbol using `claude` terminology
- **Constraints**:
  - preserve existing instruction loading behavior for legacy repos
  - prefer one canonical shared standard instead of provider-specific branching
  - keep user-visible guidance consistent with actual runtime discovery
- **Affected surfaces**:
  - `src/utils/config.ts`
  - `src/utils/claudemd.ts`
  - `src/projectOnboardingState.ts`
  - `src/commands/init.ts`
  - `src/components/memory/MemoryFileSelector.tsx`
  - user-visible settings and include-warning copy
- **Validation**:
  - targeted tests cover default-path precedence, onboarding completion detection, and `/init` prompt text
  - harness check remains passing
- **Docs to sync**:
  - docs/exec-plans/active/unify-agent-instructions-standard.md
  - docs/PLANS.md
  - completed execution plan archive on finish
- **Open assumptions**:
  - `CLAUDE.local.md` remains a supported private-project layer until a provider-neutral replacement is designed
  - settings sync can keep legacy remote entry keys in this slice without blocking the shared-standard migration

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

- If shared and legacy files coexist in one directory, precedence must be deterministic and favor `AGENTS.md` to avoid stale overrides.
- Some user-facing strings outside this slice may still say `CLAUDE.md`; limit scope to behavior-critical and directly exposed copy, then record residual drift if needed.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-05 | Canonical shared instruction standard becomes `AGENTS.md` instead of adding a Codex-only exception | The repository already uses `AGENTS.md` for Harness governance and now supports Codex/OpenAI as a first-class provider, so keeping provider-specific shared instruction files would create persistent double standards. |
| 2026-04-05 | Keep loading legacy `CLAUDE.md` alongside canonical `AGENTS.md` | Existing repositories and user setups must not lose instruction context during the standard switch. |
| 2026-04-05 | Defer `CLAUDE.local.md` redesign | Codex-compatible shared-file support is the immediate gap; private project-local instructions need a separate product decision. |

## Validation Log

- `python3 scripts/check_harness.py` -> OK: True
- `rg` confirmed the runtime loader, `/init`, and startup onboarding still pointed to `CLAUDE.md` before implementation
- Added `src/utils/instructionFiles.ts` so shared instruction precedence is centralized instead of reimplemented per surface.
- Updated loader and default path selection so `AGENTS.md` is canonical while legacy `CLAUDE.md` remains readable.
- Updated `/init`, onboarding, memory selector, and external-include/settings copy to point new shared setup at `AGENTS.md`.
- `bun test src/agentInstructionsStandard.test.ts` -> 4 passed
- `bun test` -> 32 passed
- `python3 scripts/check_harness.py` after implementation -> OK: True

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
