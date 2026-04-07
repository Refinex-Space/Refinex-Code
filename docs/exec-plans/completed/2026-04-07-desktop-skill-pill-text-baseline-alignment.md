> ✅ Completed: 2026-04-07
> Summary: 完成桌面端 skill pill 与 placeholder 文本基线对齐修复
> Duration: same session
> Key learnings: 文本基线偏移除了 chip 尺寸外，还会来自输入容器的交叉轴对齐和 textarea 自身的顶部内边距；必须分开处理。

# desktop skill pill text baseline alignment

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: 修复桌面端 composer 中 skill pill 文本相对 placeholder 偏下的问题，让两者落在同一条水平线上。
- **Scope**: 仅覆盖 workspace composer 输入行的交叉轴对齐、skill pill 行高/高度样式与对应测试。
- **Non-goals**: 不改动多 skill 逻辑；不改 suggestion 匹配；不调整下方控制栏。
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-07-desktop-skill-pill-text-baseline-alignment.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

当前 skill pill 看起来仍比右侧 placeholder 更低。代码层面，输入行容器使用 `items-center`，会将整个 pill 盒子在最小高度内垂直居中；而 `textarea` 的 placeholder 文本是从顶部首行排版开始，所以两者天然不共用同一基线。

## Optimized Task Brief

- **Outcome**: skill pill 与 placeholder 文本在同一水平线，输入区首行视觉一体。
- **Problem**: 当前偏移来自容器交叉轴居中，而不仅是 pill 尺寸略大。
- **Scope**:
  - 将输入行容器从居中对齐改为顶部对齐
  - 将 pill 行高/高度调到与 textarea 首行一致
  - 更新 smoke test 断言
- **Non-goals**:
  - 不继续缩小正文字号
  - 不改动发送语义
  - 不引入新布局容器
- **Constraints**:
  - 必须修复真实根因，而不是只做表层缩放
  - 不回滚工作区已有脏改动
  - 编辑使用 `apply_patch`
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run --cwd apps/desktop test -- shell.smoke.test.tsx`
  - `bun run desktop:typecheck`
- **Docs to sync**:
  - docs/exec-plans/completed/2026-04-07-desktop-skill-pill-text-baseline-alignment.md
  - docs/PLANS.md
- **Open assumptions**:
  - textarea 首行节奏以 `py-1 + leading-6` 为准，pill 需要对齐到相同 24px 文本节奏

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

- 顶部对齐后若 pill 高度处理不当，可能造成多行 wrap 时行距过紧
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | 优先修复容器 `items-center` 带来的交叉轴偏移，而不是继续盲调 chip padding | 这是当前“pill 文本偏下”的真实布局根因 |

## Validation Log

- `python3 scripts/check_harness.py` ✅
- 已确认偏移根因来自输入行交叉轴对齐方式，而不是单纯字号问题 ✅
- `bun run --cwd apps/desktop test -- shell.smoke.test.tsx` ✅
- `bun run desktop:typecheck` ✅
- 验证点：输入行容器改为顶部对齐；pill 固定为 `h-6 + leading-6`；有 pill 时 textarea 改为 `py-0`；多 skill/发送逻辑无回归 ✅

## Archive Notes

- 完成后归档到 `docs/exec-plans/completed/`
- 结果摘要：桌面端 skill pill 文本已与 placeholder 修正到同一基线
