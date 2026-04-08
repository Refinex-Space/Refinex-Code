# Web Search Block Redesign

**Execution Date**: 2026-04-09  
**Owner**: AI Assistant  
**Status**: In Progress

## Objective

升级 `web-search-status.tsx` 从卡片式展现改造为内联折叠式组件（如 MCP 工具块模式），提供实时搜索状态、结果展示和优雅错误处理，确保用户体验流畅且动效稳定。

## Scope

1. 创建 `web-search-block.tsx` 替代 `web-search-status.tsx`
2. 实现内联折叠头 + 展开内容区
3. 支持核心状态：searching / done / error
4. 展开时显示结果列表或错误详情
5. 搜索关键词在 "Search" 后面左对齐（如 MCP 模式）
6. 主题自适应配色和 header 样式

## Design

### Collapsed State
```
✓ Search "query text here" (3 结果) >
```
- Icon: Search (amber-400)
- Status text: "搜索中..." / "已完成" / "搜索失败"
- Query preview: truncated (max-w-[200px])
- Item count: shown on done
- Chevron: visible on hover / expanded

### Expanded State
- Header: dark themed, server-like style, query 显示
- Content: max-h-[520px] overflow-y-auto
- Results: list of clickable source links (blue style)
- Errors: red-themed error container with message + traceid

## Implementation Slices

1. **Slice 1**: Create web-search-block.tsx with basic structure
   - [x] Inline collapsed header
   - [x] Icon + status verb + query + item count + chevron
   - [x] Test compilation

2. **Slice 2**: Expand content rendering + integration
   - [x] Results list display with styled links
   - [x] Error detail display (API error parsing, traceid)
   - [x] Theme-aware styling (success/error states)
   - [x] Updated block-renderer routing (isWebSearchTool)
   - [x] Verified TypeScript: zero errors
   - [x] Tests: 66/66 passing

3. **Slice 3**: Final polish
   - [x] Verified rendering code quality
   - [x] Checked error message parsing robustness
   - [x] Ready for visual testing in desktop:dev

## Validation

- [x] TypeScript: zero errors (desktop:typecheck)
- [x] Tests: 66/66 all passing (desktop:test)
- [x] Compilation: successful
- [x] Code review: web-search-block.tsx follows MCP/FileOp patterns

## References

- Previous: [MCP Tool Block Redesign](../completed/2026-04-09-mcp-tool-block-redesign.md)
- Sibling: [File Operation Block Redesign](../completed/2026-04-08-file-operation-block-redesign.md)
- Routing: `apps/desktop/src/renderer/src/components/workspace/block-renderer.tsx`

## Progress Log

### 2026-04-09 Slices 1–2 Complete
- Created web-search-block.tsx (190 lines)
  - Inline collapsed header with icon + status + query + result count + chevron
  - Expanded content: success state (sorted links) vs error state (error details + traceid)
  - Theme-aware header (uses CSS variables)
  - Error message parsing: extracts traceid from API error format
- Updated block-renderer.tsx
  - Added import for WebSearchBlock and isWebSearchTool
  - Routing: FileOp → MCP → WebSearch → ToolCallCard
- Validation complete: typecheck passed, 66/66 tests passing
- Ready to archive

### Design Decisions
- **Icon color**: amber-400 (neutral web search) → red-400 (error state)
- **Query display**: truncated, left-aligned (like MCP pattern)
- **Error handling**: regex parse for "API Error: {msg} (traceid: ID)"
- **Results**: clickable links with amber styling, max 10 shown (sorted by position)
- **Height limit**: max-h-[520px] overflow-y-auto (consistent with MCP)
