import { useState, useMemo } from "react";
import {
  Puzzle,
  ChevronRight,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Globe,
} from "lucide-react";
import type { GuiToolUseBlock } from "../../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";
import { McpToolBlock } from "./mcp-tool-block";

/** Check if tool is MCP (name contains "__" or is explicitly in MCP servers). */
export function isMcpTool(name: string): boolean {
  return name.includes("__");
}

// ─── Result summary extraction ────────────────────────────────────────────────

function extractMcpSummary(block: GuiToolUseBlock): {
  preview: string;
  itemCount?: number;
} {
  const result = block.result;
  if (!result) return { preview: "" };

  // Structured items (web search, knowledge base results, etc.)
  if (Array.isArray(result.content)) {
    const count = result.content.length;
    const first = result.content[0];

    // First item type indicator
    let typeLabel = "";
    if (first?.type === "text" && first.text) {
      const text = first.text.split("\n")[0];
      typeLabel = text.slice(0, 60);
    } else if (first?.type === "image") {
      typeLabel = "📄 图片";
    } else if (first?.type === "resource" && first.uri) {
      typeLabel = `🔗 ${first.uri?.split("/").pop() || "资源"}`;
    }

    return {
      preview: typeLabel || `${count} 项结果`,
      itemCount: count,
    };
  }

  // Text content
  if (typeof result.content === "string") {
    const lines = result.content.split("\n");
    const firstLine = lines[0];
    return {
      preview: firstLine.slice(0, 80),
      itemCount: lines.length > 1 ? lines.length : undefined,
    };
  }

  return { preview: "已执行" };
}

// ─── MCP tool block wrapper (inline + expandable) ────────────────────────────

interface McpToolBlockWrapperProps {
  block: GuiToolUseBlock;
}

export function McpToolBlockWrapper({ block }: McpToolBlockWrapperProps) {
  const [expanded, setExpanded] = useState(false);

  const { preview, itemCount } = useMemo(
    () => extractMcpSummary(block),
    [block],
  );

  // Extract MCP server name from tool name (format: "server__tool")
  const [serverName, toolName] = block.name.includes("__")
    ? block.name.split("__", 2)
    : [block.name, ""];

  const displayName = toolName || serverName;
  const hasResult = block.result?.content !== undefined;

  return (
    <div className="group">
      {/* Collapsed header */}
      <button
        type="button"
        onClick={() => hasResult && setExpanded((v) => !v)}
        className={cn(
          "flex w-full items-center gap-2 py-1.5 px-1 text-left rounded-md",
          hasResult &&
            "hover:bg-[var(--color-hover)] transition-colors cursor-pointer",
          !hasResult && "cursor-default",
        )}
      >
        {/* Icon */}
        <Puzzle
          className={cn(
            "h-3.5 w-3.5 flex-shrink-0",
            block.status === "running"
              ? "text-purple-400 animate-spin"
              : "text-purple-400",
          )}
        />

        {/* Status & name */}
        <span className="text-[12.5px] text-[var(--color-muted)]">
          {block.status === "running"
            ? "正在执行"
            : block.status === "completed"
              ? "已执行"
              : block.status === "error"
                ? "执行失败"
                : "待执行"}{" "}
          <span className="text-[var(--color-foreground)] font-medium">
            {displayName}
          </span>
        </span>

        {/* Preview + item count */}
        {preview && (
          <span className="text-[12px] text-[var(--color-muted)] max-w-[200px] truncate">
            {preview}
            {itemCount && (
              <span className="ml-1 text-[11px] text-[var(--color-muted)]">
                ({itemCount} 项)
              </span>
            )}
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Expand chevron */}
        {hasResult && (
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-[var(--color-muted)] transition-transform duration-150 flex-shrink-0",
              "opacity-0 group-hover:opacity-100",
              expanded && "rotate-90 !opacity-100",
            )}
          />
        )}
      </button>

      {/* Expanded content */}
      {expanded && hasResult && (
        <div className="mt-1 ml-0">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] overflow-hidden">
            {/* Header */}
            <div className="px-3 py-1.5 bg-[var(--color-secondary)] border-b border-[var(--color-border)] text-[11px] text-[var(--color-muted)] font-mono">
              {serverName}
              {toolName && ` - ${toolName}`}
            </div>
            {/* Scrollable content */}
            <div className="max-h-[520px] overflow-y-auto">
              <div className="px-3 py-2">
                <McpToolBlock block={block} isNested />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
