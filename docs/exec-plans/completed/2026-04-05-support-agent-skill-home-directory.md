> ✅ Completed: 2026-04-05
> Summary: Added ~/.agents/skills as a first-class user skill home for slash-command discovery, hot reload, permission narrowing, and user-facing skill path hints while keeping ~/.claude/skills compatible.
> Duration: one session
> Key learnings: User skill home support must be centralized because the loader, watcher, permission scope, and UI all rely on the same directory list.; Using HOME-aware path resolution keeps ~/.agents semantics testable and matches how users reason about tilde-based skill locations.

# support-agent-skill-home-directory

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-05
- **Completed**: 2026-04-05
- **Goal**: add `~/.agents/skills` as a first-class user skill home so slash-command skill discovery works from that directory
- **Scope**: user skill path resolution, startup skill loading, skill change watching, permission narrowing, and directly user-visible skill path hints
- **Non-goals**: no support for `~/.agents/commands`, no project directory rename from `.claude/skills`, no broader config-home migration
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/support-agent-skill-home-directory.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The runtime currently discovers personal slash-command skills only from
`~/.claude/skills`, while this environment already uses `~/.agents/skills`
for Codex skills. That mismatch means skills installed under the agents
home are invisible to `/skill-name` discovery even though the product is
moving toward AGENTS-oriented naming elsewhere.

## Optimized Task Brief

- **Outcome**: `/skill-name` discovery loads user skills from `~/.agents/skills` in addition to legacy `~/.claude/skills`
- **Problem**: user-global skill discovery is hard-coded to `~/.claude/skills`, so skills stored in the agents home never appear as slash commands
- **Scope**:
  - centralize user skill home path resolution
  - load user skills from `~/.agents/skills` and legacy `~/.claude/skills`
  - watch both user skill roots for hot reload
  - support permission narrowing for files under `~/.agents/skills`
  - update visible tips/menu text to mention the new directory
- **Non-goals**:
  - no removal of legacy `~/.claude/skills`
  - no migration of existing files between directories
  - no changes to project-local `.claude/skills`
- **Constraints**:
  - keep existing legacy skill discovery working
  - avoid partial support where loading works but watching or permission narrowing does not
  - preserve current slash-command behavior for project and managed skill sources
- **Affected surfaces**:
  - `src/skills/loadSkillsDir.ts`
  - `src/utils/skillPaths.ts`
  - `src/utils/skills/skillChangeDetector.ts`
  - `src/utils/permissions/filesystem.ts`
  - `src/components/skills/SkillsMenu.tsx`
  - `src/services/tips/tipRegistry.ts`
  - `src/skills/bundled/skillify.ts`
  - `src/skillHomeDirectory.test.ts`
- **Validation**:
  - targeted tests prove `~/.agents/skills` loads into slash-command discovery and permission narrowing
  - full test suite stays green
  - harness check remains passing
- **Docs to sync**:
  - docs/exec-plans/active/support-agent-skill-home-directory.md
  - docs/PLANS.md
  - completed execution plan archive on finish
- **Open assumptions**:
  - the user intended `~/.agents/skills` based on the provided skill path, despite the prompt's `agets` typo

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

- If path precedence is chosen poorly, duplicate skill names across `~/.agents/skills` and legacy `~/.claude/skills` could resolve unexpectedly.
- If only the loader changes, user edits under `~/.agents/skills` would appear flaky because hot reload and permission scoping would still lag behind.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-05 | Treat `~/.agents/skills` as the primary user skill root and keep `~/.claude/skills` as legacy-compatible fallback | The requested target is the agents home, but existing users must not lose their current skill directory. |
| 2026-04-05 | Scope the new home-directory support to `skills` only, not `commands` | The user asked specifically about skill detection for slash commands, and extending legacy commands adds surface area without direct evidence it is needed. |
| 2026-04-05 | Centralize user skill path logic in a dedicated helper instead of duplicating joins across modules | Loader, watcher, permissions, and UI hints all need the same directory list. |

## Validation Log

- `python3 scripts/check_harness.py` -> OK: True
- `rg` identified the current hard-coded user skill root in `src/skills/loadSkillsDir.ts`, plus dependent watcher/UI/permission surfaces.
- Added `src/utils/skillPaths.ts` to centralize user skill roots across loader, watcher, and permission narrowing.
- `bun test src/skillHomeDirectory.test.ts` -> 3 passed
- `bun test` -> 37 passed
- `python3 scripts/check_harness.py` after implementation -> OK: True

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
