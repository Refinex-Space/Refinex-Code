> ✅ Completed: 2026-04-09
> Summary: 重设计 web_search 为无折叠内联状态展示，支持搜索中动效与完成态来源列表
> Duration: ~25m
> Key learnings: 搜索中状态应显式区分 query 动效与 spinner，避免仅靠图标; web_search GUI 渲染链路需要 smoke 级别断言以避免交互回退

# Desktop Web Search Inline Status Redesign

**Execution Date**: 2026-04-09  
**Owner**: AI Assistant  
**Status**: Completed

## Task Brief (Rewritten)

### Outcome
重设计 desktop GUI 的 web search 展示：取消折叠与卡片样式，稳定展示“正在搜索网页 xxxx / 已搜索网页 xxxx”的状态切换，并在搜索中为 `xxxx` 提供明确动效。

### Why It Matters
web search 是高频可见能力，当前折叠+卡片交互增加信息获取成本；用户需要一眼可见的线性状态反馈与进行中视觉感知。

### Scope
- `apps/desktop/src/renderer/src/components/workspace/blocks/web-search-block.tsx`
- `apps/desktop/src/renderer/src/components/workspace/blocks/web-search-status.tsx`
- 相关 renderer 测试（按需）
- `docs/PLANS.md`

### Non-goals
- 不修改 main 进程 parser、provider adapter 或协议层
- 不改动其他工具块视觉体系
- 不处理历史 Harness 漂移（本次仅记录）

### Hard Constraints / Invariants
- 不支持展开折叠
- 不使用卡片式容器
- 动态正确展示“正在搜索网页 xxxx / 已搜索网页 xxxx”
- 搜索进行中，`xxxx` 需具备可感知动效
- 保持现有数据契约兼容，不破坏现有消息渲染链路

### Likely Affected Surfaces
- `block-renderer` 的 `WebSearchBlock` 呈现路径
- GUI smoke 测试中与 web_search 文案相关断言

### Validation Target
- `bun run desktop:test` 全量通过
- 新/改测试覆盖运行中状态与完成状态可见文案/动效

### Docs / Generated Surfaces
- 更新 `docs/PLANS.md`
- 归档到 `docs/exec-plans/completed/`

## Preflight Notes
- `python3 scripts/check_harness.py` 失败（既有漂移）：
  - 缺少 `apps/desktop/AGENTS.md`
  - 多个 completed plans 缺少 archive header
- 本任务不扩大范围修复上述历史漂移。

## Slices
1. [x] Refactor `web-search-status` into inline non-card status row with animated query text
2. [x] Rework `web-search-block` to always inline-render (no collapse) and reuse status component
3. [x] Update/add tests for searching/done state text and run desktop suite
4. [x] Archive plan and sync `docs/PLANS.md`

## Progress Log

### 2026-04-09 Completed
- Rebuilt web-search status row into non-card inline format with explicit running/done/error text.
- Added animated query emphasis in running state (`animate-pulse`) plus trailing pulsing dots and spinner for clear in-flight feedback.
- Removed collapsible interaction from web-search block; sources now render inline directly under status row.
- Updated GUI smoke assertions and added running-state animation regression test.
- Validation: `bun run desktop:test` -> 12/12 files, 68/68 tests passed.
