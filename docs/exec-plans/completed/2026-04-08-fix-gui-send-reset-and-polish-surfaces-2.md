> ✅ Completed: 2026-04-08
> Summary: 修复 GUI 发送后输入框未即时清空的问题，增强 toggle/composer 玻璃质感，新增回到底部按钮，所有 smoke 测试通过
> Duration: TBD
> Key learnings: TBD

# fix gui send reset and polish surfaces

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-08
- **Severity**: Medium
- **Goal**: 修复 GUI 发送后输入框未即时清空的问题，并提升顶部模式切换与输入框的玻璃感/轻微立体质感，同时补充历史回到底部按钮
- **Impact**: 当前发送后的残留输入影响连续对话；顶部切换和输入框质感弱，影响整体 UI 完成度
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-08-fix-gui-send-reset-and-polish-surfaces.md`

## Harness Preflight

- **Repo check**: available with findings
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Symptom and Context

- **Expected**:
  - 点击发送或按回车后，输入框立即清空
  - GUI/TUI 切换具有更明显的透明毛玻璃质感
  - 输入框容器具有轻微立体感
  - 用户浏览历史时，输入框上方中间出现回到底部按钮
- **Observed**:
  - GUI 发送路径在请求完成后才清空输入框
  - 顶部 toggle 与 composer surface 视觉偏平，玻璃感不足
  - 历史浏览时没有快速回到底部的 affordance
- **Impact**:
  - 降低连续输入效率，弱化交互反馈和页面质感
- **Evidence**:
  - `workspace-composer.tsx` 中 GUI 分支在 `await onSendGuiMessage(...)` 后才执行 `applyValue("")`
  - 当前 toggle 仅有基础 blur/border，composer 外壳缺少微弱高光与层次阴影

## Optimized Bug Brief

- **Reproduction**:
  - 在 GUI 模式输入文本并发送，发送期间观察输入框内容仍保留
  - 查看聊天历史上滑后，无法一键快速回到底部
- **Likely surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/components/workspace/workspace-home.tsx`
  - `apps/desktop/src/renderer/src/components/workspace/thread-mode-toggle.tsx`
  - `apps/desktop/src/renderer/src/styles/globals.css`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Hypotheses**:
  - 输入框未清空的根因是 GUI 发送成功后才执行清空，未做 optimistic clear
  - 回到底部按钮需要绑定到 thread surface scroll state，而不是消息列内部
- **Validation**:
  - smoke 测试通过
  - 新增断言覆盖 GUI 发送后输入框立即为空与回到底部按钮出现/点击行为
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-08-fix-gui-send-reset-and-polish-surfaces.md
  - docs/PLANS.md
  - docs/generated/harness-manifest.md

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
- [ ] Archive the active plan and refresh Harness generated surfaces

## Risks and Rollback

- 风险: 发送失败时过早清空输入可能丢失草稿。
- 缓解: 采用 optimistic clear，失败时恢复原文本。
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-08 | 发送后立即清空并在失败时恢复原草稿 | 保证即时反馈且不丢用户输入 |
| 2026-04-08 | 回到底部按钮改为 composer 上方独立行布局 | 避免绝对定位层压进输入框内部，保证位置稳定 |

## Validation Log

- `workspace-composer.tsx`: GUI 发送改为 optimistic clear，并在发送失败时恢复原草稿
- `thread-mode-toggle.tsx`: 增强 toggle 容器与激活态的毛玻璃高光和阴影层次
- `workspace-composer.tsx`: 输入框外壳增加更柔和的玻璃感与轻微立体阴影
- `workspace-home.tsx`: 新增基于 thread surface 滚动状态的回到底部按钮，并调整为位于 composer 外部顶部的独立居中行
- `shell.smoke.test.tsx`: 增加 GUI 发送后输入框即时清空、回到底部按钮出现与点击滚动的断言
- Validation: `bun run --cwd apps/desktop vitest run src/renderer/src/test/shell.smoke.test.tsx`
- Validation: `bun run desktop:typecheck`

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
- Confirm the plan moved into `docs/exec-plans/completed/` after archiving
- If `docs/generated/harness-manifest.md` exists, confirm it was refreshed after archiving
