> ✅ Completed: 2026-04-06
> Summary: 完成 desktop composer 的 provider/model/effort 选择控件接入与验证
> Duration: TBD
> Key learnings: TBD

# desktop composer provider model effort controls

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: 在 desktop 右侧主面板底部输入框接入供应商、模型、推理强度三段选择控件
- **Scope**: desktop renderer composer 控件、共享 provider/model/effort catalog helper、renderer smoke test
- **Non-goals**: 不改动 CLI 命令实现，不把 composer 内的临时切换回写到全局 provider 设置文件
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/desktop-composer-provider-model-effort-controls.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

desktop 已有 provider settings bridge 与设置页，但 workspace composer 仍停留在 “模型选择 TODO” 占位，无法反映 CLI 里 `/provider`、`/model`、`/effort` 的基础选择语义。

## Optimized Task Brief

- **Outcome**: 右侧输入框新增供应商、模型、推理强度选择，默认值读取用户 provider 配置，切换后在当前 desktop UI 会话内生效
- **Problem**: 现有 desktop composer 无法展示或切换 provider/model/effort，和 CLI 行为脱节
- **Scope**: 共享 provider catalog helper、UI store composer state、workspace composer UI、renderer smoke test
- **Non-goals**: provider 全局保存、真实消息发送链路、CLI 命令层改造
- **Constraints**:
  - 保持和现有 desktop provider settings bridge 对齐
  - Anthropic 与 Codex 都要可选
  - 若模型不支持 effort，UI 要安全降级而非报错
- **Affected surfaces**:
  - `apps/desktop/src/shared/provider-settings.ts`
  - `apps/desktop/src/renderer/src/stores/ui.ts`
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/setup.ts`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run desktop:typecheck`
  - `bun run desktop:test`
  - `python3 scripts/check_harness.py`
- **Docs to sync**:
  - docs/exec-plans/active/desktop-composer-provider-model-effort-controls.md
  - docs/PLANS.md
- **Open assumptions**:
  - composer 内切换仅影响当前桌面 UI 状态，不回写用户配置文件

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

- 共享 catalog 若不收敛到 shared helper，composer 和 settings 面板后续会重复维护 provider/model 规则
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | composer 选择结果只保存在 desktop renderer 的会话态 | 用户要求默认读取配置但允许自行切换，输入框内切换不应意外污染全局 provider 设置 |
| 2026-04-06 | Anthropic 先提供 Sonnet 4.6 / Opus 4.6 / Haiku 4.5 三个稳定选项 | 与当前 CLI 可见主模型集合一致，满足首版 UI 选择需求 |
| 2026-04-06 | 不支持 effort 的模型在 UI 中禁用推理强度选择并显示“不支持” | 避免错误提交不兼容参数，同时保持状态转换稳定 |

## Validation Log

- `python3 scripts/check_harness.py` -> pass
- `bun run desktop:typecheck` -> pass
- `bun run desktop:test` -> pass

## Archive Notes

- 已归档到 `docs/exec-plans/completed/desktop-composer-provider-model-effort-controls.md`
