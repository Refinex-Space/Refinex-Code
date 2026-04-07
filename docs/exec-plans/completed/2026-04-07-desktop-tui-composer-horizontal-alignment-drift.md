> ✅ Completed: 2026-04-07
> Summary: Re-centered the thread composer so it shares the same 920px centered layout as the TUI panel.
> Duration: TBD
> Key learnings: TBD

# desktop tui composer horizontal alignment drift

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Severity**: Low
- **Goal**: 让线程页 TUI 区和下方 composer 的左边界重新对齐
- **Impact**: 当前线程页上下两个主视觉面板左边界错位，破坏页面几何对齐与视觉稳定性
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-07-desktop-tui-composer-horizontal-alignment-drift.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Symptom and Context

- **Expected**: 上方线程 TUI 面板和下方输入框使用同一条水平中心线与相同的左边界
- **Observed**: TUI 内容区已 `mx-auto` 居中，但 composer 仅有 `max-w-[920px]` 没有 `mx-auto`，因此它在 `960px` 父容器内左贴，导致左边界比 TUI 更靠左
- **Impact**: 界面视觉上出现明显的“上下不在一条线”的错位
- **Evidence**:
  - `workspace-home.tsx` 中 `data-thread-surface="content"` 容器使用 `mx-auto flex ... max-w-[920px]`
  - `workspace-composer.tsx` 根容器仅为 `w-full max-w-[920px]`，没有水平居中类
  - 用户截图显示 TUI 左边与下方输入框左边界不在同一条线上

## Optimized Bug Brief

- **Reproduction**:
  - 打开桌面端线程页 TUI
  - 对比上方 TUI 面板与下方 composer 的左边界
- **Likely surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Hypotheses**:
  - 不是 xterm 自身偏移，而是 composer 容器没有真实水平居中
- **Validation**:
  - `npm run typecheck` in `apps/desktop`
  - `npm test -- --run src/renderer/src/test/shell.smoke.test.tsx src/renderer/src/test/terminal-panel.test.tsx`
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-desktop-tui-composer-horizontal-alignment-drift.md
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

- 风险较低，主要是居中修复时误影响 composer 宽度约束；因此只做 `mx-auto` 级别的最小修复
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | 仅为 composer 根容器补 `mx-auto`，不动 TUI 区和父布局结构 | 证据显示偏移根因在 composer 没真实居中，而不是 TUI 容器偏移；最小修复即可恢复对齐 |
| 2026-04-07 | 为 composer 根容器增加 `data-thread-composer` 测试锚点 | 避免后续视觉调整再次让 composer 失去居中，但不把测试绑死到复杂 DOM 层级 |

## Validation Log

- `2026-04-07` 通过代码结构比对确认：TUI 容器为 `mx-auto max-w-[920px]`，composer 根容器缺失 `mx-auto`
- `2026-04-07` 为 `workspace-composer.tsx` 根容器恢复水平居中，并补充 smoke test 断言
- `2026-04-07` `npm run typecheck` (cwd `apps/desktop`) -> pass
- `2026-04-07` `npm test -- --run src/renderer/src/test/shell.smoke.test.tsx src/renderer/src/test/terminal-panel.test.tsx` (cwd `apps/desktop`) -> pass, 26 tests passed

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
