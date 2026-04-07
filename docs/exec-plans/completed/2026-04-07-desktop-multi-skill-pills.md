> ✅ Completed: 2026-04-07
> Summary: 完成桌面端多 skill pill 支持与尺寸收敛
> Duration: same session
> Key learnings: 多 skill 继续使用“展示 pill、发送时拼接 slash 文本”的模型，比在 textarea 内实现局部富文本更稳定，也更容易扩展。

# desktop multi skill pills

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: 调整桌面端已选 skill pill 的尺寸，并让 composer 支持连续选择多个 skill。
- **Scope**: 仅覆盖 workspace composer 中已选 skill pill 的视觉尺寸、多 skill 状态管理、发送拼接行为与测试。
- **Non-goals**: 不扩展新的 slash 分类；不重做整体 suggestion 面板；不改动 CLI slash 能力。
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-07-desktop-multi-skill-pills.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

当前桌面端 composer 已支持 slash skill suggestion 和单个 skill pill，但 pill 字号与高度明显大于正文，且状态模型使用单值 `selectedSkillPill`，导致选中一个 skill 后无法再次输入 `/` 唤起更多 skill。用户明确要求 pill 视觉与正文保持同级，并支持多个 skill。

## Optimized Task Brief

- **Outcome**: 已选 skill pill 的字号、内边距和高度回落到与普通输入文本接近；输入区支持多个 skill pill；再次输入 `/` 可以继续选择 skill；发送时保持 `/<skill-a> /<skill-b> 正文` 的真实文本语义。
- **Problem**: 当前 single-pill 状态阻断了后续 slash 选择，且 pill 视觉过大，破坏输入区层级。
- **Scope**:
  - 将单个 skill 状态提升为数组
  - 允许在已有 pill 的情况下再次输入 `/` 继续选择 skill
  - 调整 pill 字号、高度和图标尺寸
  - 保持 Backspace 空输入时删除最后一个 pill
  - 更新 smoke test 覆盖多 skill
- **Non-goals**:
  - 不实现 pill 拖拽排序
  - 不实现 pill 内编辑
  - 不改动 slash suggestion 的匹配算法
- **Constraints**:
  - 展示态与发送态允许分离，但发送文本必须保持正确
  - 不回滚工作区已有脏改动
  - 编辑使用 `apply_patch`
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run --cwd apps/desktop test -- shell.smoke.test.tsx`
  - `bun run desktop:typecheck`
- **Docs to sync**:
  - docs/exec-plans/completed/2026-04-07-desktop-multi-skill-pills.md
  - docs/PLANS.md
- **Open assumptions**:
  - 多 skill 的发送顺序按 pill 出现顺序拼接
  - Backspace 在正文为空时删除最后一个 pill，符合 token 输入常见行为

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

- 多 pill 布局可能影响现有 textarea 高度自适应
- 状态从单值升级为数组后，若发送拼接顺序错误会造成 UI 与提交语义不一致
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | 多 skill 继续沿用“展示态与发送态分离”模型 | 无需引入富文本编辑器即可支持多个 token，并保持发送文本可控 |
| 2026-04-07 | Backspace 空输入时只移除最后一个 pill | 与常见 token 输入体验一致，且最小改动即可支持多 skill |

## Validation Log

- `python3 scripts/check_harness.py` ✅
- 已确认当前回归点集中在单值 skill 状态与 pill 尺寸，不需要新增桥接层 ✅
- `bun run --cwd apps/desktop test -- shell.smoke.test.tsx` ✅
- `bun run desktop:typecheck` ✅
- 验证点：pill 字号回到正文级别；再次输入 `/` 可继续选择 skill；发送按 pill 顺序拼接多个 slash skills ✅

## Archive Notes

- 完成后归档到 `docs/exec-plans/completed/`
- 结果摘要：桌面端 composer 已支持多个 skill pill，并将 pill 尺寸压回正文层级
