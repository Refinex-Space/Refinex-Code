> ✅ Completed: 2026-04-07
> Summary: Moved GUI/TUI toggle into the header and removed embedded terminal chrome for thread TUI.
> Duration: TBD
> Key learnings: TBD

# desktop tui visual polish

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: 让桌面端线程页面的 TUI 模式在亮色主题下具备与整体应用一致的干净布局与视觉一体性
- **Scope**: 线程页顶部控件排布、GUI/TUI 切换位置、嵌入式 TUI 容器与终端主题样式、相关回归测试
- **Non-goals**: 不重做 CLI 内部 TUI 内容本身，不改 shell 模式底部终端的交互模型，不引入新的聊天 GUI 页面
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-07-desktop-tui-visual-polish.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

桌面端线程页已经能在右侧主面板正常嵌入真实 CLI TUI，但当前布局与视觉仍停留在“功能打通”阶段：模式切换单独占一行，嵌入式 TUI 仍保留黑底卡片、边框、标题条和终端外壳，破坏亮色主题的一体感。

## Optimized Task Brief

- **Outcome**: GUI/TUI 切换进入顶栏同排居中位置，嵌入式 TUI 去掉多余终端卡片外壳，只保留干净的终端内容展示
- **Problem**: 当前线程页的 TUI 模式在视觉上像独立黑色终端窗口塞进页面中，和应用整体语言割裂
- **Scope**:
  - 顶栏内引入线程模式切换组件
  - 线程页移除独占一行的切换器区域
  - 嵌入式 `TerminalPanel` 去标题条、去边框、去黑色容器背景
  - 让嵌入式终端的默认背景/前景跟随页面主题，而不是固定深色终端皮肤
- **Non-goals**:
  - 不重构工作区侧栏或设置页布局
  - 不改 CLI 输出内容、排版逻辑或 ANSI 文本本身
  - 不改变底部 `shell` 终端的视觉样式
- **Constraints**:
  - 保持线程 TUI 仍然是真实 PTY + CLI，不替换成伪造富文本
  - 保持线程页发送逻辑和会话复用逻辑不变
  - 亮色与暗色主题都必须可读
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/app/layout.tsx`
  - `apps/desktop/src/renderer/src/components/workspace/workspace-home.tsx`
  - `apps/desktop/src/renderer/src/components/terminal/terminal-panel.tsx`
  - `apps/desktop/src/renderer/src/styles/globals.css`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
  - `apps/desktop/src/renderer/src/test/terminal-panel.test.tsx`
- **Validation**:
  - `npm run typecheck` in `apps/desktop`
  - `npm test -- --run src/renderer/src/test/shell.smoke.test.tsx src/renderer/src/test/terminal-panel.test.tsx`
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-desktop-tui-visual-polish.md
  - docs/PLANS.md
- **Open assumptions**:
  - 顶栏中轴在工作区页面出现模式切换器是可接受的，不需要在 skills/settings 视图显示

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

- 风险主要在终端主题切换与嵌入式容器 CSS，可能影响 shell 模式或暗色主题可读性
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | 将 `GUI/TUI` 切换器抽成独立组件并移入顶栏中轴，仅在 workspace 主视图显示 | 满足“与顶部图标同排但居中”的布局目标，同时避免 settings/skills 视图出现无意义控件 |
| 2026-04-07 | 为 `TerminalPanel` 增加 `chrome="embedded"` 的无外壳渲染路径，保留 `docked` 样式不变 | 线程 TUI 需要融入页面视觉，底部 shell 终端仍需要传统终端 chrome |
| 2026-04-07 | 嵌入式 xterm 主题改为透明背景并继承页面前景色，而不是沿用固定深色终端背景 | 避免亮色主题下出现黑色终端块，保证内容仍由真实 PTY 驱动 |
| 2026-04-07 | 将 smoke test 从旧 subtitle 路径文本断言改为验证顶栏模式切换与 composer 初始禁用态 | 旧断言依赖已被有意删除的 terminal chrome，继续保留会制造假回归 |

## Validation Log

- `2026-04-07` `python3 scripts/check_harness.py` -> pass
- `2026-04-07` `npm run typecheck` (cwd `apps/desktop`) -> pass
- `2026-04-07` `npm test -- --run src/renderer/src/test/shell.smoke.test.tsx src/renderer/src/test/terminal-panel.test.tsx` (cwd `apps/desktop`) -> pass, 25 tests passed
- `2026-04-07` 更新 `docs/PLANS.md` 并准备归档当前计划

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
