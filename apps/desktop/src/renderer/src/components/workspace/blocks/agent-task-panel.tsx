import { useState } from "react";
import {
  Activity,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import type {
  GuiAgentTask,
  DesktopGuiConversationMessage,
} from "../../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

const DEPTH_BORDER_COLORS = [
  "border-l-indigo-500/50",
  "border-l-purple-500/50",
  "border-l-pink-500/50",
];

const STATUS_CONFIG = {
  initializing: { icon: Activity, colorClass: "text-[var(--color-muted)]" },
  running: { icon: Loader2, colorClass: "text-blue-400 animate-spin" },
  completed: { icon: CheckCircle2, colorClass: "text-green-400" },
  error: { icon: XCircle, colorClass: "text-red-400" },
  killed: { icon: XCircle, colorClass: "text-[var(--color-muted)]" },
} as const;

interface AgentTaskPanelProps {
  task: GuiAgentTask;
  depth?: number;
}

export function AgentTaskPanel({ task, depth = 0 }: AgentTaskPanelProps) {
  const [expanded, setExpanded] = useState(task.status === "running");
  const borderColor =
    DEPTH_BORDER_COLORS[Math.min(depth, DEPTH_BORDER_COLORS.length - 1)];
  const { icon: StatusIcon, colorClass } =
    STATUS_CONFIG[task.status] ?? STATUS_CONFIG.initializing;
  const hasChildren = task.childMessages && task.childMessages.length > 0;

  const elapsed = task.finishedAt
    ? Math.round(
        (new Date(task.finishedAt).getTime() -
          new Date(task.startedAt).getTime()) /
          1000,
      )
    : null;

  return (
    <div
      className={cn(
        "rounded-r-xl border-l-2 bg-[var(--color-panel)] overflow-hidden",
        borderColor,
      )}
    >
      <button
        type="button"
        onClick={() => hasChildren && setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2.5 px-3 py-2.5 text-left",
          hasChildren && "hover:bg-[var(--color-hover)] transition-colors",
          !hasChildren && "cursor-default",
        )}
      >
        {task.agentType && (
          <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-indigo-300">
            {task.agentType}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--color-foreground)]">
          {task.description}
        </span>
        <span className="shrink-0 text-[11px] text-[var(--color-muted)]">
          {task.toolUseCount} tools
          {task.tokens !== null && ` · ${task.tokens.toLocaleString()} tk`}
          {elapsed !== null && ` · ${elapsed}s`}
        </span>
        {task.status === "running" && task.lastToolInfo && (
          <span className="max-w-[140px] truncate text-[11px] italic text-[var(--color-muted)]">
            {task.lastToolInfo}
          </span>
        )}
        <StatusIcon className={cn("h-3.5 w-3.5 flex-shrink-0", colorClass)} />
        {hasChildren &&
          (expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-[var(--color-muted)]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-[var(--color-muted)]" />
          ))}
      </button>

      {expanded && hasChildren && (
        <div className="border-t border-[var(--color-border)] px-3 py-3">
          <NestedMessageSummary
            messages={task.childMessages!}
            depth={depth + 1}
          />
        </div>
      )}
    </div>
  );
}

function NestedMessageSummary({
  messages,
  depth,
}: {
  messages: DesktopGuiConversationMessage[];
  depth: number;
}) {
  if (depth > 3) {
    return (
      <p className="text-[11px] italic text-[var(--color-muted)]">
        （嵌套深度已达上限）
      </p>
    );
  }

  const visible = messages.slice(-8);
  return (
    <div className="flex flex-col gap-1.5">
      {visible.map((msg) => (
        <div key={msg.id} className="flex gap-2 min-w-0">
          <span
            className={cn(
              "shrink-0 text-[11px] font-medium",
              msg.role === "assistant"
                ? "text-indigo-400"
                : "text-[var(--color-muted)]",
            )}
          >
            {msg.role === "assistant" ? "AI" : "User"}
          </span>
          <p className="min-w-0 truncate text-[12px] text-[var(--color-foreground)]">
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
