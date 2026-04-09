# Codex Web Search Tool Type Fix

**Execution Date**: 2026-04-09  
**Owner**: AI Assistant  
**Status**: In Progress

## Bug Brief (Rewritten)

### Symptom
Desktop GUI 在使用 Codex(OpenAI) provider 进行联网搜索时失败，返回：
`Unsupported tool type: web_search_preview`。

### Expected Behavior
当 provider 为 Codex/OpenAI 时，联网搜索应按 Codex/OpenAI 支持的工具类型请求并成功返回结果。

### Observed Behavior
当前 `openaiResponsesAdapter` 会将内建 web search schema 映射为 `web_search_preview`，导致目标后端拒绝该类型并报 30001 参数错误。

### User Impact
Codex 模型下 GUI 联网搜索不可用，影响查询、检索增强与任务完成率。

### Reproduction Evidence
- 用户稳定复现错误，traceid 可见
- 代码证据：`src/services/api/adapters/openaiResponsesAdapter.ts` 中存在 `type: 'web_search_preview'`

### Likely Affected Surfaces
- `src/services/api/adapters/openaiResponsesAdapter.ts`
- `src/openaiResponsesAdapter.test.ts`
- provider/codex tool schema mapping path

### Validation Target
- Adapter 在 Codex 下生成正确 web search tool type
- 相关测试覆盖并通过
- `bun run test src/openaiResponsesAdapter.test.ts`

## Harness Preflight
- `scripts/check_harness.py` executed
- Known unrelated drift recorded (missing local AGENTS + archive headers)

## Execution Slices
1. **Slice 1 — Evidence & Root Cause**
   - [x] Locate failing type mapping in adapter
   - [x] Cross-check reference codex tool type
2. **Slice 2 — Narrow Repair**
   - [x] Fix web search tool type mapping
   - [x] Keep include/source extraction compatibility
3. **Slice 3 — Regression Guard**
   - [x] Add/update tests for tool type and include fields
   - [x] Run targeted tests and verify

## Progress Log
### 2026-04-09 Initialization
- Preflight complete
- Root cause candidate identified: `web_search_preview` in OpenAI adapter

### 2026-04-09 Repair Complete
- Evidence from reference/codex confirms web search tool spec uses `type: "web_search"` (not `web_search_preview`)
- Adapter fix applied in `src/services/api/adapters/openaiResponsesAdapter.ts`:
   - `OpenAIWebSearchTool.type`: `web_search_preview` -> `web_search`
   - mapped domain field from `domains` to `filters.allowed_domains`
   - `hasBuiltInWebSearch` detection updated to `web_search`
- Regression test added in `src/openaiResponsesAdapter.test.ts`:
   - verifies `web_search_20250305` schema maps to `web_search`
   - verifies `include = ['web_search_call.action.sources']`
- Validation:
   - `bun test src/openaiResponsesAdapter.test.ts` -> 7/7 pass
   - `bun run desktop:test` -> 66/66 pass
