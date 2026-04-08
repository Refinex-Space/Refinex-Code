import { useState } from "react";
import { TerminalSquare, ChevronDown } from "lucide-react";
import type { GuiToolUseBlock } from "../../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

const MAX_LINES = 30;

interface BashOutputBlockProps {
  block: GuiToolUseBlock;
}

export function BashOutputBlock({ block }: BashOutputBlockProps) {
  const [showAll, setShowAll] = useState(false);

  // Prefer completed result content, fall back to streaming stdout
  const rawOutput =
    typeof block.result?.content === "string"
      ? block.result.content
      : (block.progress?.stdout ?? "");

  const isRunning = block.status === "running";
  const isError = block.result?.isError ?? false;

  const lines = rawOutput.split("\n");
  const truncated = !showAll && lines.length > MAX_LINES;
  const visibleLines = truncated ? lines.slice(-MAX_LINES) : lines;
  const output = visibleLines.join("\n");

  if (!rawOutput && !isRunning) return null;

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3.5 py-1.5">
        <TerminalSquare className="h-3.5 w-3.5 text-green-400" />
        <span className="flex-1 text-[11.5px] text-[var(--color-muted)]">
          {isRunning ? "运行中…" : isError ? "执行失败" : "输出"}
        </span>
        {truncated && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="flex items-center gap-1 rounded-md bg-white/6 px-2 py-0.5 text-[11px] text-[var(--color-muted)] hover:bg-white/10 transition-colors"
          >
            <ChevronDown className="h-3 w-3" />
            显示全部 ({lines.length} 行)
          </button>
        )}
      </div>

      {/* Output */}
      <div className={cn("overflow-x-auto", isError && "bg-red-500/4")}>
        <pre
          className={cn(
            "px-3.5 py-3 font-mono text-[12px] leading-5 whitespace-pre-wrap break-all",
            isError ? "text-red-300" : "text-[var(--color-foreground)]",
          )}
        >
          {truncated && (
            <span className="block text-[11px] text-[var(--color-muted)] italic mb-1">
              … 已省略前 {lines.length - MAX_LINES} 行 …
            </span>
          )}
          {output}
          {isRunning && (
            <span className="inline-block h-3.5 w-1.5 animate-pulse bg-current align-bottom ml-0.5" />
          )}
        </pre>
      </div>

      {/* Return code interpretation */}
      {block.result?.returnCodeInterpretation && (
        <div className="border-t border-[var(--color-border)] px-3.5 py-1.5">
          <span
            className={cn(
              "text-[11.5px]",
              isError ? "text-red-400" : "text-[var(--color-muted)]",
            )}
          >
            {block.result.returnCodeInterpretation}
          </span>
        </div>
      )}
    </div>
  );
}
