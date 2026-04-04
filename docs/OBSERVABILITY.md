<!-- HARNESS:MANAGED FILE -->
# Observability

## Purpose

Make runtime behavior legible to future agents instead of relying on
tribal knowledge.

## Required Surfaces

- relevant logs and error evidence
- important metrics or timing signals
- traces or request-flow breadcrumbs when available
- browser or end-to-end verification surfaces for UI work when supported

## Defaults

- prefer scriptable inspection over manual narration
- keep commands, dashboards, and debugging entry points discoverable
- when isolated worktrees or per-task environments exist, document how to use them
- record recurring blind spots in `docs/exec-plans/tech-debt-tracker.md`
