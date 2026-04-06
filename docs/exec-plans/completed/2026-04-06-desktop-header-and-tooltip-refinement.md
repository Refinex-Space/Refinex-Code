> ✅ Completed: 2026-04-06
> Summary: Refined the desktop chrome by moving the sidebar toggle next to the macOS traffic lights, removing redundant header project info and the Open Project CTA, and standardizing icon hover help on the shared tooltip component.
> Duration: 2026-04-06 single session
> Key learnings: Top bar clarity improves when project identity stays in the workspace and navigation layer rather than repeating in the window chrome.; A shared tooltip wrapper keeps icon affordances consistent across header and sidebar.; Preparing a thread instead of creating it immediately keeps the sidebar aligned with the later message-first session model.

# 桌面端顶部栏与 Tooltip 收敛

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: 收敛桌面端顶部栏与侧边栏交互：把展开折叠入口移到红绿灯右侧，去掉 Header 左侧项目信息和右侧 Open Project 入口，并统一使用 ui/tooltip.tsx 做图标提示。
- **Scope**: 调整 Header 左右结构；移动侧栏折叠按钮；为终端、命令面板、主题切换和侧栏图标接入统一 Tooltip；去掉冗余项目信息和 Open Project 按钮。
- **Non-goals**: 不修改 WorkTree/Session 数据模型，不实现右侧消息发起流程，不调整主内容区业务信息块。
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-06-desktop-header-and-tooltip-refinement.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

当前顶部栏和侧边栏入口位置分散，Header 信息密度偏高，tooltip 也未在所有图标入口上统一，影响工作台布局的一致性。

## Optimized Task Brief

- **Outcome**: 收敛桌面端顶部栏与侧边栏交互：把展开折叠入口移到红绿灯右侧，去掉 Header 左侧项目信息和右侧 Open Project 入口，并统一使用 ui/tooltip.tsx 做图标提示。
- **Problem**: 当前顶部栏和侧边栏入口位置分散，Header 信息密度偏高，tooltip 也未在所有图标入口上统一，影响工作台布局的一致性。
- **Scope**: 调整 Header 左右结构；移动侧栏折叠按钮；为终端、命令面板、主题切换和侧栏图标接入统一 Tooltip；去掉冗余项目信息和 Open Project 按钮。
- **Non-goals**: 不修改 WorkTree/Session 数据模型，不实现右侧消息发起流程，不调整主内容区业务信息块。
- **Constraints**:
  - exec-plan 文件名必须带日期前缀。
  - Tooltip 统一使用 apps/desktop/src/renderer/src/components/ui/tooltip.tsx。
  - 布局改动应保持当前桌面端 typecheck/test/build 通过。
- **Affected surfaces**:
  - apps/desktop/src/renderer/src/app/layout.tsx
  - apps/desktop/src/renderer/src/components/sidebar/workspace-sidebar.tsx
  - apps/desktop/src/renderer/src/components/ui/tooltip.tsx 与相关 tests
- **Validation**:
  - 桌面端 typecheck/test/build 通过
  - 侧边栏折叠按钮位于红绿灯右侧
  - Header 左侧不再展示项目名和路径，右侧不再展示 Open Project 按钮
- **Docs to sync**:
  - docs/exec-plans/completed/2026-04-06-desktop-header-and-tooltip-refinement.md
  - docs/PLANS.md
- **Open assumptions**:
  - TBD

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

  - 若拖拽区和 no-drag 区域处理不当，可能影响 macOS 标题栏点击与拖拽。
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | 将侧栏折叠按钮移到红绿灯右侧，Header 左侧不再承载项目名与路径 | 顶部栏应只承担窗口级工具，而不是重复展示工作区信息 |
| 2026-04-06 | Header 右侧只保留终端、命令面板、主题切换图标，不再保留 Open Project CTA | 打开项目属于导航层入口，放在侧栏更一致 |
| 2026-04-06 | 所有图标提示统一接入 `components/ui/tooltip.tsx` | 避免同一界面出现多套 hover 提示实现 |
| 2026-04-06 | “新线程”只进入 prepare 状态，不直接落实际 session 文件 | 真实线程应在用户首次有效消息发起时创建，符合当前产品阶段边界 |

## Validation Log

- `python3 scripts/check_harness.py` -> OK: True
- `bun run desktop:typecheck` -> 通过
- `bun run desktop:test` -> 通过
- `bun run desktop:build` -> 通过

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
