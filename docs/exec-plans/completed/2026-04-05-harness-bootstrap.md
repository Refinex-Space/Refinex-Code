> ✅ Completed: 2026-04-05
> Summary: Installed the Harness Engineering control plane, added a
> mechanical repo check, and migrated historical planning/design docs
> into the new archive layout.
> Duration: one session
> Key learnings: preserving unmanaged root routing docs is safe as long
> as the Harness entry points are added explicitly and re-validated.

# Harness Bootstrap

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-05
- **Completed**: 2026-04-05
- **Goal**: bootstrap or complete the Harness Engineering control plane
  for `Refinex-Code`
- **Plan path**: `docs/exec-plans/completed/2026-04-05-harness-bootstrap.md`

## Repository Profile

- Project type: full-stack
- Languages: TypeScript, JavaScript
- Frameworks: React
- Local AGENTS candidates: none
- Profile fingerprint: e18b06cfce7a5c55

## This Bootstrap Creates

- `ARCHITECTURE.md`
- `docs/README.md`
- `docs/PLANS.md`
- `docs/SECURITY.md`
- `docs/RELIABILITY.md`
- `docs/OBSERVABILITY.md`
- `docs/QUALITY_SCORE.md`
- `docs/exec-plans/tech-debt-tracker.md`
- `docs/exec-plans/completed/README.md`
- `docs/generated/README.md`
- `docs/references/index.md`
- `docs/FRONTEND.md`
- `docs/PRODUCT_SENSE.md`
- `docs/product-specs/index.md`
- `docs/DESIGN.md`
- `docs/design-docs/index.md`
- `docs/design-docs/core-beliefs.md`

## Preserved or Skipped

- AGENTS.md (existing unmanaged file preserved)

## Incremental Slices

### Slice 1 — establish the map and core docs

- [x] root `AGENTS.md`
- [x] `ARCHITECTURE.md`
- [x] `docs/PLANS.md`

### Slice 2 — add indexes, plan lifecycle, and generated facts

- [x] `docs/README.md`
- [x] `docs/generated/harness-manifest.md`
- [x] `scripts/check_harness.py`

### Slice 3 — conditional docs and local AGENTS

- [x] conditional docs
- [x] local `AGENTS.md`
- [x] self-check validation

## Risks and Follow-ups

- Root `AGENTS.md` remains user-owned and now includes explicit Harness
  routes without converting it into a managed file.
