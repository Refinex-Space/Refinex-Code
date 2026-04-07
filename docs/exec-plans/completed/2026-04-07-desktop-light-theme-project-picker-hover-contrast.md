> ✅ Completed: 2026-04-07
> Summary: 修复 GUI 空状态项目下拉在亮色主题中的 hover 对比度不足问题，并补充 smoke 覆盖
> Duration: TBD
> Key learnings: TBD

# desktop light theme project picker hover contrast

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Severity**: Low
- **Goal**: 修复 GUI 空状态下项目选择下拉在亮色主题中的 hover 对比度不足问题
- **Impact**: 亮色主题下项目切换与新增项目入口的悬停反馈不清晰，降低项目切换可发现性
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-07-desktop-light-theme-project-picker-hover-contrast.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Symptom and Context

- **Expected**: 亮色主题下，GUI 主面板项目名称触发的下拉菜单中，项目项与“添加新项目”在 hover 时应有清晰但克制的浅灰背景反馈
- **Observed**: 亮色主题下 hover 使用 `--color-surface`，与菜单面板背景过近，视觉上几乎看不到悬停态；暗色主题表现正常
- **Impact**: 用户在亮色主题下难以快速识别当前 hover 项，项目切换与新增入口交互反馈不足
- **Evidence**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-empty-state.tsx` 中项目项和“添加新项目”均使用 `hover:bg-[var(--color-surface)]`
  - `apps/desktop/src/renderer/src/styles/globals.css` 中亮色主题 `--color-panel: #ffffff`，`--color-surface: #f5f6f8`，对比度偏弱；`--color-sidebar-hover: #e8eaee` 更适合作为局部 hover 背景

## Optimized Bug Brief

- **Reproduction**:
  - 切换到 GUI 模式
  - 在空状态主面板点击项目名称打开项目选择菜单
  - 在亮色主题下将鼠标移动到项目项或“添加新项目”
- **Likely surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-empty-state.tsx`
  - `apps/desktop/src/renderer/src/styles/globals.css`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Hypotheses**:
  - 根因不是全局主题整体错误，而是该菜单局部复用了过浅的 `--color-surface` 作为 hover 背景 token
- **Validation**:
  - 项目列表非激活项与“添加新项目”统一改为更合适的 hover token
  - 增加 smoke test 断言新的 hover class
  - 运行 `bun run desktop:typecheck`
  - 运行 `bun run desktop:test -- shell.smoke.test.tsx`
  - 运行 `python3 scripts/check_harness.py`
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-desktop-light-theme-project-picker-hover-contrast.md
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
- [x] Regression protection
- [x] Validate

## Risks and Rollback

- 风险较低，仅调整 GUI 空状态项目下拉的局部 hover token；暗色主题 token 不变
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | 不调整全局 `--color-surface`，仅替换该菜单的 hover token | 避免影响其他依赖该变量的亮色主题界面 |
| 2026-04-07 | 亮色 hover 改用 `--color-sidebar-hover` | 相比 `--color-surface` 与白色面板对比更稳定，同时视觉仍克制 |

## Validation Log

- 修复：`apps/desktop/src/renderer/src/components/workspace/workspace-empty-state.tsx` 中项目列表非激活项与“添加新项目” hover 从 `--color-surface` 调整为 `--color-sidebar-hover`
- 回归保护：`apps/desktop/src/renderer/src/test/shell.smoke.test.tsx` 新增 GUI 项目下拉 hover token 断言
- `bun run desktop:typecheck` 通过
- `bun run desktop:test -- shell.smoke.test.tsx` 通过
- `python3 scripts/check_harness.py` 通过

## Archive Notes

- 结论：问题来自局部 hover token 选择不当，不需要调整全局亮色主题变量
