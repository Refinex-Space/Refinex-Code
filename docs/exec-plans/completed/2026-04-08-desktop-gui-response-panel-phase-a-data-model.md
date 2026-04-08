# Desktop GUI AI Response Panel — Phase A: Data Model & Contract Extension

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-08
- **Goal**: 将 GUI 会话消息的数据模型从极简 `text: string` 升级为结构化 ContentBlock 体系，同时设计 IPC 合约层和 Zustand 状态结构，为后续渲染组件阶段奠定数据基础。
- **Impact**: 当前 GUI 模式只能展示纯文本气泡，无法表达工具调用、Diff、思考过程等 CLI 的核心输出格式。
- **Rollback**: Git revert `apps/desktop/src/shared/contracts.ts` 及相关 store 文件。
- **Plan path**: `docs/exec-plans/active/2026-04-08-desktop-gui-response-panel-phase-a-data-model.md`

## Harness Preflight

- scripts/check_harness.py: ✅ available（P1 gap: apps/desktop/AGENTS.md 缺失，已知，不阻塞）
- docs/generated/harness-manifest.md: ✅
- docs/OBSERVABILITY.md: ✅
- docs/exec-plans/tech-debt-tracker.md: ✅

## Scope

### In scope
- 扩展 `apps/desktop/src/shared/contracts.ts` 中的消息类型体系
- 设计 `GuiContentBlock` union type，覆盖所有 CLI 输出格式类型
- 设计 IPC channel 的增量流式推送协议（事件/payload 格式）
- 更新 `apps/desktop/src/main/gui-conversation-store.ts` 支持富内容存储
- 更新 Renderer 侧 Zustand store 接收结构化消息

### Non-goals
- 暂不实现实际的 CLI → Desktop 流式桥接（那是 Phase E，超出本阶段）
- 暂不修改 CLI 侧（src/）任何文件
- 暂不渲染任何可视 UI（Phase B-D 负责）

## Hard Constraints

- 向后兼容：现有 `DesktopGuiConversationMessage.text` 字段保留（降级渲染兜底）
- 不破坏当前已通过的 smoke 测试
- IPC 合约变更需同步更新 preload bridge 类型定义

## Design: ContentBlock Type System

### 核心消息类型升级

```typescript
// 旧: text-only
export interface DesktopGuiConversationMessage {
  id: string;
  role: "user" | "assistant";
  text: string;  // legacy fallback
  status: "completed" | "pending" | "error";
  // ...
}

// 新: structured content blocks
export type GuiContentBlock =
  | GuiTextBlock
  | GuiThinkingBlock
  | GuiRedactedThinkingBlock
  | GuiToolUseBlock
  | GuiToolResultBlock
  | GuiSystemBlock;

export interface GuiTextBlock {
  type: "text";
  text: string;
}

export interface GuiThinkingBlock {
  type: "thinking";
  thinking: string;
  collapsed?: boolean;
}

export interface GuiRedactedThinkingBlock {
  type: "redacted_thinking";
}

export interface GuiToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;             // "Bash" | "str_replace_editor" | "mcp__<s>__<t>" | ...
  input: Record<string, unknown>;
  status: GuiToolStatus;
  isMcp: boolean;
  mcpServer?: string;
  mcpTool?: string;
  progress?: GuiToolProgress;
  result?: GuiToolResultPayload;
}

export type GuiToolStatus = "pending" | "running" | "completed" | "error" | "cancelled" | "rejected";

export interface GuiToolProgress {
  message?: string;
  percent?: number;
  // bash streaming stdout
  stdout?: string;
  stderr?: string;
}

export interface GuiToolResultPayload {
  isError: boolean;
  content: string | GuiMcpResultItem[];
  // for file edit tool
  structuredPatch?: GuiStructuredPatchHunk[];
  gitDiff?: GuiGitDiff;
  filePath?: string;
  // for bash tool
  returnCodeInterpretation?: string;
  interrupted?: boolean;
}

export interface GuiMcpResultItem {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;     // base64 for image
  mimeType?: string;
  uri?: string;      // for resource type
  uiResourceUri?: string;  // for MCP Apps UI embed
}

export interface GuiStructuredPatchHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];   // "+" | "-" | " " 前缀
}

export interface GuiGitDiff {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string;
  repository?: string;
}

export interface GuiToolResultBlock {
  type: "tool_result";
  toolUseId: string;
  isError: boolean;
  content: string;
}

export interface GuiSystemBlock {
  type: "system";
  subtype: GuiSystemSubtype;
  level: "info" | "warning" | "error";
  message: string;
  data?: Record<string, unknown>;
}

export type GuiSystemSubtype =
  | "api_error"
  | "rate_limit"
  | "memory_saved"
  | "agents_killed"
  | "turn_duration"
  | "bridge_status"
  | "skill_loaded"
  | "cost_summary"
  | "informational";
```

### 扩展后的 Message 接口

```typescript
export interface DesktopGuiConversationMessage {
  id: string;
  role: "user" | "assistant";
  // 保留 text 作为 legacy fallback（当 blocks 为空时使用）
  text: string;
  // 结构化内容块（新）
  blocks?: GuiContentBlock[];
  status: "completed" | "pending" | "error";
  createdAt: string;
  providerId: DesktopProviderId;
  model: string;
  effort: ProviderReasoningEffort;
  // 统计信息（新）
  usage?: GuiMessageUsage;
  durationMs?: number;
}

export interface GuiMessageUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  costUsd?: number;
}
```

### IPC 流式推送协议

```typescript
// 新增：支持 blocks 流式更新的 IPC 事件
export interface GuiConversationBlockDeltaPayload {
  sessionId: string;
  messageId: string;
  blockIndex: number;
  delta: GuiBlockDelta;
}

export type GuiBlockDelta =
  | { type: "text_delta"; text: string }
  | { type: "thinking_delta"; thinking: string }
  | { type: "tool_status"; status: GuiToolStatus }
  | { type: "tool_progress"; progress: GuiToolProgress }
  | { type: "tool_result"; result: GuiToolResultPayload }
  | { type: "block_added"; block: GuiContentBlock };

// DesktopBridge 新增 IPC 方法
export interface DesktopBridgeExtended extends DesktopBridge {
  onGuiConversationBlockDelta: (
    listener: (payload: GuiConversationBlockDeltaPayload) => void
  ) => () => void;
}
```

### SubAgent 任务状态

```typescript
export interface GuiAgentTask {
  id: string;
  sessionId: string;    // parent sessionId
  description: string;
  agentType?: string;
  name?: string;
  status: "initializing" | "running" | "completed" | "error" | "killed";
  toolUseCount: number;
  tokens: number | null;
  isAsync: boolean;
  lastToolInfo?: string;
  startedAt: string;
  finishedAt?: string;
  // 子 agent 的消息列表（嵌套）
  childMessages?: DesktopGuiConversationMessage[];
}

// 扩展会话快照
export interface DesktopGuiConversationSnapshot {
  sessionId: string;
  messages: DesktopGuiConversationMessage[];
  updatedAt: string;
  // 新增
  agentTasks?: GuiAgentTask[];
  totalUsage?: GuiMessageUsage;
}
```

## Affected Surfaces

- `apps/desktop/src/shared/contracts.ts` — 主要类型变更
- `apps/desktop/src/main/gui-conversation-store.ts` — 存储结构升级
- `apps/desktop/src/main/index.ts` — IPC handler 注册
- `apps/desktop/src/preload/index.ts` — bridge 类型扩展
- `apps/desktop/src/renderer/src/stores/ui.ts` — 无需修改（消息数据由 worktree store 管理）
- `apps/desktop/src/renderer/src/hooks/use-desktop-shell.ts` — 若存在

## Slices

### Slice 1 — 扩展 shared/contracts.ts 类型定义

- [ ] 添加所有 GuiContentBlock 相关类型
- [ ] 扩展 DesktopGuiConversationMessage 加入 blocks / usage 字段
- [ ] 添加流式 delta IPC 事件类型
- [ ] 添加 GuiAgentTask 和快照扩展类型
- [ ] 保持向后兼容（text 字段不删除）

### Slice 2 — 更新 main/gui-conversation-store.ts

- [ ] 支持带 blocks 的消息存储和序列化
- [ ] 为 blocks 字段提供版本迁移（version bump to 2）
- [ ] 支持 agentTasks 存储

### Slice 3 — 更新 preload bridge 定义

- [ ] 添加 onGuiConversationBlockDelta 监听器
- [ ] 确保 TypeScript 编译通过

### Slice 4 — 验证与回归

- [ ] 运行 bun test 确保现有测试通过
- [ ] 确认 TypeScript 无编译错误

## Risks

- blocks 字段为可选，零破坏性：现有纯文本路径不受影响
- version bump 需要 recoverPendingMessages 迁移逻辑同步更新

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-08 | 保留 `text` 字段作为 legacy fallback | 降低迁移风险，渲染层可按需选择 blocks or text |
| 2026-04-08 | GuiToolUseBlock 内嵌 progress + result | 避免跨消息 lookup，渲染简化 |
| 2026-04-08 | IPC delta 基于 blockIndex 寻址 | 与 Anthropic SDK ContentBlock index 对齐 |
