> ✅ Completed: 2026-04-07
> Summary: 收敛 desktop /status、/stats、/usage 卡片的噪音文案，只保留克制的状态信息展示。
> Duration: TBD
> Key learnings: TBD

# desktop slash status cards refinement

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: 收敛 desktop `/status`、`/stats`、`/usage` 状态卡片的信息密度，去掉低价值解释性文案，保留更克制、更优雅的状态展示。
- **Scope**:
  - 调整 `workspace-composer.tsx` 中 status preview card 的数据结构与渲染层级
  - 优化三张状态卡片的标签文案与视觉层次
  - 更新 smoke test，覆盖噪音文案移除后的核心展示
- **Non-goals**:
  - 不改动 slash 建议面板的分组和命令筛选行为
  - 不接入新的 runtime 数据源或后端 bridge
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-07-desktop-slash-status-cards-refinement.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

当前三张状态卡片虽然功能上可用，但仍保留了过多“解释自己是什么”的辅助文字，例如 CLI 对齐说明、入口语义说明、关闭方式提示。这些文案会稀释真正重要的状态信息，也让卡片显得不够克制。

## Optimized Task Brief

- **Outcome**:
  - `/status`、`/stats`、`/usage` 只展示用户真正关心的状态值
  - 卡片头部和信息网格更紧凑，视觉更克制
- **Problem**:
  - 当前卡片把解释性文案和状态数据混在一起，用户扫一眼时会被无意义文本干扰
  - 关闭提示等一次性指导信息不该长期占用主要信息区
- **Scope**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Non-goals**:
  - 不改变关闭按钮、点击外部关闭、继续输入关闭等已有交互
  - 不修改 slash cards 的宽度、间距与键盘居中滚动逻辑
- **Constraints**:
  - 三张状态卡片都要遵循同一套收敛后的视觉结构
  - 删除解释性文案后，剩余标签仍要足以表达当前状态
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run desktop:typecheck`
  - `bun run desktop:test -- shell.smoke.test.tsx`
  - `python3 scripts/check_harness.py`
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-desktop-slash-status-cards-refinement.md
  - docs/PLANS.md
- **Open assumptions**:
  - 用更简洁的标签和纯状态网格，就能显著改善这三张卡片的视觉体验

## Incremental Slices

### Slice 1 — Establish context and the smallest viable change

- [x] Implement
  - 跑 harness preflight
  - 创建 active plan
  - 复核当前状态卡片的文案来源与渲染结构
- [x] Validate
  - `python3 scripts/check_harness.py`
  - `docs/PLANS.md` 已同步 active entry

### Slice 2 — Deliver the core implementation

- [x] Implement
  - 移除三张状态卡片的 `description`、`footnote` 和底部关闭提示
  - 把头部收敛为命令 chip + 标题 + 关闭按钮
  - 优化 `/usage`、`/stats` 的字段标签，让卡片只保留直接可读的状态信息
- [x] Validate
  - 更新 smoke test，断言 `/status` 卡片不再出现旧的解释性文案
  - 同步修正 `/usage` 卡片标题断言

### Slice 3 — Documentation, observability, and finish-up

- [x] Sync docs and generated surfaces
  - 回填 validation log、decision log、archive notes
- [x] Final validation
  - 跑 desktop 校验与 harness check
  - 归档 active plan

## Risks and Rollback

- 风险：
  - 若删掉解释文案却不收紧结构，卡片可能看起来只是“信息少了”，而不是“更优雅了”
  - 若标签过度简写，用户可能反而不清楚状态字段含义
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | 状态卡片只保留命令标识、标题、关闭动作和状态网格 | 用户关心的是当前状态，不关心卡片自我解释 |
| 2026-04-07 | `/usage` 标题改为“额度与账户概览”，并把边界信息压缩为字段值 | 比长段落说明更直接，也更符合这张卡片的浏览方式 |

## Validation Log

- `2026-04-07`: `python3 scripts/check_harness.py` 通过
- `2026-04-07`: 已创建 active plan 并同步到 `docs/PLANS.md`
- `2026-04-07`: 已确认当前卡片噪音主要来自 `description`、`footnote` 与底部关闭提示三层解释文案
- `2026-04-07`: `bun run desktop:typecheck` 通过
- `2026-04-07`: `bun run desktop:test -- shell.smoke.test.tsx` 通过，26/26 用例通过
- `2026-04-07`: 已验证 `/status` 卡片不再出现旧的 CLI 对齐说明、入口说明和关闭提示

## Archive Notes

- Completion summary:
  - `/status`、`/stats`、`/usage` 卡片移除了低价值解释文案
  - 卡片头部与信息网格更克制，用户视线更聚焦在状态值本身
  - smoke test 已补充去噪后的核心展示断言
