# Desktop Web Search Source Array GUI Regression Test

**Execution Date**: 2026-04-09  
**Owner**: AI Assistant  
**Status**: Completed

## Bug Brief (Rewritten)

### Symptom
已出现过“显示有结果计数但展开无来源链接”的回归风险。

### Expected
当 `web_search` 工具结果是来源数组时，GUI 应稳定渲染可点击来源链接。

### Scope
- `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- `docs/PLANS.md`

### Validation
- `bun run desktop:test` 通过
- 新增测试在 GUI smoke 中稳定通过

## Slices
1. [x] Add GUI regression smoke case for `web_search` source arrays
2. [x] Run desktop tests and verify pass
3. [x] Archive plan and sync `docs/PLANS.md`

## Progress Log

### 2026-04-09 Completed
- Added regression in `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx` to assert `web_search` source arrays render as links end-to-end in GUI snapshot flow.
- Validation: `bun run desktop:test` -> 12/12 files, 67/67 tests passed.
