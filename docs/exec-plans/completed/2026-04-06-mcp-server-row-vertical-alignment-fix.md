> ✅ Completed: 2026-04-06
> Summary: 修复 MCP 列表行名称垂直对齐回归
> Duration: TBD
> Key learnings: TBD

# mcp server row vertical alignment fix

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Severity**: Low
- **Goal**: 修复 MCP 列表行在移除摘要后名称未垂直居中的对齐回归。
- **Impact**: 用户在设置页浏览 MCP 列表时会看到名称与右侧操作不在同一视觉中线，降低界面完成度。
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-06-mcp-server-row-vertical-alignment-fix.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Symptom and Context

- **Expected**: TBD
- **Observed**: `ServerRow` 左侧容器仍按含两行文本的布局使用 `items-start`，摘要移除后名称与 transport 标签整体偏上。
- **Impact**: MCP 列表行的主要信息未与开关区垂直对齐。
- **Evidence**:
  - 当前实现中 [mcp-settings-panel.tsx](/Users/refinex/develop/code/refinex/Refinex-Code/apps/desktop/src/renderer/src/components/settings/mcp-settings-panel.tsx) 的 `ServerRow` 左侧容器使用 `items-start`

## Optimized Bug Brief

- **Reproduction**:
  - 打开设置 -> `MCP 服务器`
  - 在已存在 MCP 列表中观察名称与右侧开关的垂直中线
- **Likely surfaces**:
  - `apps/desktop/src/renderer/src/components/settings/mcp-settings-panel.tsx`
- **Hypotheses**:
  - 删除 `summary` 后，左侧容器未同步改回单行内容所需的垂直居中布局
- **Validation**:
  - `bun run --cwd apps/desktop typecheck`
  - `bun run --cwd apps/desktop test`
- **Docs to sync**:
  - docs/exec-plans/active/mcp-server-row-vertical-alignment-fix.md
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

- 仅调整布局对齐，不改变任何 bridge、store 或保存逻辑
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | 仅将 `ServerRow` 左侧容器改为 `items-center` | 这是恢复单行内容垂直居中的最小修复，不引入额外布局副作用 |

## Validation Log

- 通过代码审查界定症状：摘要移除后单行内容仍使用 `items-start`
- `bun run --cwd apps/desktop typecheck` -> passed
- `bun run --cwd apps/desktop test` -> passed

## Archive Notes

- 完成时间：2026-04-06
- 完成摘要：修复 MCP 列表项在移除摘要后的名称垂直居中回归
- 关键收获：信息层级变更后，列表项的交叉轴对齐也需要同步回收
