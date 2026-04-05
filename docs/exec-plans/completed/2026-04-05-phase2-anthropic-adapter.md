> ✅ Completed: 2026-04-05
> Summary: Extracted the current Anthropic request path behind a provider
> adapter and redirected existing call sites to the adapter entrypoint
> without changing runtime behavior.
> Duration: one session
> Key learnings: the safest seam is to wrap `claude.ts` first and defer
> internal refactors until the OpenAI adapter lands.

## Metadata

- **Status**: Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-05
- **Completed**: 2026-04-05
- **Goal**: extract the current Anthropic request path behind a provider adapter
- **Plan path**: `docs/exec-plans/completed/2026-04-05-phase2-anthropic-adapter.md`

## Optimized Task Brief

- **Outcome**: wrap the existing `src/services/api/claude.ts` behavior behind an adapter boundary and route current call sites through that boundary.
- **Why it matters**: this creates the seam needed for a future OpenAI Responses adapter without changing runtime behavior now.
- **Scope**:
  - add provider adapter interface
  - add anthropic adapter implementation that delegates to current logic
  - update current imports to use adapter entrypoints
  - reflect runtime adapter status truthfully
- **Non-goals**:
  - no OpenAI Responses runtime support yet
  - no provider-aware model picker yet
  - no transport behavior changes
- **Hard constraints and invariants**:
  - keep Anthropic runtime behavior byte-for-byte equivalent where possible
  - keep non-Anthropic configured providers in fallback status until their adapter exists
  - avoid large refactors inside `claude.ts` in this slice
- **Validation target**:
  - harness check passes
  - existing focused tests still pass
  - new adapter selection tests pass

## Delivered

- Added `src/services/api/adapters/anthropicMessagesAdapter.ts`
- Added `src/services/api/providerAdapter.ts`
- Redirected existing call sites from `claude.ts` imports to `providerAdapter.ts`
- Updated `/status` to reflect runtime adapter fallback truthfully for unsupported configured providers
- Added `src/providerAdapter.test.ts`

## Validation Evidence

- `bun test src/providerAdapter.test.ts` -> 2 pass
- `bun test src/providerFoundation.test.ts` -> 5 pass
- `bun test src/dev-entry.test.ts` -> 4 pass
- `bun run version` -> success
- `python3 scripts/check_harness.py` -> OK: True
