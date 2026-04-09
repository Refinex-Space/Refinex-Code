# GUI Only Refactor — Remove TUI Mode Toggle

**Execution Date**: 2026-04-09  
**Owner**: AI Assistant  
**Status**: In Progress

## Task Brief (Rewritten)

### Outcome
Desktop 界面切换为 GUI-only 交互：删除顶部 GUI/TUI 切换控件，移除会话级 TUI 分支路由，统一消息发送走 GUI conversation。

### Why It Matters
- 降低认知负担，避免同一线程下双通道语义分裂
- 减少状态机复杂度（mode 状态、terminal profile 分支）
- 让渲染与交互路径更稳定、可维护

### Scope
1. 删除顶部 `ThreadModeToggle` UI 与相关样式依赖
2. 移除 renderer 侧 thread conversation mode 状态与分支逻辑
3. `WorkspaceHome` 仅保留 GUI conversation surface
4. `WorkspaceComposer` 仅保留 GUI 发送路径与文案
5. 更新 smoke tests，删除 GUI/TUI 切换断言，改为 GUI-only 断言

### Non-goals
- 不改动 main process 的 thread-tui launch 机制（仅移除 UI/交互入口）
- 不改动全局 terminal（cmd+t）能力
- 不改动 GUI conversation 数据模型

### Hard Constraints
- 保持现有 GUI streaming 与工具块渲染行为不回归
- 桌面测试保持通过
- 变更保持最小化，不做无关重构

### Affected Surfaces
- `apps/desktop/src/renderer/src/app/layout.tsx`
- `apps/desktop/src/renderer/src/components/workspace/thread-mode-toggle.tsx`
- `apps/desktop/src/renderer/src/components/workspace/workspace-home.tsx`
- `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
- `apps/desktop/src/renderer/src/stores/ui.ts`
- `apps/desktop/src/renderer/src/styles/globals.css`
- `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`

## Harness Preflight

- `scripts/check_harness.py` executed
- Existing unrelated findings kept as known baseline:
  - missing local AGENTS in `apps/desktop/AGENTS.md`
  - missing archive headers in historical completed plans

## Implementation Slices

1. **Slice 1 — UI入口移除**
   - [x] Remove top `ThreadModeToggle` from layout
   - [x] Drop renderer references to mode selector

2. **Slice 2 — 状态与路由收敛**
   - [x] Remove `ThreadConversationMode` store fields/helpers
   - [x] `WorkspaceHome` render GUI-only surface
   - [x] `WorkspaceComposer` send GUI-only

3. **Slice 3 — 样式与测试同步**
   - [x] Remove obsolete thread-mode-toggle css variables if unused
   - [x] Update smoke tests from mode-switch flow to GUI-only flow
   - [x] Validate desktop typecheck + tests

## Validation Targets

- `bun run desktop:typecheck`
- `bun run desktop:test`

## Risks

- 测试中可能存在对 mode 文案和 aria 的耦合
- 迁移后 tooltip/aria 文案需要统一为 GUI-only

## Progress Log

### 2026-04-09 Initialization
- Completed task rewrite and harness preflight
- Mapped all renderer-side GUI/TUI switch touch points
- Ready to implement Slice 1

### 2026-04-09 Completion
- Removed top header GUI/TUI toggle and deleted `thread-mode-toggle.tsx`
- Removed mode-state surface in `ui.ts`:
   - `ThreadConversationMode`
   - `threadConversationModes`
   - `setThreadConversationMode`
   - `resolveThreadConversationMode`
- Refactored `workspace-home.tsx` to GUI-only content path
- Refactored `workspace-composer.tsx` to GUI-only send path and GUI-only labels
- Removed obsolete thread-mode-toggle CSS tokens in `globals.css`
- Updated smoke tests to assert GUI-only command routing
- Validation evidence:
   - `bun run desktop:typecheck` passed
   - `bun run desktop:test` passed (66/66)
