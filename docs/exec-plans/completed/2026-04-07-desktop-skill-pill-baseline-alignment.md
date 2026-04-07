> ✅ Completed: 2026-04-07
> Summary: 完成桌面端 skill pill 基线对齐与尺寸收紧
> Duration: same session
> Key learnings: 对齐问题主要由 chip 的竖向 padding 和内部留白造成，保持正文同字号而只收紧 `py/gap/icon` 是更稳妥的修正方式。

# desktop skill pill baseline alignment

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: 继续缩小桌面端 composer 中 skill pill 的垂直尺寸，让它和同一行的占位文案在视觉上严格对齐。
- **Scope**: 仅覆盖 workspace composer 中已选 skill pill 的 padding、图标尺寸和高度相关样式，以及对应测试断言。
- **Non-goals**: 不改动多 skill 交互；不改 suggestion 面板逻辑；不调整其他 composer 控件。
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-07-desktop-skill-pill-baseline-alignment.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

当前 skill pill 已支持多选，但垂直高度仍明显高于同一行的 placeholder 文案，原因主要来自 pill 自身的竖向 padding 和较大的内部留白。用户要求继续收紧，让 chip 与正文形成单一基线视觉。

## Optimized Task Brief

- **Outcome**: skill pill 的视觉高度进一步下降，与右侧 placeholder 文案更接近同一基线和同一节奏。
- **Problem**: 现有 pill 仍偏高，导致输入区首行在视觉上出现上下不齐。
- **Scope**:
  - 收紧 pill 的垂直 padding、左右留白和 icon 尺寸
  - 保持正文同字号
  - 更新 smoke test 断言新样式类
- **Non-goals**:
  - 不改 pill 颜色方案
  - 不改多 skill 拼接逻辑
  - 不引入新的布局容器
- **Constraints**:
  - 只做最小样式修正，不影响发送语义
  - 不回滚工作区已有脏改动
  - 编辑使用 `apply_patch`
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run --cwd apps/desktop test -- shell.smoke.test.tsx`
  - `bun run desktop:typecheck`
- **Docs to sync**:
  - docs/exec-plans/completed/2026-04-07-desktop-skill-pill-baseline-alignment.md
  - docs/PLANS.md
- **Open assumptions**:
  - pill 文本字号保持与正文一致，仅通过 padding / icon / line-height 解决过高问题

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

- 过度收紧 pill 可能造成文字与 icon 垂直拥挤
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | 保持 pill 与正文同字号，仅缩 padding、icon 和内部留白 | 用户要的是基线对齐，不是缩小文字可读性 |

## Validation Log

- `python3 scripts/check_harness.py` ✅
- 已确认本次是纯样式收敛，不涉及交互或桥接层变更 ✅
- `bun run --cwd apps/desktop test -- shell.smoke.test.tsx` ✅
- `bun run desktop:typecheck` ✅
- 验证点：skill pill 垂直 padding、gap、icon 尺寸进一步收紧，且多 skill/发送逻辑无回归 ✅

## Archive Notes

- 完成后归档到 `docs/exec-plans/completed/`
- 结果摘要：桌面端 skill pill 已进一步缩小并贴近 placeholder 基线
