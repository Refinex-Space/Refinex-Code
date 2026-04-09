# GUI Web Search Result Content Parser Fix

**Execution Date**: 2026-04-09  
**Owner**: AI Assistant  
**Status**: In Progress

## Bug Brief (Rewritten)

### Symptom
GUI 显示“(1 条结果)”但展开为“— 无结果 —”。

### Expected
web_search 工具返回来源数组时，GUI 应展示来源链接列表。

### Observed
主进程在解析 `tool_result` 时将 `content` 数组错误压平为字符串（仅拼接 `text` 字段），导致来源对象 `{title,url}` 被丢失。

### Impact
联网搜索实际成功但结果不可见，直接影响可用性与信任。

### Evidence
- `apps/desktop/src/main/index.ts` 中 `contentStr` 逻辑会把非 text 数组项变成空字符串
- `apps/desktop/src/renderer/src/components/workspace/blocks/web-search-block.tsx` 依赖数组中的 `title/url` 渲染来源

### Scope
- `apps/desktop/src/main/index.ts`
- `apps/desktop/src/shared/contracts.ts`

### Validation
- desktop test suite pass
- 手动 GUI 搜索显示来源列表

## Slices
1. [x] Bound failure in parser
2. [x] Preserve array content in tool_result payload
3. [x] Keep TS types aligned
4. [x] Validate tests

## Progress Log

### 2026-04-09 Repair Complete
- `apps/desktop/src/main/index.ts`: tool_result parsing now preserves array content instead of flattening to text-only string.
- `apps/desktop/src/shared/contracts.ts`: `GuiToolResultPayload.content` expanded to support generic structured arrays.
- Validation: `bun run desktop:test` -> 66/66 pass.
