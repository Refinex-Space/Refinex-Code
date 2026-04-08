# Desktop GUI AI Response Panel — Phase D: Advanced Features

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-08
- **Goal**: 设计并实现子代理任务面板（嵌套/并行）、成本统计与 Token 追踪器、Skill 状态展示、联网检索状态、用户审批 Overlay、错误重试机制等高级特性组件。
- **Depends on**: Phase A + Phase B + Phase C
- **Plan path**: `docs/exec-plans/active/2026-04-08-desktop-gui-response-panel-phase-d-advanced.md`

## Component Specifications

### 1. AgentTaskPanel（子代理）

子代理的嵌套展示是整个面板中最复杂的结构。设计参考 openwork 的 `SubagentThread` 模式：
- 默认折叠：一行展示类型 + 状态 + 工具数/token
- 展开：递归嵌套 MessageList，左边框标识层级

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/blocks/agent-task-panel.tsx

import { useState } from "react";
import {
  Cpu, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, Loader2, Activity
} from "lucide-react";
import type { GuiAgentTask } from "../../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

interface AgentTaskPanelProps {
  task: GuiAgentTask;
  depth?: number;  // 嵌套深度，最多 3 层
}

const depthColors = [
  "border-l-indigo-500/50",
  "border-l-purple-500/50",
  "border-l-pink-500/50",
];

const statusConfig = {
  initializing: { icon: Activity, color: "text-[var(--color-muted)]", label: "初始化中" },
  running:      { icon: Loader2,   color: "text-blue-400 animate-spin", label: "执行中" },
  completed:    { icon: CheckCircle2, color: "text-green-400", label: "已完成" },
  error:        { icon: XCircle,   color: "text-red-400", label: "失败" },
  killed:       { icon: XCircle,   color: "text-[var(--color-muted)]", label: "已终止" },
} as const;

export function AgentTaskPanel({ task, depth = 0 }: AgentTaskPanelProps) {
  const [expanded, setExpanded] = useState(task.status === "running");
  const { icon: StatusIcon, color: statusColor, label: statusLabel } =
    statusConfig[task.status] ?? statusConfig.initializing;
  const borderColor = depthColors[Math.min(depth, depthColors.length - 1)];
  const isRunning = task.status === "running";

  // 耗时计算
  const elapsed = task.finishedAt
    ? Math.round((new Date(task.finishedAt).getTime() - new Date(task.startedAt).getTime()) / 1000)
    : null;

  return (
    <div
      className={cn(
        "rounded-r-xl border-l-2 bg-[var(--color-panel)] overflow-hidden",
        borderColor,
      )}
    >
      {/* 标题行 */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-[var(--color-hover)] transition-colors"
      >
        {/* Agent 类型 badge */}
        {task.agentType && (
          <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-indigo-300">
            {task.agentType}
          </span>
        )}

        {/* 描述 */}
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--color-foreground)]">
          {task.description}
        </span>

        {/* 工具数 + Token */}
        <span className="text-[11px] text-[var(--color-muted)]">
          {task.toolUseCount} tools
          {task.tokens !== null && ` · ${task.tokens.toLocaleString()} tk`}
          {elapsed !== null && ` · ${elapsed}s`}
        </span>

        {/* 最近工具动态（running 时） */}
        {isRunning && task.lastToolInfo && (
          <span className="max-w-[160px] truncate text-[11px] italic text-[var(--color-muted)]">
            {task.lastToolInfo}
          </span>
        )}

        {/* 状态图标 */}
        <StatusIcon className={cn("h-3.5 w-3.5 flex-shrink-0", statusColor)} />

        {/* 展开箭头 */}
        {task.childMessages && task.childMessages.length > 0 ? (
          expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-[var(--color-muted)]" />
            : <ChevronRight className="h-3.5 w-3.5 text-[var(--color-muted)]" />
        ) : null}
      </button>

      {/* 展开内容：递归子消息 */}
      {expanded && task.childMessages && task.childMessages.length > 0 && (
        <div className="border-t border-[var(--color-border)] px-3 py-3">
          <NestedAgentMessages
            messages={task.childMessages}
            depth={depth + 1}
          />
        </div>
      )}
    </div>
  );
}

// 嵌套消息列表（只展示文本摘要，避免无限递归渲染开销）
function NestedAgentMessages({
  messages,
  depth,
}: {
  messages: import("../../../../../shared/contracts").DesktopGuiConversationMessage[];
  depth: number;
}) {
  // 深度限制：最多 3 层
  if (depth > 3) {
    return (
      <p className="text-[11px] italic text-[var(--color-muted)]">
        （嵌套深度已达上限）
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {messages.slice(-8).map((msg) => (
        <div key={msg.id} className="flex gap-2">
          <span className={cn(
            "text-[11px] font-medium",
            msg.role === "assistant" ? "text-indigo-400" : "text-[var(--color-muted)]",
          )}>
            {msg.role === "assistant" ? "AI" : "User"}
          </span>
          <p className="min-w-0 flex-1 truncate text-[12px] text-[var(--color-foreground)]">
            {msg.text || "（工具调用）"}
          </p>
        </div>
      ))}
      {messages.length > 8 && (
        <p className="text-[11px] text-[var(--color-muted)]">
          +{messages.length - 8} 条消息（已折叠）
        </p>
      )}
    </div>
  );
}
```

### 2. CoordinatorTaskGrid（Coordinator 多 Agent 任务网格）

当 Coordinator 模式激活时，在 composer 上方展示并行 Worker 状态：

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/coordinator-task-grid.tsx

import { Cpu, Network } from "lucide-react";
import type { GuiAgentTask } from "../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

interface CoordinatorTaskGridProps {
  tasks: GuiAgentTask[];
}

export function CoordinatorTaskGrid({ tasks }: CoordinatorTaskGridProps) {
  if (tasks.length === 0) return null;

  const running = tasks.filter((t) => t.status === "running" || t.status === "initializing");
  const done = tasks.filter((t) => t.status === "completed" || t.status === "error");

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-3">
      {/* 标题 */}
      <div className="mb-2.5 flex items-center gap-2">
        <Network className="h-3.5 w-3.5 text-indigo-400" />
        <span className="text-[12px] font-medium text-[var(--color-foreground)]">
          Coordinator · {running.length} 运行中 / {done.length} 完成
        </span>
      </div>

      {/* 任务网格（两列，最多展示 6 个） */}
      <div className="grid grid-cols-2 gap-1.5">
        {tasks.slice(0, 6).map((task) => (
          <AgentTaskMiniCard key={task.id} task={task} />
        ))}
        {tasks.length > 6 && (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] p-2">
            <span className="text-[11px] text-[var(--color-muted)]">
              +{tasks.length - 6} 更多
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function AgentTaskMiniCard({ task }: { task: GuiAgentTask }) {
  const isRunning = task.status === "running" || task.status === "initializing";
  const isError = task.status === "error";

  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2 text-[12px]",
        isRunning && "border-blue-500/30 bg-blue-500/5",
        isError && "border-red-500/30 bg-red-500/5",
        !isRunning && !isError && "border-[var(--color-border)] bg-transparent opacity-60",
      )}
    >
      <p className="truncate font-medium text-[var(--color-foreground)]">
        {task.description}
      </p>
      <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
        {task.toolUseCount} tools · {isRunning ? "运行中" : task.status}
      </p>
    </div>
  );
}
```

### 3. SessionCostTracker（成本追踪器）

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/session-cost-tracker.tsx

import { useState } from "react";
import { DollarSign, ChevronDown } from "lucide-react";
import type { GuiMessageUsage } from "../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

interface SessionCostTrackerProps {
  totalUsage: GuiMessageUsage;
  messageCount: number;
}

export function SessionCostTracker({ totalUsage, messageCount }: SessionCostTrackerProps) {
  const [expanded, setExpanded] = useState(false);

  const totalTokens = totalUsage.inputTokens + totalUsage.outputTokens;
  const costStr = totalUsage.costUsd !== undefined
    ? `$${totalUsage.costUsd.toFixed(4)}`
    : null;

  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-panel)]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2 hover:bg-[var(--color-hover)] transition-colors"
      >
        <DollarSign className="h-3.5 w-3.5 text-[var(--color-muted)]" />
        <span className="flex-1 text-left text-[12px] text-[var(--color-muted)]">
          {messageCount} 条消息 · {totalTokens.toLocaleString()} tokens
          {costStr && ` · ${costStr}`}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-[var(--color-muted)] transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-[var(--color-border)] px-4 py-3">
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <StatRow label="输入 Tokens" value={totalUsage.inputTokens.toLocaleString()} />
            <StatRow label="输出 Tokens" value={totalUsage.outputTokens.toLocaleString()} />
            {totalUsage.cacheReadInputTokens !== undefined && (
              <>
                <StatRow label="缓存读取" value={totalUsage.cacheReadInputTokens.toLocaleString()} />
                <StatRow label="缓存创建" value={(totalUsage.cacheCreationInputTokens ?? 0).toLocaleString()} />
              </>
            )}
            {costStr && (
              <StatRow label="估计费用" value={costStr} highlight />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className={cn(
        "font-mono font-medium",
        highlight ? "text-blue-400" : "text-[var(--color-foreground)]",
      )}>
        {value}
      </span>
    </div>
  );
}
```

### 4. ApprovalOverlay（工具审批）

当工具执行需要用户审批时，以内联形式在消息流中插入审批 UI（而非全屏 modal）：

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/approval-overlay.tsx

import { ShieldCheck, ShieldX, Shield } from "lucide-react";
import { cn } from "@renderer/lib/cn";

export type ApprovalAction = "allow_once" | "allow_always" | "deny";

interface ApprovalOverlayProps {
  toolName: string;
  description?: string;
  command?: string;   // for Bash tool
  filePath?: string;  // for file tools
  onDecide: (action: ApprovalAction) => void;
  isResolved?: boolean;
  resolvedAction?: ApprovalAction;
}

export function ApprovalOverlay({
  toolName,
  description,
  command,
  filePath,
  onDecide,
  isResolved,
  resolvedAction,
}: ApprovalOverlayProps) {
  if (isResolved) {
    const labels: Record<ApprovalAction, { text: string; color: string }> = {
      allow_once:   { text: "已允许（本次）", color: "text-green-400" },
      allow_always: { text: "已永久允许", color: "text-green-400" },
      deny:         { text: "已拒绝", color: "text-red-400" },
    };
    const { text, color } = labels[resolvedAction ?? "deny"];
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2.5">
        <Shield className={cn("h-4 w-4", color)} />
        <span className={cn("text-[12.5px] font-medium", color)}>{text}</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/6 p-4">
      {/* 标题 */}
      <div className="mb-3 flex items-start gap-2.5">
        <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-amber-200">
            AI 请求执行：{toolName}
          </p>
          {description && (
            <p className="mt-0.5 text-[12px] text-amber-300/70">{description}</p>
          )}
        </div>
      </div>

      {/* 详情预览 */}
      {(command || filePath) && (
        <div className="mb-3 overflow-x-auto rounded-lg bg-amber-900/20 px-3 py-2">
          <code className="font-mono text-[12px] text-amber-200">
            {command ?? filePath}
          </code>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onDecide("allow_once")}
          className="flex items-center gap-1.5 rounded-lg bg-green-500/20 px-3 py-1.5 text-[12.5px] font-medium text-green-300 hover:bg-green-500/30 transition-colors"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          允许一次
        </button>
        <button
          type="button"
          onClick={() => onDecide("allow_always")}
          className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-[12.5px] font-medium text-green-400/70 hover:bg-green-500/20 transition-colors"
        >
          永久允许
        </button>
        <button
          type="button"
          onClick={() => onDecide("deny")}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-1.5 text-[12.5px] font-medium text-red-400 hover:bg-red-500/25 transition-colors"
        >
          <ShieldX className="h-3.5 w-3.5" />
          拒绝
        </button>
      </div>
    </div>
  );
}
```

### 5. WebSearchStatus（联网检索状态）

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/blocks/web-search-status.tsx

import { Globe, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@renderer/lib/cn";

type SearchState = "searching" | "done" | "error";

interface WebSearchStatusProps {
  query?: string;
  state: SearchState;
  resultCount?: number;
  sources?: Array<{ title: string; url: string }>;
}

export function WebSearchStatus({ query, state, resultCount, sources }: WebSearchStatusProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] overflow-hidden">
      {/* 状态行 */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <Globe className="h-3.5 w-3.5 text-blue-400" />
        <span className="flex-1 text-[12.5px] text-[var(--color-foreground)]">
          {query ? `搜索：${query}` : "联网检索"}
        </span>
        {state === "searching" && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
        )}
        {state === "done" && (
          <span className="text-[11.5px] text-green-400">
            <CheckCircle2 className="inline h-3.5 w-3.5" />
            {" "}{resultCount ?? 0} 条结果
          </span>
        )}
      </div>

      {/* 来源引用（done 时展示） */}
      {state === "done" && sources && sources.length > 0 && (
        <div className="border-t border-[var(--color-border)] px-3.5 py-2 flex flex-wrap gap-1.5">
          {sources.slice(0, 4).map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-400 hover:bg-blue-500/20 transition-colors max-w-[180px] truncate"
            >
              {s.title}
            </a>
          ))}
          {sources.length > 4 && (
            <span className="text-[11px] text-[var(--color-muted)]">
              +{sources.length - 4} 更多
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

### 6. SkillLoadedBadge（Skill 状态）

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/blocks/skill-loaded-badge.tsx

import { Zap } from "lucide-react";

interface SkillLoadedBadgeProps {
  skillName: string;
  description?: string;
}

export function SkillLoadedBadge({ skillName, description }: SkillLoadedBadgeProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2">
      <Zap className="h-3.5 w-3.5 text-yellow-400" />
      <div>
        <span className="text-[12.5px] font-medium text-[var(--color-foreground)]">
          Skill 已加载：{skillName}
        </span>
        {description && (
          <p className="text-[11.5px] text-[var(--color-muted)]">{description}</p>
        )}
      </div>
    </div>
  );
}
```

### 7. ErrorRetryMessage（错误 + 重试）

```tsx
// 文件: apps/desktop/src/renderer/src/components/workspace/blocks/error-retry-message.tsx

import { useState, useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@renderer/lib/cn";

interface ErrorRetryMessageProps {
  error: string;
  retryAttempt?: number;
  maxRetries?: number;
  retryInMs?: number;
  onRetry?: () => void;
}

export function ErrorRetryMessage({
  error,
  retryAttempt,
  maxRetries,
  retryInMs,
  onRetry,
}: ErrorRetryMessageProps) {
  const [countdown, setCountdown] = useState(retryInMs ? Math.ceil(retryInMs / 1000) : null);

  useEffect(() => {
    if (!countdown) return;
    if (countdown <= 0) {
      onRetry?.();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onRetry]);

  const isAutoRetrying = countdown !== null && countdown > 0;
  const hasFailed = retryAttempt !== undefined && maxRetries !== undefined
    && retryAttempt >= maxRetries;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3.5",
        hasFailed
          ? "border-red-500/30 bg-red-500/8"
          : "border-amber-500/30 bg-amber-500/8",
      )}
    >
      <AlertCircle className={cn(
        "mt-0.5 h-4 w-4 flex-shrink-0",
        hasFailed ? "text-red-400" : "text-amber-400",
      )} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-[var(--color-foreground)]">{error}</p>
        {retryAttempt !== undefined && maxRetries !== undefined && (
          <p className="mt-1 text-[11.5px] text-[var(--color-muted)]">
            重试 {retryAttempt}/{maxRetries}
            {isAutoRetrying && ` · ${countdown}s 后自动重试`}
          </p>
        )}
      </div>
      {!isAutoRetrying && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded-lg bg-white/8 px-2.5 py-1.5 text-[12px] text-[var(--color-foreground)] hover:bg-white/12 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          重试
        </button>
      )}
    </div>
  );
}
```

## Interaction Design Details

### 审批流程（Approval）

**场景**：CLI 检测到需要用户权限的工具操作时，桌面端弹出 ApprovalOverlay。

**流程**：
1. ToolCallCard 的 status 为 `pending`，显示 ApprovalOverlay（内联在消息流里，非 modal）
2. 用户选择：允许一次 / 永久允许 / 拒绝
3. 通过 IPC `approveToolUse({ toolUseId, action })` 发送决定
4. status 变为 `running`，ApprovalOverlay 替换为已解决状态标签

**设计决策**：内联而非 modal，保持消息流连贯性，参考 Claude Code CLI 的 `↵ allow / n deny` 模式。

### Diff 逐块审批流程

1. FileEdit tool 完成，result.structuredPatch 有数据
2. ToolCallCard 展开，显示 FileEditDiffBlock
3. 每个 hunk 可独立 Accept / Reject（状态保存在本地 useState）
4. 批量操作栏：全部接受 / 全部拒绝
5. 点击"应用"按钮 → IPC `applyDiffHunks({ toolUseId, acceptedHunkIndices })`

注意：Phase D 仅设计 UI，实际 IPC 对接是 Phase A 数据模型 + 后续 Phase E 桥接层的工作。

### 会话回溯（Esc to Rollback）

按 Escape 键时，若当前有 pending 工具调用，弹出确认 toast：

```tsx
// 在 workspace-conversation.tsx 的 useKeyboardShortcuts 中添加
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && hasPendingTool) {
      toast("中断并回滚？", {
        action: {
          label: "确认中断",
          onClick: () => window.desktopApp.interruptSession(sessionId),
        },
        duration: 5000,
      });
    }
  };
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [hasPendingTool, sessionId]);
```

## CSS/Theme 补充

```css
/* 审批 overlay */
--color-approval-bg: color-mix(in srgb, var(--color-panel) 90%, #f59e0b 10%);
--color-approval-border: rgba(245, 158, 11, 0.3);

/* Agent task depth borders */
--color-agent-depth-0: rgba(99, 102, 241, 0.5);   /* indigo */
--color-agent-depth-1: rgba(168, 85, 247, 0.5);   /* purple */
--color-agent-depth-2: rgba(236, 72, 153, 0.5);   /* pink */
```

## Tech Stack Summary（全四阶段）

| 需求 | 选型 | 理由 |
|---|---|---|
| 框架 | React 19 + TypeScript | 已有基础 |
| UI 样式 | Tailwind CSS v4 + CSS tokens | 已有基础 |
| 状态管理 | Zustand（已有）+ 本地 useState | 消息全局/UI 状态本地 |
| Markdown 渲染 | `marked` + `xss` | 已有，轻量，可自定义 |
| 代码高亮 | `@shikijs/react` | 支持 SSR，主题丰富，比 highlight.js 快 |
| Diff 渲染 | 自实现（逐行 CSS 着色）| openwork 同款方案，无需依赖 |
| 虚拟化 | `@tanstack/react-virtual` | 已知最优 React 虚拟化方案 |
| 动画 | `framer-motion`（已有）| 已有基础 |
| 流式数据 | Electron IPC + onBlockDelta listener | 已有 IPC 基础，扩展新 channel |
| 代码字体 | `font-mono`（系统 mono） | Desktop 原生字体，无需加载 web font |

## Slices

### Slice 1 — AgentTaskPanel + CoordinatorTaskGrid
- [ ] 实现单 task 折叠卡片
- [ ] 实现 Coordinator 任务网格

### Slice 2 — SessionCostTracker
- [ ] 接入 totalUsage 数据
- [ ] 展开后显示详细 token 分布

### Slice 3 — ApprovalOverlay + ErrorRetryMessage
- [ ] 审批 UI（三按钮 + resolved 状态）
- [ ] 错误重试倒计时

### Slice 4 — WebSearchStatus + SkillLoadedBadge
- [ ] 联网检索三态（searching/done/error）
- [ ] Skill 加载徽标

### Slice 5 — Esc 回滚 + 整体集成
- [ ] Escape 中断提示
- [ ] 完整 smoke test 更新

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-08 | ApprovalOverlay 内联而非 modal | 不打断消息流上下文感知，参考 Claude Code CLI 模式 |
| 2026-04-08 | Coordinator 任务网格 2 列，最多 6 个 | 视觉平衡，过多任务不塞满面板 |
| 2026-04-08 | Cost tracker 默认折叠显示在底部 | 次要信息不抢占主屏幕空间 |
| 2026-04-08 | 选 @shikijs/react 替换现有高亮方案 | Phase B 的代码块目前无语法高亮，shiki 方案质量最高 |
