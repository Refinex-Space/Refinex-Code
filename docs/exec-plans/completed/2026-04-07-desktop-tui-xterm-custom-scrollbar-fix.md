> ✅ Completed: 2026-04-07
> Summary: Targeted xterm's custom embedded scrollbar DOM directly so the thread TUI now uses a genuinely slimmer scrollbar.
> Duration: TBD
> Key learnings: TBD

# desktop tui xterm custom scrollbar fix

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: 让线程页 embedded TUI 的滚动条真正细化到目标样式，而不是继续显示 xterm 默认的粗滚动条
- **Scope**: embedded xterm 自绘滚动条 DOM 的样式覆盖、验证与计划同步
- **Non-goals**: 不改线程布局宽度，不改 PTY 链路，不调整 shell docked 终端滚动条
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-07-desktop-tui-xterm-custom-scrollbar-fix.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

前一轮只覆盖了 `xterm-viewport` 的原生滚动条样式，但实际可见的滚动条来自 xterm 注入的 `.xterm-scrollable-element > .scrollbar.vertical > .slider`，并且其宽度由 inline style 直接设为 `14px`，所以视觉上没有任何变化。

## Optimized Task Brief

- **Outcome**: embedded TUI 的右侧滚动条改为真正的细滚动条，视觉上弱化但仍保留可用性
- **Problem**: 当前样式命中了错误 DOM 层，无法影响 xterm 自绘滚动条
- **Scope**:
  - 直接覆盖 embedded xterm 的 `.scrollbar.vertical` 与 `.slider`
  - 用更高优先级样式压过 xterm 注入的 inline 宽度与内部 style tag
  - 保留 hover/active 的可见反馈
- **Non-goals**:
  - 不再做新的布局改动
  - 不修改 xterm 源码或运行时配置
  - 不改全局滚动条
- **Constraints**:
  - 仅影响 `[data-terminal-chrome="embedded"]` 范围
  - 必须压过 xterm 自己的 style 注入与 inline 宽度
  - 亮色与暗色主题都要可读
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/styles/globals.css`
- **Validation**:
  - `npm run typecheck` in `apps/desktop`
  - `npm test -- --run src/renderer/src/test/shell.smoke.test.tsx src/renderer/src/test/terminal-panel.test.tsx`
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-desktop-tui-xterm-custom-scrollbar-fix.md
  - docs/PLANS.md
- **Open assumptions**:
  - 通过纯 CSS 覆盖 xterm 自绘滚动条即可满足需求，不需要改终端实例化参数

## Incremental Slices

### Slice 1 — Establish context and the smallest viable change

- [x] Implement
- [x] Validate

### Slice 2 — Deliver the core implementation

- [ ] Implement
- [ ] Validate

### Slice 3 — Documentation, observability, and finish-up

- [ ] Sync docs and generated surfaces
- [ ] Final validation

## Risks and Rollback

- xterm 的 scrollbar 结构是内部实现细节，因此样式选择器需要尽量局部且明确，避免未来升级时误伤其他滚动层
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |

## Validation Log

- Plan initialized; add real validation commands and outcomes

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
