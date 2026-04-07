> ✅ Completed: 2026-04-07
> Summary: Compacted the header mode toggle and introduced a dedicated light embedded terminal theme for thread TUI.
> Duration: TBD
> Key learnings: TBD

# desktop tui compact light theme polish

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: 让线程页顶部模式切换更紧凑，并让 embedded TUI 在亮色主题下具备明确的亮色终端配色
- **Scope**: 顶栏 `GUI/TUI` 切换器尺寸、embedded xterm 主题与背景覆盖、相关回归测试
- **Non-goals**: 不改 thread TUI 的 PTY/CLI 链路，不重做底部 shell 终端视觉，不引入新的 GUI 聊天页面
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-07-desktop-tui-compact-light-theme-polish.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

上一轮已经把线程 TUI 变成无外壳嵌入式终端，但仍有两个明显视觉问题：顶栏中的 `GUI/TUI` 切换器相对右侧图标过大；亮色主题下 embedded xterm 仍表现出暗色终端观感，和页面背景割裂。

## Optimized Task Brief

- **Outcome**: 顶栏切换器缩到与标题栏控件同一视觉等级，线程页 embedded TUI 在亮色主题下使用清晰可读的亮色终端配色
- **Problem**: 当前切换器体量偏重，embedded TUI 仍残留暗色终端视觉，破坏亮色主题的一体感
- **Scope**:
  - 缩小 `ThreadModeToggle` 的容器、按钮尺寸与阴影强度
  - 为 embedded TUI 增加独立于 docked shell 的主题色板
  - 修正 xterm 内部黑底元素覆盖，确保亮色主题不再出现黑色面板
  - 补充单测，覆盖 embedded 主题初始化与现有 smoke 路径
- **Non-goals**:
  - 不改 CLI 输出内容与 ANSI 语义
  - 不更换终端渲染库
  - 不影响底部 docked shell 的深色终端样式
- **Constraints**:
  - 线程页 TUI 必须继续使用真实 PTY + CLI 会话
  - 亮色与暗色主题都必须保持可读
  - 不回退上一轮关于顶栏位置与无外壳 embedded 终端的设计决策
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/thread-mode-toggle.tsx`
  - `apps/desktop/src/renderer/src/components/terminal/terminal-panel.tsx`
  - `apps/desktop/src/renderer/src/styles/globals.css`
  - `apps/desktop/src/renderer/src/test/terminal-panel.test.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `npm run typecheck` in `apps/desktop`
  - `npm test -- --run src/renderer/src/test/shell.smoke.test.tsx src/renderer/src/test/terminal-panel.test.tsx`
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-desktop-tui-compact-light-theme-polish.md
  - docs/PLANS.md
- **Open assumptions**:
  - 允许 embedded TUI 在亮色主题下使用独立 ANSI 调色板，而不是沿用底部 shell 的深色 palette

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

- embedded 终端主题切换逻辑同时影响首次初始化和主题切换监听，若处理不完整会产生首帧闪黑或主题切换后颜色不一致
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | 将顶栏 `GUI/TUI` 切换器压缩为更接近标题栏控件尺度的 segmented control | 用户反馈当前体量相对右侧图标过大，影响标题栏视觉层级 |
| 2026-04-07 | 为 embedded 终端引入独立主题变量组，而不是复用 docked shell 的深色终端变量 | 线程页 embedded TUI 与底部 shell 的视觉目标不同，直接复用深色 palette 会导致亮色主题下仍显得像暗色终端 |
| 2026-04-07 | 在 xterm 构造阶段直接注入主题，并补上 `.xterm-scrollable-element` / `canvas` 的透明背景覆盖 | 避免首次挂载闪出默认黑底，同时修正上一版遗漏的黑色背景来源 |

## Validation Log

- `2026-04-07` `python3 scripts/check_harness.py` -> pass
- `2026-04-07` `npm run typecheck` (cwd `apps/desktop`) -> pass
- `2026-04-07` `npm test -- --run src/renderer/src/test/terminal-panel.test.tsx src/renderer/src/test/shell.smoke.test.tsx` (cwd `apps/desktop`) -> pass, 26 tests passed

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
