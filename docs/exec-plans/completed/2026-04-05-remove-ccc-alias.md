> ✅ Completed: 2026-04-05
> Summary: Removed the legacy ccc alias so the CLI now exposes only rcode, updated packaging tests, and simplified the README to a single launcher story.
> Duration: one session
> Key learnings: Removing a compatibility alias is safer once packaging tests assert both the exposed bin names and the absence of the legacy launcher file.; For local global-link workflows, product clarity matters more than alias preservation; README ambiguity is itself a usability bug.

# remove-ccc-alias

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-05
- **Completed**: 2026-04-05
- **Goal**: remove the legacy `ccc` compatibility alias so the global launcher story is uniformly `rcode`
- **Scope**: package bin exposure, launcher files, packaging tests, and README usage text
- **Non-goals**: no change to the Bun global-link mechanism itself, no rename of internal historical plan files
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/remove-ccc-alias.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The previous slice added `rcode` but intentionally kept `ccc` as a
compatibility alias. The user now wants a single product-facing command.
That requires removing the alias from packaging, deleting the old bin
script, and cleaning up user-facing documentation so daily use is
consistently described as `rcode`.

## Optimized Task Brief

- **Outcome**: the repository exposes only `rcode` as the supported global launcher
- **Problem**: dual launcher names create avoidable ambiguity in docs, tests, and user workflow
- **Scope**:
  - remove `ccc` from `package.json.bin`
  - remove `bin/ccc`
  - make `bin/rcode` the primary launcher implementation
  - update tests and README to reference only `rcode`
- **Non-goals**:
  - no backwards-compat shim
  - no change to the underlying `src/dev-entry.ts` bootstrap flow
- **Constraints**:
  - `rcode` must preserve cwd-based workspace detection
  - final docs must not mention `ccc` as a user command
- **Affected surfaces**:
  - `package.json`
  - `bin/rcode`
  - `bin/ccc`
  - `src/dev-entry.test.ts`
  - `README.md`
- **Validation**:
  - packaging tests confirm only `rcode` is exposed
  - `bun run ./bin/rcode --version` still works
- **Docs to sync**:
  - docs/exec-plans/active/remove-ccc-alias.md
  - docs/PLANS.md
  - `README.md`
- **Open assumptions**:
  - the user accepts a clean break from `ccc` rather than a deprecation window

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

- Any existing local scripts that still call `ccc` will break after this slice by design.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-05 | Remove `ccc` instead of keeping an undocumented compatibility alias | The user explicitly wants a single command surface and no dual-name ambiguity. |

## Validation Log

- `python3 scripts/check_harness.py` -> OK: True
- Removed `ccc` from `package.json.bin`, deleted `bin/ccc`, and promoted `bin/rcode` to the primary launcher implementation.
- Updated `README.md` to describe only the `rcode` workflow.
- `bun test src/dev-entry.test.ts` -> 5 passed
- `bun run ./bin/rcode --version` -> `999.0.0-restored`
- `bun test` -> 38 passed
- `python3 scripts/check_harness.py` after implementation -> OK: True

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
