> ✅ Completed: 2026-04-07
> Summary: 统一 desktop slash 建议层与状态卡片的宽度基线和细微浮层间距，并补充样式断言测试。
> Duration: TBD
> Key learnings: TBD

# desktop slash floating layer width and gap

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: 优化 desktop 右侧输入框 `/` 唤起的建议层与状态卡片，让它们在视觉宽度上与下方输入组件保持一致，并在所有浮层与输入组件之间保留统一的细微间距。
- **Scope**:
  - 调整 `workspace-composer.tsx` 中 slash suggestions 和 status preview card 的定位与间距
  - 如有必要，更新 smoke test 断言以覆盖新的统一样式约束
- **Non-goals**:
  - 不重做卡片内容、关闭行为或命令语义
  - 不改动 skill pill / review pill 的输入框内部布局
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-07-desktop-slash-floating-layer-width-and-gap.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

上一轮 `/status`、`/stats`、`/usage` 已经作为 hover card 接入 desktop composer，但浮层使用了相对容器内的二次水平 inset，导致视觉宽度比下方输入区更窄。同时建议层和卡片虽然都有 `mb-*`，但没有被统一成一套稳定的浮层偏移规则，容易出现细微不一致。

## Optimized Task Brief

- **Outcome**:
  - `/` 建议层与状态卡片在宽度上与下方输入组件保持一致
  - 所有 `/` 浮层在输入组件上方保持统一的细微间距
- **Problem**:
  - 当前 slash 浮层额外使用了水平 inset，导致卡片和建议层比输入区更窄
  - 浮层和输入组件之间的间距没有作为统一视觉约束显式建模
- **Scope**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Non-goals**:
  - 不新增新的 slash 命令类别
  - 不调整 hover card 的文案结构和数据来源
- **Constraints**:
  - 建议层与状态卡片必须共享同一套水平定位与垂直偏移基线
  - 不能破坏现有 outside click / close button / keyboard 行为
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run desktop:typecheck`
  - `bun run desktop:test -- shell.smoke.test.tsx`
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-desktop-slash-floating-layer-width-and-gap.md
  - docs/PLANS.md
- **Open assumptions**:
  - 用 class 级别约束宽度和间距足以稳定当前 desktop composer 的 slash 浮层布局

## Incremental Slices

### Slice 1 — Establish context and the smallest viable change

- [x] Implement
  - 跑 harness preflight
  - 创建 active plan
  - 确认 slash suggestions 与 status preview card 的定位实现点
- [x] Validate
  - `python3 scripts/check_harness.py`
  - `docs/PLANS.md` 已同步 active entry

### Slice 2 — Deliver the core implementation

- [x] Implement
  - 为 slash suggestions 与 status preview card 抽取统一的浮层定位 class
  - 去掉额外的水平 inset，让两类浮层与下方输入组件共享同一宽度基线
  - 把浮层和输入组件之间的细微间距统一为同一处 `mb-1.5`
- [x] Validate
  - 在 smoke test 中断言建议层和状态卡片共享 `inset-x-0` 与 `mb-1.5`
  - 确认现有 slash 行为和关闭行为未回归

### Slice 3 — Documentation, observability, and finish-up

- [x] Sync docs and generated surfaces
  - 回填 validation log、decision log、archive notes
- [x] Final validation
  - 跑 desktop 校验与 harness check
  - 归档 active plan

## Risks and Rollback

- 风险：
  - 若只改单一浮层而不统一另一层，slash 建议层和状态卡片会继续出现宽度不一致
  - 若水平定位基线选错，可能让浮层与输入控件错位或压到圆角边距
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | slash suggestions 与状态卡片共享同一个浮层定位 class | 避免后续再出现一层改宽、另一层遗留旧 inset 的漂移 |
| 2026-04-07 | 浮层与输入区之间的间距统一为 `mb-1.5` | 用户要求的是细微间距，`0.375rem` 比此前 `0.5rem` 更紧凑且更稳定 |

## Validation Log

- `2026-04-07`: `python3 scripts/check_harness.py` 通过
- `2026-04-07`: 已确认当前 active plan 为 `docs/exec-plans/active/2026-04-07-desktop-slash-floating-layer-width-and-gap.md`
- `2026-04-07`: `bun run desktop:typecheck` 通过
- `2026-04-07`: `bun run desktop:test -- shell.smoke.test.tsx` 通过，25/25 用例通过
- `2026-04-07`: 已验证 slash 建议层与状态卡片都带有 `inset-x-0` 和 `mb-1.5`，宽度和垂直偏移规则一致

## Archive Notes

- Completion summary:
  - slash suggestions 与状态卡片现在与输入组件共享同一宽度基线
  - `/` 唤起的浮层与输入组件之间保留统一细微间距
  - smoke test 已增加对应 class 断言，避免后续视觉规则回漂
