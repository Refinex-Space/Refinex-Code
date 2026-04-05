> ✅ Completed: 2026-04-05
> Summary: Completed the research and architecture decision for native
> Codex/OpenAI provider support, and recorded a phased plan that
> separates provider registry, auth storage, and transport adapters.
> Duration: one session
> Key learnings: this repository can already route through Anthropic-style
> proxies, but native Codex support requires a Responses-based adapter,
> not a base URL swap.

## Metadata

- **Status**: Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-05
- **Completed**: 2026-04-05
- **Goal**: research and design native Codex/OpenAI provider support for this repository
- **Plan path**: `docs/exec-plans/completed/2026-04-05-codex-provider-research.md`

## Optimized Task Brief

- **Outcome**: determine the correct product and architecture path for letting users configure a Codex/OpenAI provider from `~/.claude`, including provider endpoint, credential source, default model, and reasoning depth, without depending on Anthropic-only env hacks.
- **Why it matters**: the current repository already supports Anthropic first-party and Anthropic-compatible 3P routes, but it does not natively speak OpenAI Responses API or Codex provider semantics.
- **Scope**:
  - inspect current provider, auth, model, thinking, and streaming layers
  - inspect local `~/.codex/config.toml` and `~/.codex/auth.json` as a product reference
  - inspect official OpenAI Codex/Responses documentation
  - produce a repository-local design decision and phased implementation plan
- **Non-goals**:
  - no runtime provider implementation in this research slice
  - no secret migration or login automation in this slice
  - no attempt to force OpenAI traffic through the Anthropic wire format
- **Hard constraints and invariants**:
  - never commit plaintext secrets
  - keep settings trust boundaries explicit
  - preserve existing Anthropic behavior until an adapter boundary exists
  - do not hand-edit generated harness artifacts beyond necessary plan index updates
- **Likely affected surfaces**:
  - `src/utils/settings/*`
  - `src/utils/auth.ts`
  - `src/utils/model/*`
  - `src/services/api/*`
  - `src/query.ts`
  - `src/cli/print.ts`
  - SDK schemas and `/status` surfaces
- **Validation target**:
  - design doc captures option analysis, recommendation, risks, and phased delivery
  - plan log records repo evidence and official-doc evidence
- **Docs and artifacts to update**:
  - `docs/design-docs/codex-provider-support.md`
  - `docs/design-docs/index.md`
  - `docs/PLANS.md`

## Harness Preflight

- Root `AGENTS.md` reviewed from task context.
- `docs/PLANS.md` reviewed: no active plan before this task.
- `python3 scripts/check_harness.py` result: OK.
- `docs/generated/harness-manifest.md` reviewed.
- Relevant docs reviewed: `ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DESIGN.md`, `docs/OBSERVABILITY.md`.

## Harness Gaps

- `scripts/init_exec_plan.py` is absent in this repository.
- `scripts/sync_plan_state.py` is absent in this repository.
- `scripts/archive_exec_plan.py` is absent in this repository.
- This plan is therefore created and synced manually for this slice.

## Evidence Log

### Repository findings

- The runtime provider union is currently hard-coded to `firstParty | bedrock | vertex | foundry`.
- Provider-specific logic appears broadly across the repository (`349` matches for provider-related branches).
- Anthropic message/thinking/tool block semantics are deeply embedded (`1151` matches for `beta.messages`, thinking, or tool block related logic).
- The core request path is built on `@anthropic-ai/sdk` and `anthropic.beta.messages.create`.
- Current user configuration entry points are `~/.claude/settings.json` plus settings-derived environment variables, not a TOML provider registry.
- Current persisted effort semantics are `low | medium | high | max`, which does not cover Codex/OpenAI `minimal | ... | xhigh`.

### Local product-reference findings

- Local Codex uses `~/.codex/config.toml` for provider/model/runtime configuration.
- Local Codex uses `~/.codex/auth.json` or an OS credential store for cached login/API-key auth.
- Local Claude settings currently route through Anthropic-style environment variables in `~/.claude/settings.json`, which already proves the repository supports proxy-style routing but not native Codex/OpenAI semantics.

### Official-doc findings

- OpenAI Codex officially documents `~/.codex/config.toml`, `model_provider`, `model_providers.<id>.*`, and `model_reasoning_effort`.
- OpenAI Codex officially documents cached auth in `~/.codex/auth.json` or OS credential store.
- OpenAI custom providers are Responses API based.
- OpenAI Responses API is item-based, tool-call oriented, and has a different streaming/event model than Anthropic Messages.

## Open Questions

- Whether the first native OpenAI slice should support API-key auth only, or also browser login and cached account auth.
- Whether reasoning visibility in the Claude-style TUI should map to OpenAI reasoning summaries only, or expose a provider-neutral reasoning surface.
- Whether provider selection should remain a session setting, or become a user-only provider profile plus session override.

## Validation Evidence

- `python3 scripts/check_harness.py` -> OK: True
- `docs/PLANS.md` references were updated during execution and cleared again on completion
- `docs/design-docs/index.md` includes `codex-provider-support.md`
- `docs/design-docs/codex-provider-support.md` captures option analysis, recommendation, risks, and phased rollout

## Exit Criteria For This Slice

- [x] add the design document with recommendation and phased plan
- [x] sync `docs/design-docs/index.md`
- [x] sync `docs/PLANS.md`
- [x] record validation evidence
