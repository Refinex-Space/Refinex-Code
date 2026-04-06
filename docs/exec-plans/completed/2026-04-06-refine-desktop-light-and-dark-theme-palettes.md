> ✅ Completed: 2026-04-06
> Summary: Retuned desktop theme palettes to a pale-gray sidebar and white main stage in light mode, and a near-black sidebar with pure-black main stage in dark mode.
> Duration: TBD
> Key learnings: TBD

# Refine desktop light and dark theme palettes

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: Refine the desktop light and dark theme palettes so the sidebar and main stage read as clean two-plane surfaces instead of gradient-driven scenes.
- **Scope**: Theme tokens, layout background treatment, and the primary workspace stage surfaces in the desktop renderer.
- **Non-goals**: Rebuild component structure, add new UI features, or redesign unrelated flows.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/refine-desktop-light-and-dark-theme-palettes.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The current desktop shell still uses atmospheric gradients and semi-transparent
surfaces as the main visual driver. That conflicts with the desired product
direction: light mode should read as pale-gray sidebar plus white main stage,
while dark mode should read as near-black sidebar plus pure-black main stage.
Once those base planes change, the supporting surface, border, and interaction
tokens must be rebalanced so the UI remains legible and intentional.

## Optimized Task Brief

- **Outcome**: Ship a flatter, more controlled desktop theme system with a
  light mode built around a light-gray sidebar and white main stage, and a dark
  mode built around a near-black sidebar and pure-black main stage.
- **Problem**: The current theme relies on gradients, translucent panels, and
  cool-tinted backgrounds, so the shell does not present the clean neutral split
  requested by the user.
- **Scope**:
  - retune the global light and dark theme tokens
  - remove gradient-based backgrounds from the main shell and workspace home
  - preserve component legibility by adjusting supporting neutrals and borders
- **Non-goals**:
  - changing worktree/session behavior
  - adding screenshots or visual snapshot tooling
  - redesigning local component compositions beyond theme adaptation
- **Constraints**:
  - light mode main stage background must be `#ffffff`
  - dark mode main stage background must be pure black
  - dark mode sidebar must remain distinguishable from pure black
  - preserve existing desktop test coverage and type safety
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/styles/globals.css`
  - `apps/desktop/src/renderer/src/app/layout.tsx`
  - `apps/desktop/src/renderer/src/components/workspace/workspace-home.tsx`
- **Validation**:
  - `bun run desktop:typecheck`
  - `bun run desktop:test`
- **Docs to sync**:
  - docs/exec-plans/active/refine-desktop-light-and-dark-theme-palettes.md
  - docs/PLANS.md
- **Open assumptions**:
  - The strongest product improvement comes from changing the base planes and
    shared tokens first; most component-level color issues should resolve by
    inheriting the new palette.

## Frontend Art Direction

- **Visual thesis**: Quiet monochrome planes with a single cool-blue accent, where contrast comes from surface elevation and typography instead of ambient gradients.
- **Content plan**: Sidebar reads as utility navigation, main stage reads as a clean canvas, and overlays remain slightly lifted from those two base planes.
- **Interaction thesis**:
  - neutral hover states should feel crisp and local
  - the shell should look calmer because background motion and color noise are removed
  - dark mode hierarchy should come from black-depth separation, not from tint variety

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

- Risk: making both main stages fully flat can reduce contrast if shared component
  surfaces remain too close to the page background.
- Mitigation: rebalance shared surface, border, muted-text, and sidebar state
  tokens together instead of changing only the background planes.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | Remove shell-level gradients from `body`, `Layout`, and `WorkspaceHome`. | The requested visual direction is a clean two-plane split, and gradient overlays were the main source of drift. |
| 2026-04-06 | Keep blue as the single accent and move the rest of the palette toward neutral grays and blacks. | Once the base planes become white and black, extra hue variety would add noise instead of hierarchy. |
| 2026-04-06 | Use pure black for the dark main stage but keep the sidebar one step lighter. | The user explicitly asked for a pure-black main panel while preserving sidebar separation. |

## Validation Log

- `python3 scripts/check_harness.py` -> pass
- `bun run desktop:typecheck` -> pass
- `bun run desktop:test` -> pass (`3` files, `8` tests)
- Light mode palette now uses white main stage plus pale-gray sidebar; dark mode palette now uses pure-black main stage plus near-black sidebar

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
