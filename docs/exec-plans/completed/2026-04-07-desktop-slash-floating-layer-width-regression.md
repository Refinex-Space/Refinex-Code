> ✅ Completed: 2026-04-07
> Summary: 修复 desktop slash 浮层宽度锚点回归，并让键盘高亮项滚动到面板中部。
> Duration: TBD
> Key learnings: TBD

# desktop slash floating layer width regression

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Severity**: Medium
- **Goal**: 修复 desktop `/` 浮层宽度与间距仍未达到预期，以及键盘上下选择时高亮项停留在面板底部的回归问题。
- **Impact**: slash 面板仍然偏离预期视觉基线，且键盘浏览建议项的可用性偏差明显。
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-07-desktop-slash-floating-layer-width-regression.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Symptom and Context

- **Expected**:
  - `/` 建议层和状态卡片应与整个下方输入组件外壳保持一致宽度，并保留轻微垂直间距
  - 使用上下键浏览建议项时，高亮项应尽量保持在面板中间区域
- **Observed**:
  - 当前浮层仍锚定在内层 `relative px-3 pt-1` 容器上，视觉宽度仍以内容区为基准
  - 当前滚动策略仍为 `scrollIntoView({ block: "nearest" })`，高亮项更容易贴近底边
- **Impact**:
  - slash 浮层视觉稳定性不足，键盘导航效率下降
- **Evidence**:
  - 用户复测后反馈“问题依旧存在”
  - 代码复核确认浮层 DOM 锚点和滚动策略都未命中真实根因

## Optimized Bug Brief

- **Reproduction**:
  - 在 desktop composer 输入 `/`，观察建议层与下方输入外壳的宽度关系
  - 连续按 `ArrowDown` 浏览建议项，观察高亮项更容易靠近列表底部
- **Likely surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Hypotheses**:
  - 根因 1：浮层锚点位于内层容器，导致统一 class 也只能统一到错误的宽度基线
  - 根因 2：`block: "nearest"` 只保证可见，不保证高亮项居中
- **Validation**:
  - `bun run desktop:typecheck`
  - `bun run desktop:test -- shell.smoke.test.tsx`
  - `python3 scripts/check_harness.py`
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-desktop-slash-floating-layer-width-regression.md
  - docs/PLANS.md

## Investigation and Repair Slices

### Slice 1 — Reproduce or bound the failure

- [x] Reproduce / collect evidence
- [x] Record findings

### Slice 2 — Isolate root cause

- [x] Isolate
- [x] Record findings

### Slice 3 — Repair, add regression protection, and verify

- [x] Repair
  - 将 slash 浮层的锚点容器从内层 `px-3` 区域上移到整个 composer 外壳
  - 保持浮层宽度与外壳一致，同时继续保留细微垂直间距
  - 将建议列表滚动策略从 `block: "nearest"` 调整为 `block: "center"`
- [x] Regression protection
  - 更新 smoke test，校验浮层真正挂在外层 `relative rounded-[28px]` composer shell 下
  - 新增键盘导航测试，直接断言 `scrollIntoView({ block: "center" })`
  - 为两条已有慢用例增加 10 秒超时，避免总时长触碰默认 5 秒阈值
- [x] Validate
  - `bun run desktop:typecheck`
  - `bun run desktop:test -- shell.smoke.test.tsx`
  - `python3 scripts/check_harness.py`

## Risks and Rollback

- 风险：
  - 若只改单个 class 而不调整锚点容器，宽度问题会继续存在
  - 若滚动策略改得过激，可能造成建议面板滚动抖动
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | 浮层锚点必须上移到 composer 外壳，而不是继续依赖内层内容容器 | 只有这样宽度基线才会真正与用户看到的输入组件外壳一致 |
| 2026-04-07 | 建议项滚动策略改为 `block: "center"` | `nearest` 只能保证可见，无法满足“当前选中项尽量处于面板中部”的预期 |

## Validation Log

- `2026-04-07`: `python3 scripts/check_harness.py` 通过
- `2026-04-07`: 已确认当前无其他 active plans，并创建 fix plan
- `2026-04-07`: 已确认浮层锚点位于内层 `relative px-3 pt-1` 容器
- `2026-04-07`: 已确认建议列表滚动逻辑为 `scrollIntoView({ block: "nearest" })`
- `2026-04-07`: `bun run desktop:typecheck` 通过
- `2026-04-07`: `bun run desktop:test -- shell.smoke.test.tsx` 通过，26/26 用例通过
- `2026-04-07`: 已验证浮层的真实锚点位于外层 `relative rounded-[28px]` composer shell，并验证键盘导航会触发 `scrollIntoView({ block: "center" })`

## Archive Notes

- Completion summary:
  - 修复 slash 浮层仍然偏窄的真实根因，宽度锚点改为 composer 外壳
  - 保留 slash 浮层与输入组件之间的细微统一间距
  - 修复键盘上下选择时高亮项贴底的问题，并增加直接覆盖滚动策略的测试
