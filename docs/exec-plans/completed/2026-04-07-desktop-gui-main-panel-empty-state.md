> ✅ Completed: 2026-04-07
> Summary: 将 GUI 模式主面板从敬请期待占位块切回 WorkspaceEmptyState。
> Duration: TBD
> Key learnings: TBD

# desktop gui main panel empty state

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: 在 GUI 模式下让 workspace 主面板回退到现有 `WorkspaceEmptyState`，替代当前“敬请期待”占位块。
- **Scope**:
  - 调整 `workspace-home.tsx` 中 GUI 模式主面板分支
  - 更新 shell smoke test，验证 GUI 模式展示空状态而不是占位文案
- **Non-goals**:
  - 不实现真正的 GUI 对话界面
  - 不改动 TUI 主面板和底部 composer 的现有行为
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-07-desktop-gui-main-panel-empty-state.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

当前 `WorkspaceHome` 在存在 active worktree 和 active session 时，如果会话模式切到 GUI，会渲染一个“敬请期待”的卡片。但用户希望 GUI 主面板中部沿用此前已经存在的 `WorkspaceEmptyState`，保持更一致的产品入口。

## Optimized Task Brief

- **Outcome**:
  - GUI 模式主面板中部展示 `WorkspaceEmptyState`
  - 切换到 GUI 模式后不再出现“敬请期待”悬浮块
- **Problem**:
  - 当前 GUI 模式分支使用临时占位卡片，和既有空状态入口不一致
- **Scope**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-home.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Non-goals**:
  - 不重构 `WorkspaceEmptyState`
  - 不调整 GUI 模式的 tab、header 或 composer 控件
- **Constraints**:
  - GUI 模式替换必须复用现有 `WorkspaceEmptyState`，而不是复制一份新 UI
  - TUI 分支渲染和终端交互不能回归
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-home.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run desktop:typecheck`
  - `bun run desktop:test -- shell.smoke.test.tsx`
  - `python3 scripts/check_harness.py`
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-desktop-gui-main-panel-empty-state.md
  - docs/PLANS.md
- **Open assumptions**:
  - 当前 `WorkspaceEmptyState` 已经满足 GUI 模式中部主面板的预期入口体验

## Incremental Slices

### Slice 1 — Establish context and the smallest viable change

- [x] Implement
  - 跑 harness preflight
  - 创建 active plan
  - 复核 `workspace-home.tsx` 当前 GUI 模式渲染分支
- [x] Validate
  - `python3 scripts/check_harness.py`
  - `docs/PLANS.md` 已同步 active entry

### Slice 2 — Deliver the core implementation

- [x] Implement
  - 用现有 `WorkspaceEmptyState` 替换 GUI 模式下的“敬请期待”占位块
  - 保持 TUI 分支、主面板宽度和底部 composer 结构不变
- [x] Validate
  - smoke test 验证切换到 GUI 模式后显示“开始构建”而不是“敬请期待”
  - smoke test 验证当前项目选择入口仍然可见

### Slice 3 — Documentation, observability, and finish-up

- [x] Sync docs and generated surfaces
  - 回填 validation log、decision log、archive notes
- [x] Final validation
  - 跑 desktop 校验与 harness check
  - 归档 active plan

## Risks and Rollback

- 风险：
  - 若复制一份新空状态而不是复用现有组件，后续视觉和行为会再次分叉
  - 若误动 `showThreadSurface` 或 TUI 分支，可能影响当前线程终端加载
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | GUI 模式主面板直接复用 `WorkspaceEmptyState` | 用户明确要求回到此前入口，且复用现有组件比保留临时占位块更一致 |
| 2026-04-07 | 仅替换 GUI 分支内容，不触碰 `showThreadSurface` 条件和 TUI 分支 | 这是恢复预期的最小改动，能最大限度降低回归面 |

## Validation Log

- `2026-04-07`: `python3 scripts/check_harness.py` 通过
- `2026-04-07`: 已确认 GUI 模式占位块位于 `workspace-home.tsx` 的非 TUI 分支
- `2026-04-07`: `bun run desktop:typecheck` 通过
- `2026-04-07`: `bun run desktop:test -- shell.smoke.test.tsx` 通过，27/27 用例通过
- `2026-04-07`: 已验证切换到 GUI 模式后主面板显示“开始构建”与当前项目入口

## Archive Notes

- Completion summary:
  - GUI 模式主面板中部已回退为 `WorkspaceEmptyState`
  - “敬请期待”占位块已移除
  - smoke test 已覆盖 GUI 切换后的空状态展示
