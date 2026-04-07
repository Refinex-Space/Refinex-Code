> ✅ Completed: 2026-04-07
> Summary: Restored the embedded xterm custom scrollbar styles and the 920px thread content width after an accidental rollback.
> Duration: TBD
> Key learnings: TBD

# desktop tui custom scrollbar restore

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Severity**: Low
- **Goal**: 恢复线程页 embedded TUI 已验证通过的自绘细滚动条样式
- **Impact**: 线程页 TUI 视觉回退为粗滚动条，破坏前一轮已完成的界面优化
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-07-desktop-tui-custom-scrollbar-restore.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Symptom and Context

- **Expected**: embedded TUI 使用之前修好的细滚动条，宽度与视觉权重都明显低于默认 xterm 滚动条
- **Observed**: `globals.css` 中只剩命中 `xterm-viewport` 的规则，实际可见的 xterm 自绘滚动条重新显示为粗 `14px` 样式
- **Impact**: 线程页右侧滚动条重新变粗，亮色主题下尤其突兀
- **Evidence**:
  - 当前文件内容缺少 `.xterm-scrollable-element > .scrollbar.vertical > .slider` 相关规则
  - 用户提供了实际 DOM，确认真正可见的滚动条来自 xterm 自绘层，而不是 `xterm-viewport`

## Optimized Bug Brief

- **Reproduction**:
  - 打开桌面端线程页 TUI
  - 观察右侧滚动条仍为 xterm 默认粗滚动条
- **Likely surfaces**:
  - `apps/desktop/src/renderer/src/styles/globals.css`
- **Hypotheses**:
  - 上一次命中 xterm 自绘滚动条的 CSS 被误撤销，只剩早先无效的 viewport 样式实验
- **Validation**:
  - `npm run typecheck` in `apps/desktop`
  - `npm test -- --run src/renderer/src/test/shell.smoke.test.tsx src/renderer/src/test/terminal-panel.test.tsx`
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-desktop-tui-custom-scrollbar-restore.md
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

- 仅恢复单文件样式，但需要避免误碰 embedded 主题和布局规则
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | 同时恢复自绘滚动条 CSS 和线程内容区 `920px` 宽度约束 | 实际回归并非只影响滚动条，`workspace-home` 里的内容宽度也被一并改回了 `890px`，需要恢复到最近一次通过测试的稳定状态 |
| 2026-04-07 | 保留并继续使用现有 smoke test 的 `data-thread-surface` 断言作为回归保护 | 该断言已经能覆盖线程内容区宽度约束，恢复代码后无需再引入新的测试噪音 |

## Validation Log

- `2026-04-07` `python3 scripts/check_harness.py` -> pass
- `2026-04-07` 恢复 `globals.css` 中 embedded xterm 自绘滚动条选择器，并恢复 `workspace-home.tsx` 中线程内容区 `max-w-[920px]`
- `2026-04-07` `npm run typecheck` (cwd `apps/desktop`) -> pass
- `2026-04-07` `npm test -- --run src/renderer/src/test/shell.smoke.test.tsx src/renderer/src/test/terminal-panel.test.tsx` (cwd `apps/desktop`) -> pass, 26 tests passed

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
