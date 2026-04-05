> ✅ Completed: 2026-04-05
> Summary: Added Codex-compatible provider context-window and auto-compact configuration, wired the values into runtime context and compaction calculations, and exposed them through /provider and /status.
> Duration: one session
> Key learnings: OpenAI docs confirm the keys exist, but local Codex source is the authoritative place to verify current default context-window values and clamp behavior.; Provider-specific long-context controls are only trustworthy when they feed the real threshold calculations, not just the config UI.

# Provider context window config

## Metadata

- **Status**: Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-05
- **Completed**: 2026-04-05
- **Goal**: Add Codex-compatible context-window and auto-compact threshold configuration to the provider system and make those values affect runtime context calculations when the active provider is Codex/OpenAI Responses.
- **Scope**: Extend provider config schema/storage, thread context-window and auto-compact overrides through runtime calculations, surface the values in /provider and /status, and add focused tests using documented Codex-compatible semantics.
- **Non-goals**: No generic import from ~/.codex/config.toml yet; no full per-model catalog import; no unrelated compaction redesign for Anthropic paths.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/provider-context-window-config.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

Codex-compatible provider switching exists, but the provider config cannot yet express or apply model_context_window and model_auto_compact_token_limit, so long-context OpenAI/Codex sessions cannot be tuned in a way that matches Codex semantics.

## Optimized Task Brief

- **Outcome**: Add Codex-compatible context-window and auto-compact threshold configuration to the provider system and make those values affect runtime context calculations when the active provider is Codex/OpenAI Responses.
- **Problem**: Codex-compatible provider switching exists, but the provider config cannot yet express or apply model_context_window and model_auto_compact_token_limit, so long-context OpenAI/Codex sessions cannot be tuned in a way that matches Codex semantics.
- **Scope**: Extend provider config schema/storage, thread context-window and auto-compact overrides through runtime calculations, surface the values in /provider and /status, and add focused tests using documented Codex-compatible semantics.
- **Non-goals**: No generic import from ~/.codex/config.toml yet; no full per-model catalog import; no unrelated compaction redesign for Anthropic paths.
- **Constraints**:
  - Provider-specific overrides must only affect the configured provider path and must not regress Anthropic context behavior.
  - If unset, Codex/OpenAI defaults should come from documented or source-verified Codex-compatible defaults rather than guesses.
  - Auto-compact limit must be validated and clamped safely relative to the configured context window.
- **Affected surfaces**:
  - src/utils/providerRegistry.ts
  - src/utils/model/providerCatalog.ts
  - src/utils/context.ts
  - src/services/compact/autoCompact.ts
  - src/utils/providerManagement.ts and ProviderManager wizard
  - src/utils/status.tsx
- **Validation**:
  - Focused tests verify default and configured context-window / auto-compact behavior for Codex providers.
  - Provider manager persists the new fields into providers.json.
  - python3 scripts/check_harness.py passes.
- **Docs to sync**:
  - docs/exec-plans/active/provider-context-window-config.md
  - docs/PLANS.md
- **Open assumptions**:
  - TBD

## Incremental Slices

### Slice 1 — Schema and default-model semantics

- [x] Implement
- [x] Validate

### Slice 2 — Runtime context/compact integration

- [x] Implement
- [x] Validate

### Slice 3 — Command/UI exposure and finish-up

- [x] Sync docs and generated surfaces
- [x] Final validation

## Risks and Rollback

- The project still uses its own effective-window and blocking-limit logic outside Codex's exact 95% runtime exposure model, so this slice aligns the configurable window and compaction threshold first without attempting a full context-management rewrite.
- Git revert or restore the modified files

## Delivered

- Extended `providers.json` provider definitions with:
  - `modelContextWindow`
  - `modelAutoCompactTokenLimit`
- Added Codex/OpenAI-compatible provider helpers that:
  - default `gpt-5.4` and `gpt-5.3-codex` to a source-verified `272000` token raw context window
  - default auto-compact to `90%` of the context window when no explicit limit is configured
  - clamp explicit auto-compact limits to `90%` of the configured context window, matching Codex source behavior
- Threaded provider-specific context-window values into:
  - `getContextWindowForModel()`
  - auto-compact threshold resolution
  - `/status` provider diagnostics
  - `/provider` Codex configuration wizard and persistence flow
- Added focused tests that verify:
  - default Codex-compatible context-window and compaction values
  - custom override behavior
  - `90%` clamp behavior
  - persistence of the new fields in `providers.json`

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-05 | Store Codex-style `model_context_window` and `model_auto_compact_token_limit` as provider-definition extensions in `providers.json` | The user wanted these values tied to the Codex/OpenAI provider profile rather than merged into generic user settings. |
| 2026-04-05 | Use source-verified Codex defaults of `272000` raw context tokens for `gpt-5.4` / `gpt-5.3-codex`, with a `90%` default auto-compact threshold | OpenAI docs enumerate the keys but do not publish model defaults; the local Codex reference code and model catalog provide authoritative implementation defaults. |
| 2026-04-05 | Clamp configured auto-compact thresholds to `90%` of the configured context window at runtime instead of rejecting them | This matches Codex source semantics and preserves the user's raw configured value while keeping behavior safe. |
| 2026-04-05 | Integrate the new values into runtime threshold calculations, not just provider UI storage | A file-only implementation would create false confidence; the settings need to affect context and compaction decisions to be meaningful. |

## Validation Log

- `bun test src/providerContextWindow.test.ts src/providerManagement.test.ts src/providerFoundation.test.ts src/providerModelCatalog.test.ts src/openaiResponsesAdapter.test.ts` -> 21 pass
- `bun -e "await Promise.all([import('./src/utils/context.ts'), import('./src/services/compact/autoCompact.ts'), import('./src/components/provider/ProviderManager.tsx'), import('./src/utils/status.tsx')]); console.log('phase6-ok')"` -> success
- `python3 scripts/check_harness.py` -> OK: True

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
