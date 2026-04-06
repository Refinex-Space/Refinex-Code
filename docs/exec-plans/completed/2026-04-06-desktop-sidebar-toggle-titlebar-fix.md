> ✅ Completed: 2026-04-06
> Summary: 修复左上角侧边栏切换按钮错位、常驻底色，以及折叠后失去 hover 和点击的问题。
> Duration: single turn
> Key learnings: Titlebar controls must live under the actual drag-region tree on macOS custom chrome, otherwise `no-drag` can fail after layout changes.

# 修复左上角侧边栏切换按钮失效与错位

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Severity**: High
- **Goal**: Restore the top-left sidebar toggle button so it stays aligned with the macOS traffic lights, has hover-only chrome, and remains clickable after the sidebar is collapsed.
- **Impact**: The main navigation affordance becomes visually inconsistent and, in the collapsed state, can stop responding to hover and click entirely.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-06-desktop-sidebar-toggle-titlebar-fix.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Symptom and Context

- **Expected**: The titlebar toggle button should sit on the same visual row as the macOS traffic lights, stay visually quiet until hover, and toggle the sidebar in both open and collapsed states.
- **Observed**: The button is offset from the traffic-light row, always renders a background, and after collapsing the sidebar the button can lose hover and click behavior.
- **Impact**: Users lose a primary shell navigation control and the titlebar looks visually off compared with native macOS conventions.
- **Evidence**:
  - Electron window config pins traffic lights at `{ x: 18, y: 16 }`, but the renderer button is independently hard-coded to `top: 10px; left: 102px`.
  - The button is rendered as an independent fixed overlay, not as a descendant of a drag-region node, so the `no-drag` marker is not anchored to the titlebar drag hierarchy after the sidebar collapses.

## Optimized Bug Brief

- **Reproduction**:
  - Launch the desktop shell on macOS.
  - Observe the left-top sidebar toggle button against the traffic-light row.
  - Click the toggle to collapse the sidebar, then hover and click the same control again.
- **Likely surfaces**:
  - `apps/desktop/src/renderer/src/app/layout.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Hypotheses**:
  - The button positioning drift comes from using renderer-local absolute numbers that do not match the BrowserWindow traffic-light configuration.
  - The collapsed-state click failure is caused by placing a `no-drag` button outside the actual drag-region DOM tree.
- **Validation**:
  - `bun run --cwd apps/desktop typecheck`
  - `bun run --cwd apps/desktop test`
- **Docs to sync**:
  - docs/exec-plans/completed/2026-04-06-desktop-sidebar-toggle-titlebar-fix.md
  - docs/PLANS.md

## Investigation and Repair Slices

### Slice 1 — Reproduce or bound the failure

- [x] Reproduce / collect evidence
- [x] Record findings

### Slice 2 — Isolate root cause

- [x] Isolate
- [x] Record findings

### Slice 3 — Repair, add regression protection, and verify

- [x] Repair
- [x] Regression protection
- [x] Validate

## Risks and Rollback

- Duplicating the traffic-light offsets in the renderer could drift if the BrowserWindow config changes later; keep the values intentionally paired with the main-process titlebar configuration.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | Move the toggle into a drag-region overlay instead of keeping it as a standalone fixed overlay. | The collapsed-state click failure comes from `no-drag` living outside the actual titlebar drag-region tree. |
| 2026-04-06 | Use hover/focus-only chrome for the toggle button. | The previous always-on background made the titlebar control look visually active even at rest. |

## Validation Log

- Inspected `apps/desktop/src/main/index.ts` and confirmed the native traffic-light anchor is `{ x: 18, y: 16 }`.
- Verified the renderer previously hard-coded the toggle at `top: 10px; left: 102px` and rendered it outside the drag-region hierarchy.
- `bun run --cwd apps/desktop typecheck` -> pass
- `bun run --cwd apps/desktop test` -> pass (`3` files, `7` tests)

## Archive Notes

- Ready to archive. The repair restores collapsed-state interactivity by fixing drag-region ancestry and adds a regression test that toggles collapse -> expand in one pass.
