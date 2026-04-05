> ✅ Completed: 2026-04-05
> Summary: Added a dedicated /provider management surface, integrated it into /config, and made Codex provider setup and switching create and update user-scoped provider files safely.
> Duration: one session
> Key learnings: A dedicated provider command is clearer than overloading /config alone, but reusing the same component from /config prevents UI drift.; Provider switching must rewrite provider-sensitive settings together with model state; otherwise /model and runtime selection diverge.

# Provider command management UI

## Metadata

- **Status**: Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-05
- **Completed**: 2026-04-05
- **Goal**: Add a user-visible slash command workflow to switch and configure model providers safely from Claude Code.
- **Scope**: Add a provider management slash command, provider switch flow, OpenAI/Codex configuration prompts, immediate runtime/app-state updates, safe creation of missing user config files, and targeted tests/docs.
- **Non-goals**: No direct import from ~/.codex/config.toml in this slice; no project-scoped provider secrets; no large redesign of the existing settings panel beyond what is necessary to surface the provider flow.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/provider-command-management-ui.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

Provider support now exists in config/runtime, but users still have to hand-edit ~/.claude/providers.json, auth.json, and settings.json to switch between Anthropic and OpenAI/Codex.

## Optimized Task Brief

- **Outcome**: Add a user-visible slash command workflow to switch and configure model providers safely from Claude Code.
- **Problem**: Provider support now exists in config/runtime, but users still have to hand-edit ~/.claude/providers.json, auth.json, and settings.json to switch between Anthropic and OpenAI/Codex.
- **Scope**: Add a provider management slash command, provider switch flow, OpenAI/Codex configuration prompts, immediate runtime/app-state updates, safe creation of missing user config files, and targeted tests/docs.
- **Non-goals**: No direct import from ~/.codex/config.toml in this slice; no project-scoped provider secrets; no large redesign of the existing settings panel beyond what is necessary to surface the provider flow.
- **Constraints**:
  - Provider secrets remain user-scoped and never enter project/local settings.
  - Switching providers must also resolve the active model to a provider-compatible model immediately.
  - Missing ~/.claude/providers.json, ~/.claude/auth.json, and ~/.claude/settings.json should be created automatically through existing write paths.
  - Anthropic built-in provider must remain a safe fallback.
- **Affected surfaces**:
  - src/commands/provider/*
  - src/components/provider/* or shared command UI components
  - src/utils/providerRegistry.ts and src/utils/providerAuthStore.ts integration paths
  - src/state/onChangeAppState.ts and model/provider selection interaction
  - src/commands/model/model.tsx and ModelPicker behavior after switching
- **Validation**:
  - Slash-command flow switches between anthropic and codex providers and updates model picker options.
  - OpenAI/Codex configuration flow writes or creates user config files safely.
  - Focused tests cover provider switching and config persistence.
  - python3 scripts/check_harness.py passes.
- **Docs to sync**:
  - docs/exec-plans/active/provider-command-management-ui.md
  - docs/PLANS.md
- **Open assumptions**:
  - TBD

## Incremental Slices

### Slice 1 — Provider management service and persistence semantics

- [x] Implement
- [x] Validate

### Slice 2 — User-visible command and config-surface integration

- [x] Implement
- [x] Validate

### Slice 3 — Documentation, observability, and finish-up

- [x] Sync docs and generated surfaces
- [x] Final validation

## Risks and Rollback

- Anthropic model-option behavior still depends on the existing auth/subscriber branching, so tests need an auth env stub when asserting Anthropic picker output.
- Git revert or restore the modified files

## Delivered

- Added a dedicated `/provider` local JSX command with:
  - `status` summary output
  - quick switching for `anthropic` and `codex`
  - an interactive Codex configuration wizard
- Added a shared `ProviderManager` component and reused it inside `/config` as a new `Provider` submenu entry.
- Added `src/utils/providerManagement.ts` to centralize:
  - provider-control lock detection
  - Codex provider draft/default resolution
  - safe file creation via `providers.json`, `auth.json`, and `settings.json`
  - immediate provider activation semantics for both Anthropic and Codex
- Extended provider utilities with:
  - raw registry file access for safe incremental writes
  - provider-model catalog lookup by driver for provider-specific wizard defaults
- Added focused provider management tests that verify:
  - missing user config files are created automatically
  - switching to Codex activates GPT model options
  - switching back to Anthropic clears provider-specific user settings safely

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-05 | Ship a dedicated `/provider` command and reuse the same UI from `/config` | Users need an explicit provider workflow, but duplicating logic between slash command and settings would drift quickly. |
| 2026-04-05 | Phase scope officially manages only `anthropic` and `codex` | A generic provider editor would expand surface area before behavior is stable; the user-visible need is specifically Anthropic vs. Codex/OpenAI. |
| 2026-04-05 | Codex configuration writes explicit `modelProvider`, `model`, `modelVerbosity`, and `effortLevel` to user settings | This makes provider switching deterministic and updates `/model` immediately without relying on implicit defaults. |
| 2026-04-05 | Anthropic switching clears provider-sensitive OpenAI-only settings instead of preserving them | Clearing `modelVerbosity` and explicit Codex model/effort avoids incompatible leftovers and keeps the built-in fallback safe. |
| 2026-04-05 | Provider credentials configured through this flow are persisted to `auth.json` by forcing `authStore: file` | The user explicitly asked for file creation and inspectable config state; file-backed auth makes the flow predictable and testable. |

## Validation Log

- `bun test src/providerManagement.test.ts src/providerFoundation.test.ts src/providerModelCatalog.test.ts src/openaiResponsesAdapter.test.ts` -> 18 pass
- `bun -e "await Promise.all([import('./src/commands/provider/provider.tsx'), import('./src/components/provider/ProviderManager.tsx'), import('./src/components/Settings/Config.tsx'), import('./src/commands.ts')]); console.log('provider-command-ok')"` -> success
- `python3 scripts/check_harness.py` -> OK: True

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
