> ✅ Completed: 2026-04-06
> Summary: 将侧边栏切换按钮移到右侧控制区，并加上顺序与交互回归测试。
> Duration: single turn
> Key learnings: For shell chrome controls, a stable action cluster can be a better UX and engineering choice than repeatedly fighting custom titlebar placement.

# 将侧边栏切换按钮移到右侧控制区

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Severity**: Medium
- **Goal**: Reposition the sidebar toggle into the stable right-side control cluster so the control is visually consistent and avoids the fragile left-titlebar layout entirely.
- **Impact**: The current left-titlebar placement continues to be visually unsatisfying and has already produced multiple interaction regressions.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-06-desktop-sidebar-toggle-right-controls.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Symptom and Context

- **Expected**: The sidebar toggle should live in a stable, consistently interactive area of the shell chrome, next to the other explicit window actions.
- **Observed**: The previous left-titlebar design remains unsatisfactory after the last fix attempt, and the user wants the control moved next to the terminal toggle instead.
- **Impact**: Repeated iteration on the left-titlebar slot is slowing down the shell polish work and keeping a fragile interaction path alive.
- **Evidence**:
  - The current renderer still contains a dedicated left-titlebar overlay implementation for the sidebar toggle.
  - The right-side action cluster already hosts reliable `data-no-drag` buttons, including the terminal toggle that the user referenced.

## Optimized Bug Brief

- **Reproduction**:
  - Launch the desktop shell.
  - Observe that the sidebar toggle still occupies a custom left-titlebar slot instead of the right-side action cluster.
- **Likely surfaces**:
  - `apps/desktop/src/renderer/src/app/layout.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Hypotheses**:
  - Removing the dedicated left-titlebar overlay will eliminate the remaining layout fragility.
  - Placing the toggle immediately before the terminal button will satisfy the requested information hierarchy while preserving the existing control styling model.
- **Validation**:
  - `bun run --cwd apps/desktop typecheck`
  - `bun run --cwd apps/desktop test`
- **Docs to sync**:
  - docs/exec-plans/completed/2026-04-06-desktop-sidebar-toggle-right-controls.md
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

- The sidebar toggle now lives in the right-side control cluster, so future titlebar redesigns need to preserve that ordering if the terminal button changes position.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | Remove the dedicated left-titlebar overlay for the sidebar toggle. | The user explicitly rejected the left-titlebar placement and the overlay had already produced interaction regressions. |
| 2026-04-06 | Place the sidebar toggle immediately to the left of the terminal toggle. | This keeps the shell actions grouped and gives the toggle a stable `data-no-drag` host. |

## Validation Log

- Confirmed the current implementation still used a dedicated left-titlebar toggle overlay.
- Moved the toggle into the right-side control row before the terminal button and kept the hover-only chrome.
- `bun run --cwd apps/desktop typecheck` -> pass
- `bun run --cwd apps/desktop test` -> pass (`3` files, `7` tests)

## Archive Notes

- Ready to archive. Regression coverage now checks both toggle interactivity after collapse and button order relative to the terminal action.
