<!-- HARNESS:MANAGED FILE -->
# Tech Debt Tracker

Track recurring harness drift, deferred structural cleanup, and
instrumentation gaps here.

## Suggested Fields

- debt item
- impact or risk
- current workaround
- preferred fix
- owner or next checkpoint

## Current Items

- debt item: `apps/desktop/AGENTS.md` missing (reported by harness generated refresh on 2026-04-08)
- impact or risk: local routing/constraints for desktop module may drift and reduce task-level guardrail precision
- current workaround: rely on root `AGENTS.md` plus focused docs (`docs/FRONTEND.md`, `docs/OBSERVABILITY.md`) during desktop edits
- preferred fix: add and maintain `apps/desktop/AGENTS.md` with module-specific routing and invariants
- owner or next checkpoint: next desktop-focused harness-garden/bootstrap pass
