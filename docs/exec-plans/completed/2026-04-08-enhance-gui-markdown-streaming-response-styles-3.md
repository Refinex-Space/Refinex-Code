> ✅ Completed: 2026-04-08
> Summary: Archive requested by user
> Duration: TBD
> Key learnings: TBD

# enhance gui markdown streaming response styles

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-08
- **Goal**: 优化 GUI 面板 AI 响应样式，支持可感知流式输出、Markdown（表格/有序与无序列表）渲染与 Thinking 状态
- **Scope**: desktop renderer 会话展示组件、样式表和相关 smoke 用例
- **Non-goals**: 暂不覆盖工具调用、联网响应样式与主进程协议改造
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-08-enhance-gui-markdown-streaming-response-styles.md`

## Harness Preflight

- **Repo check**: available with findings
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

Preflight finding:
- [P1] missing-local-agent: `apps/desktop/AGENTS.md` 缺失（已在 tech debt 记录，不阻塞本次 UI 增强）

## Background

当前 GUI 响应展示为纯文本，缺少 Markdown 结构化渲染；pending 态只有静态文案，缺少明显 Thinking 动效；响应落地是整段替换，缺少面向用户的流式观感。
后续验证发现 Markdown 的 `ul/ol` 结构已输出，但由于未显式恢复 `list-style-type`，列表符号与序号不可见。

## Optimized Task Brief

- **Outcome**: AI 回答支持 Markdown 基本块级渲染，发送后先显示 Thinking 态，再以渐进方式展示最终回答
- **Problem**: 纯文本输出难以呈现列表/表格结构，pending 状态反馈弱，回答呈现缺少流式体验
- **Scope**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-conversation.tsx`
  - `apps/desktop/src/renderer/src/styles/globals.css`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Non-goals**:
  - 不修改 `main` 层 GUI IPC 协议
  - 不引入工具调用、联网态样式
- **Constraints**:
  - 复用项目已有 markdown 方案（`marked` + `xss`）
  - 保持现有 GUI/TUI 行为与数据结构兼容
- **Affected surfaces**:
  - assistant 消息渲染路径
  - pending/Thinking 可视反馈
  - markdown 基础样式（表格、列表、代码块）
- **Validation**:
  - `apps/desktop` smoke 测试通过
  - 新增断言覆盖 Thinking 与 markdown 表格渲染
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-08-enhance-gui-markdown-streaming-response-styles.md
  - docs/PLANS.md
  - docs/generated/harness-manifest.md
- **Open assumptions**:
  - 当前阶段“流式输出”采用前端渐进展示实现，主进程仍返回一次性完整文本

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
- [ ] Archive the active plan and refresh Harness generated surfaces

## Risks and Rollback

- 风险: HTML 注入或 markdown 渲染带来样式污染。
- 缓解: 使用 `xss` 白名单过滤并限定 `.gui-markdown` 局部样式作用域。
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-08 | 复用 `marked + xss` 而非新增 markdown 渲染库 | 与现有 skills 预览方案一致，降低引入成本 |
| 2026-04-08 | 采用 renderer 端渐进展示模拟流式观感 | 不改 main IPC 协议即可满足本阶段体验目标 |
| 2026-04-08 | 列表样式问题归因于 CSS reset 后未显式恢复 `ul/ol` 的 list-style-type | 结构化 HTML 正常，问题仅在展示层 |

## Validation Log

- 2026-04-08: `python3 scripts/check_harness.py` 返回 P1（`apps/desktop/AGENTS.md` 缺失）
- 2026-04-08: `cd apps/desktop && bun run test src/renderer/src/test/shell.smoke.test.tsx` 通过（28 passed，覆盖 Thinking + markdown table 渲染断言）
- 2026-04-08: `cd apps/desktop && bun run typecheck` 通过（tsc --noEmit）
- 2026-04-08: `cd apps/desktop && bun run test src/renderer/src/test/shell.smoke.test.tsx` 再次通过（28 passed，新增 `ul/ol` list-styleType 断言）

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
- Confirm the plan moved into `docs/exec-plans/completed/` after archiving
- If `docs/generated/harness-manifest.md` exists, confirm it was refreshed after archiving
