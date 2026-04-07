> ✅ Completed: 2026-04-07
> Summary: Aligned embedded TUI width with the composer and reduced the embedded terminal scrollbar footprint.
> Duration: TBD
> Key learnings: TBD

# desktop tui embedded width and scrollbar polish

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: 让线程页 embedded TUI 的内容宽度与下方输入框对齐，并弱化滚动条存在感
- **Scope**: 线程页内容宽度约束、embedded xterm 滚动条样式、相关回归测试
- **Non-goals**: 不改 CLI 内容排版，不调整底部 shell 终端滚动条，不改线程发送链路
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-07-desktop-tui-embedded-width-and-scrollbar-polish.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

上一轮已经完成了 embedded TUI 的亮色主题和无外壳样式，但从实际界面上看还有两个残留问题：右侧滚动条过粗、存在感太强；线程终端区域没有与 composer 共享相同的最大内容宽度，导致右侧视觉边界超过输入框。

## Optimized Task Brief

- **Outcome**: embedded TUI 的可视内容区与 composer 使用同一内容宽度，滚动条细化为更轻量的辅助元素
- **Problem**: 当前 TUI 区域相对 composer 过宽，滚动条在亮色主题下显得厚重且割裂
- **Scope**:
  - 为线程页 TUI 与 GUI 内容面板引入统一宽度约束
  - 为 embedded xterm viewport 定制更细的滚动条
  - 增加低耦合回归断言，覆盖新的布局锚点
- **Non-goals**:
  - 不改全局滚动条宽度
  - 不改 xterm 的列数计算策略
  - 不改 composer 自身视觉结构
- **Constraints**:
  - 线程页 TUI 仍然必须是真实 PTY + xterm 渲染
  - 不破坏已有亮色/暗色 embedded 主题
  - 终端与输入框要保持同一中心线与最大宽度
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-home.tsx`
  - `apps/desktop/src/renderer/src/styles/globals.css`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `npm run typecheck` in `apps/desktop`
  - `npm test -- --run src/renderer/src/test/shell.smoke.test.tsx src/renderer/src/test/terminal-panel.test.tsx`
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-desktop-tui-embedded-width-and-scrollbar-polish.md
  - docs/PLANS.md
- **Open assumptions**:
  - 线程页内容宽度以现有 composer 的 `920px` 作为统一基准是可接受的

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

- 过度收窄 viewport 或强行隐藏滚动行为可能影响长输出可浏览性，因此仅做样式细化和容器宽度对齐，不动滚动能力本身
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | 线程页 TUI/GUI 内容区统一收束到与 composer 相同的 `920px` 最大宽度 | 截图显示终端右边界超出输入框，问题本质是上下两个面板没有共享同一内容宽度约束 |
| 2026-04-07 | 仅为 embedded xterm viewport 定制 4px 轻量滚动条，不调整全局滚动条策略 | 用户反馈集中在线程 TUI，局部处理风险更低，也不会误伤其他滚动区域 |
| 2026-04-07 | 增加 `data-thread-surface` 布局锚点供 smoke test 验证内容宽度容器存在 | 为宽度对齐提供低耦合回归保护，避免未来重构再次让 TUI 面板超出 composer |

## Validation Log

- `2026-04-07` `python3 scripts/check_harness.py` -> pass
- `2026-04-07` `npm run typecheck` (cwd `apps/desktop`) -> pass
- `2026-04-07` `npm test -- --run src/renderer/src/test/shell.smoke.test.tsx src/renderer/src/test/terminal-panel.test.tsx` (cwd `apps/desktop`) -> pass, 26 tests passed

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
