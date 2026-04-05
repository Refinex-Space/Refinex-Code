> ✅ Completed: 2026-04-05
> Summary: Added a globally linkable rcode launcher on top of the existing repository-aware Bun bin flow, kept ccc compatibility, and documented the non-npm installation workflow in README.
> Duration: one session
> Key learnings: The repository already had the hard part for global usage: a cwd-preserving bin launcher plus Bun linking; the missing piece was a product-facing command name and explicit documentation.; A thin wrapper launcher is safer than duplicating root-resolution logic because all future packaging fixes stay in one place.

# global-rcode-installation

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-05
- **Goal**: make the restored CLI usable as a globally linked `rcode` command without requiring npm publication
- **Scope**: launcher/bin exposure, packaging tests, and README usage guidance for Bun-based global linking
- **Non-goals**: no npm registry publishing, no native installer, no system package-manager packaging
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/global-rcode-installation.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The repository already contains a working `bin/ccc` launcher and a prior
historical plan proving Bun global linking works for local checkout based
development. However, the daily workflow is still `bun run dev` from the
repository root, which is inconvenient for normal project use. The desired
experience is a stable `rcode` command that can be invoked from any project
directory after a one-time local global-link step.

## Optimized Task Brief

- **Outcome**: users can run `rcode` from any project directory after cloning the repo once, installing dependencies, and running `bun link`
- **Problem**: without npm publication, the repository is currently treated like a dev workspace and most usage falls back to `bun run dev` from inside the checkout
- **Scope**:
  - expose `rcode` as a bin entry while keeping `ccc` compatibility
  - add a thin launcher script for `rcode`
  - extend packaging tests to cover the new launcher
  - update `README.md` with a recommended global-link workflow and verification steps
- **Non-goals**:
  - no registry publish flow
  - no background updater or installer wizard
  - no removal of `ccc` in this slice
- **Constraints**:
  - global launcher must preserve workspace detection based on caller cwd
  - the implementation should reuse the existing repository-aware launcher path
  - documentation must be explicit that this is a local global link, not npm distribution
- **Affected surfaces**:
  - `package.json`
  - `bin/rcode`
  - `src/dev-entry.test.ts`
  - `README.md`
- **Validation**:
  - packaging tests confirm manifest/bin exposure and launcher structure
  - manual help/version invocation through the linked entry path remains documented and reproducible
- **Docs to sync**:
  - docs/exec-plans/active/global-rcode-installation.md
  - docs/PLANS.md
  - `README.md`
- **Open assumptions**:
  - `bun link` remains the preferred local global-link mechanism because the repo already standardizes on Bun

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

- If `rcode` uses a separate launcher implementation that drifts from `ccc`, future fixes could diverge. Keep the new entry as thin as possible.
- If README overstates “global install”, users may assume the repo can be deleted after linking. The docs must say the command points at the local checkout.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-05 | Use Bun global linking (`bun link`) as the supported non-npm installation story | The repository already uses Bun and already has a working local-bin pattern, so this is the smallest reliable path. |
| 2026-04-05 | Add `rcode` as the primary launcher but keep `ccc` as a compatibility alias | The user wants `rcode`, but existing docs/tests/history already reference `ccc`. |
| 2026-04-05 | Implement `bin/rcode` as a thin wrapper around the existing launcher path | This avoids duplicating repository-root resolution logic. |

## Validation Log

- `python3 scripts/check_harness.py` -> OK: True
- Existing `README.md`, `package.json`, `bin/ccc`, and completed plan `2026-04-02-ccc-global-install.md` confirm the repo already supports a Bun-linked global launcher pattern.
- Added `rcode` as a new bin entry and thin wrapper around the existing launcher path.
- Updated `README.md` to document the non-npm global workflow: clone once, `bun install`, `bun link`, then run `rcode` from any project directory.
- `bun test src/dev-entry.test.ts` -> 5 passed
- `bun run version` -> `999.0.0-restored`
- `bun run ./bin/rcode --version` -> `999.0.0-restored`
- `bun test` -> 38 passed
- `python3 scripts/check_harness.py` after implementation -> OK: True

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
