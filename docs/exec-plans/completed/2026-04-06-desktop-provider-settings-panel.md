> ✅ Completed: 2026-04-06
> Summary: Added the desktop provider settings panel with Anthropic/Codex persistence and test coverage.
> Duration: ~1h
> Key learnings: Desktop provider persistence must mirror ~/.claude file semantics instead of importing the Bun-only CLI settings stack.; Renderer bridge feature detection is required to avoid crashes during preload hot-reload drift.

# desktop-provider-settings-panel

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: Add a desktop settings panel for model providers that maps the current `/provider` command semantics into a persistent, structured UI for Anthropic and Codex.
- **Scope**: Research `/provider` behavior and provider file semantics, add a desktop provider section and provider-specific form UI, persist read/write through the desktop main process, and cover the flow with tests.
- **Non-goals**: No generic provider editor for arbitrary third-party providers, no OAuth/auth-login UI for Anthropic, and no remote config sync beyond the existing local provider files.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/desktop-provider-settings-panel.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The repository already supports provider switching through `/provider`,
but that flow lives in the CLI, is text-driven, and is backed by three
user-scoped files: `providers.json`, `auth.json`, and `settings.json`.
The desktop settings surface now needs a visual equivalent that exposes
the same supported semantics without drifting from the underlying file
format or defaulting rules.

## Optimized Task Brief

- **Outcome**: The desktop settings app exposes a `供应商` section under settings, with a provider switcher and provider-specific content. Anthropic can be activated safely as the built-in provider, and Codex can be configured and persisted with the same supported fields as the existing `/provider` flow.
- **Problem**: Provider management currently requires the CLI slash command flow, so desktop users have no discoverable panel for configuring Codex or switching back to Anthropic while preserving the correct underlying file semantics.
- **Scope**:
  - Research and document the supported `/provider` surface for Anthropic vs. Codex.
  - Add a `provider` settings section to the desktop settings navigation and shell.
  - Build a provider panel with a segmented provider switcher and provider-specific form content.
  - Persist provider settings through the Electron main process into the same user-scoped config files the CLI uses.
  - Cover defaults, validation, save behavior, and hydration with tests.
- **Non-goals**:
  - Supporting arbitrary provider IDs beyond `anthropic` and `codex`.
  - Building Anthropic login/token management inside this panel.
  - Replacing the CLI `/provider` implementation.
- **Constraints**:
  - Desktop behavior must stay aligned with the current `/provider` semantics.
  - Codex configuration must update the same file trio used by CLI provider management.
  - Anthropic remains the safe built-in fallback and should not require extra provider file configuration.
  - The new panel should match the existing `Appearance` settings visual language.
- **Affected surfaces**:
  - `apps/desktop/src/shared/*`
  - `apps/desktop/src/main/*`
  - `apps/desktop/src/preload/index.ts`
  - `apps/desktop/src/renderer/src/components/settings/*`
  - `apps/desktop/src/renderer/src/app/layout.tsx`
  - `apps/desktop/src/renderer/src/stores/ui.ts`
  - desktop tests and this plan
- **Validation**:
  - `bun run --cwd apps/desktop typecheck`
  - `bun run --cwd apps/desktop test`
  - direct tests for provider file hydration, Codex save semantics, and desktop provider UI flow
- **Docs to sync**:
  - docs/exec-plans/active/desktop-provider-settings-panel.md
  - docs/PLANS.md
- **Open assumptions**:
  - The current `/provider` command is the authoritative supported surface: Anthropic exposes activation semantics only, while Codex exposes the editable provider draft fields.

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

- Electron main cannot safely import the Bun-coupled CLI settings stack, so desktop provider persistence uses a file-format-compatible projection that directly reads and writes `~/.claude/*.json`.
- Anthropic remains activation-only in the settings panel because the authoritative `/provider` flow does not expose extra provider-file form fields for it.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | Limit the desktop provider UI to `anthropic` and `codex` | This is the actual supported `/provider` surface today; exposing generic providers would drift from current CLI semantics. |
| 2026-04-06 | Implement provider persistence in Electron main with direct JSON file projection | The root CLI settings stack pulls in Bun-only dependencies, which are not safe to import from Electron main. |
| 2026-04-06 | Add renderer-side bridge feature detection before loading provider settings | Desktop dev loops can briefly run with stale preload bundles; defensive detection prevents a hard crash. |

## Validation Log

- `python3 scripts/check_harness.py` ✅
- `bun run --cwd apps/desktop typecheck` ✅
- `bun run --cwd apps/desktop test` ✅

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
