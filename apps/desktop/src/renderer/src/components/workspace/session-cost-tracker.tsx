import { useState } from "react";
import { DollarSign, ChevronDown } from "lucide-react";
import type { GuiMessageUsage } from "../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

interface SessionCostTrackerProps {
  totalUsage: GuiMessageUsage;
  messageCount: number;
}

export function SessionCostTracker({
  totalUsage,
  messageCount,
}: SessionCostTrackerProps) {
  const [expanded, setExpanded] = useState(false);
  const totalTokens = totalUsage.inputTokens + totalUsage.outputTokens;
  const costStr =
    totalUsage.costUsd !== undefined
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
          <div className="grid grid-cols-2 gap-2">
            <StatRow
              label="输入 Tokens"
              value={totalUsage.inputTokens.toLocaleString()}
            />
            <StatRow
              label="输出 Tokens"
              value={totalUsage.outputTokens.toLocaleString()}
            />
            {totalUsage.cacheReadInputTokens !== undefined && (
              <>
                <StatRow
                  label="缓存读取"
                  value={totalUsage.cacheReadInputTokens.toLocaleString()}
                />
                <StatRow
                  label="缓存创建"
                  value={(
                    totalUsage.cacheCreationInputTokens ?? 0
                  ).toLocaleString()}
                />
              </>
            )}
            {costStr && <StatRow label="估计费用" value={costStr} highlight />}
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
      <span className="text-[12px] text-[var(--color-muted)]">{label}</span>
      <span
        className={cn(
          "font-mono text-[12px] font-medium",
          highlight ? "text-blue-400" : "text-[var(--color-foreground)]",
        )}
      >
        {value}
      </span>
    </div>
  );
}
