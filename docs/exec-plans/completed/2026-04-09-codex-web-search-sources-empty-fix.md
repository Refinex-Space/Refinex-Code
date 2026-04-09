# Codex Web Search Empty Sources Fix

**Execution Date**: 2026-04-09  
**Owner**: AI Assistant  
**Status**: In Progress

## Bug Brief (Rewritten)

### Symptom
GUI 展示“已搜索 ... (1 条结果)”但展开后显示“— 无结果 —”。

### Expected Behavior
当 Codex/OpenAI 发起 web_search 后，展开区应展示真实来源链接（title/url）。

### Observed Behavior
`openaiResponsesAdapter` 仅从 `web_search_call.action.sources` / `web_search_call.sources` 提取来源；若后端把来源放在 `message.output_text.annotations`，则不会生成 `web_search_tool_result`。

### User Impact
联网搜索可执行但结果不可见，用户误判“搜索失败或无数据”，影响可用性。

### Reproduction / Evidence
- 用户界面复现：1 条结果但空列表
- 代码证据：`mapResponseOutputToBlocks` 忽略 `output_text.annotations`

### Likely Affected Surfaces
- `src/services/api/adapters/openaiResponsesAdapter.ts`
- `src/openaiResponsesAdapter.test.ts`

### Validation Target
- 对含 annotations 的 web search 响应能够生成 `web_search_tool_result`
- targeted adapter tests pass

## Harness Preflight
- `scripts/check_harness.py` executed
- Known unrelated harness drift remains (missing local AGENTS + archive headers)

## Execution Slices
1. **Slice 1 — Bound failure**
   - [x] Confirm adapter currently ignores annotations
2. **Slice 2 — Narrow repair**
   - [x] Add fallback extraction from `message.output_text.annotations`
   - [x] Keep existing `web_search_call.*.sources` path unchanged
3. **Slice 3 — Regression guard**
   - [x] Add test: annotations-only web_search response maps to result links
   - [x] Run targeted tests

## Progress Log
### 2026-04-09 Initialization
- Bounded failure to source extraction path in adapter
- Ready for minimal patch + regression test

### 2026-04-09 Repair Complete
- Added adapter fallback extraction from `message.output_text.annotations` when `web_search_call` does not include sources.
- Preserved primary extraction from `web_search_call.action.sources` / `web_search_call.sources`.
- Added de-duplication by URL for fallback sources.
- Added regression test in `src/openaiResponsesAdapter.test.ts` for annotations-only citations.
- Validation:
   - `bun test src/openaiResponsesAdapter.test.ts` -> 8/8 pass
   - `bun run desktop:test` -> 66/66 pass
