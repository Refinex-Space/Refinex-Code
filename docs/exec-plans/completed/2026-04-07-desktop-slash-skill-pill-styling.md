> ✅ Completed: 2026-04-07
> Summary: 完成桌面端 slash skill 分组标题、图标与已选 pill 输入态
> Duration: same session
> Key learnings: 将已选 skill 从纯文本 slash 前缀提升为独立 pill 状态，可以在不引入富文本编辑器的前提下实现更强的可感知性，同时保持发送语义稳定。

# desktop slash skill pill styling

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: 优化桌面端 slash skill 交互，补全“技能”分组标识、skill 图标，以及选中 skill 后的 pill 输入态。
- **Scope**: 仅覆盖桌面端 workspace composer 的 skill suggestion 视觉增强、已选 skill token 状态和回归测试。
- **Non-goals**: 不扩展其他 slash 分类；不引入富文本编辑器；不改动 CLI slash 逻辑。
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-07-desktop-slash-skill-pill-styling.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

上一轮已为桌面端主面板实现 slash skill 建议与键盘选择，但当前列表缺少分类标识，item 前没有 skill 图标，且选中后只是把 `/${skill.name} ` 作为纯文本回填，视觉层级不足，不利于后续扩展多类 slash entities。

## Optimized Task Brief

- **Outcome**: slash skill 面板顶部带有“技能”分组标题；每个 skill suggestion 带 `Package` 图标；选中 skill 后输入区以冷色 pill 呈现“图标 + 技能名称”，发送时仍能正确拼回 slash 文本。
- **Problem**: 当前 slash skill UX 只有可用性，没有实体化表达，无法支撑后续多分类建议，也不符合用户给出的视觉预期。
- **Scope**:
  - 为 suggestion 列表补充分组标题
  - 为 suggestion item 和已选 skill token 加入统一的 `Package` 图标
  - 将选中的 skill 从纯文本回填改为 composer 内的 pill 状态
  - 保证发送时仍使用 `/${skill.name} ` 语义
  - 补充 smoke test
- **Non-goals**:
  - 不实现其他 slash 分类
  - 不做 token 内可编辑富文本
  - 不做完整的 slash token 删除/拖拽/多选体系
- **Constraints**:
  - 保持发送链路与 CLI slash skill 文本语义一致
  - 不回滚工作区已有脏改动
  - 编辑使用 `apply_patch`
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run --cwd apps/desktop test -- shell.smoke.test.tsx`
  - `bun run desktop:typecheck`
- **Docs to sync**:
  - docs/exec-plans/completed/2026-04-07-desktop-slash-skill-pill-styling.md
  - docs/PLANS.md
- **Open assumptions**:
  - pill 状态只在通过 suggestion 选中 skill 后启用
  - 已选 skill 的正文输入仍使用普通 textarea，最终提交时在发送前拼接 skill slash 前缀

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

- textarea 与 pill 组合布局若处理不当，可能影响现有自适应高度和换行行为
- UI 状态与实际发送文本分离后，若拼接链路遗漏会产生展示与提交不一致
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | 选中 skill 后改为独立 pill 状态，而不是继续在 textarea 中保留 slash 纯文本 | textarea 无法做局部富文本，拆分状态才能稳定实现 chip 视觉且保持提交语义 |
| 2026-04-07 | suggestion 列表顶部显式展示“技能”分组标题 | 为后续接入其他 slash 分类预留统一分组结构 |

## Validation Log

- `python3 scripts/check_harness.py` ✅
- 已确认现有实现中 slash skill suggestion 与发送链路仍可复用 ✅
- `bun run --cwd apps/desktop test -- shell.smoke.test.tsx` ✅
- `bun run desktop:typecheck` ✅
- 验证点：skill 面板显示“技能”标题；skill item 与已选 token 带 `Package` 图标；发送时仍提交完整 slash 文本 ✅

## Archive Notes

- 完成后归档到 `docs/exec-plans/completed/`
- 结果摘要：桌面端 slash skill 建议列表已补齐分组标题和图标，已选 skill 改为 token 化输入态
