import { useState, useMemo } from "react";
import { Search, ChevronRight, AlertCircle, ExternalLink } from "lucide-react";
import type { GuiToolUseBlock } from "../../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

/** Check if tool is web-search. */
export function isWebSearchTool(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes("web") && lower.includes("search");
}

// ─── Result summary extraction ────────────────────────────────────────────────

interface SearchResult {
  sources: Array<{ title: string; url: string }>;
  resultCount: number;
}

interface SearchError {
  message: string;
  traceid?: string;
}

type SearchSummary = SearchResult | SearchError | null;

function isSearchResult(summary: SearchSummary): summary is SearchResult {
  return summary !== null && "sources" in summary;
}

function isSearchError(summary: SearchSummary): summary is SearchError {
  return summary !== null && "message" in summary;
}

function extractWebSearchSummary(block: GuiToolUseBlock): SearchSummary {
  const result = block.result;
  const query = (block.input?.query as string) || "";

  if (!result) return null;

  // Check for error response (API error pattern)
  const content = result.content;
  if (typeof content === "string" && content.includes("Error:")) {
    // Parse error message+traceid from format:
    // "API Error: {...}" or similar
    const match = content.match(
      /(?:API )?Error:?\s*(.+?)(?:\(traceid:\s*([a-f0-9]+)\))?$/im,
    );
    const errorMsg = match?.[1]?.trim() || content.slice(0, 100);
    const traceid = match?.[2];
    return { message: errorMsg, traceid };
  }

  // Structured results (array of sources)
  if (Array.isArray(result.content)) {
    return {
      sources: result.content.slice(0, 10).map((item: any) => ({
        title: item?.title || "Untitled",
        url: item?.url || item?.link || "#",
      })),
      resultCount: result.content.length,
    };
  }

  // Text content with implicit results
  if (typeof content === "string" && content.length > 0) {
    return {
      sources: [],
      resultCount: 1,
    };
  }

  return null;
}

// ─── Web search block (inline + expandable) ───────────────────────────────────

interface WebSearchBlockProps {
  block: GuiToolUseBlock;
}

export function WebSearchBlock({ block }: WebSearchBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const query = (block.input?.query as string) || "";
  const summary = useMemo(() => extractWebSearchSummary(block), [block]);

  const hasResult = summary !== null;
  const isError = isSearchError(summary);
  const isSuccess = isSearchResult(summary);

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
        <Search
          className={cn(
            "h-3.5 w-3.5 flex-shrink-0",
            block.status === "running"
              ? "text-amber-400 animate-spin"
              : isError
                ? "text-red-400"
                : "text-amber-400",
          )}
        />

        {/* Status & label */}
        <span className="text-[12.5px] text-[var(--color-muted)]">
          {block.status === "running"
            ? "搜索中"
            : isError
              ? "搜索失败"
              : "已搜索"}{" "}
          <span className="text-[var(--color-foreground)] font-medium">
            {query || "联网检索"}
          </span>
        </span>

        {/* Result count badge */}
        {isSuccess && summary.resultCount > 0 && (
          <span className="text-[12px] text-[var(--color-muted)]">
            ({summary.resultCount} 条结果)
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
        <div className="mt-1 ml-5.5">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] overflow-hidden">
            {/* Header */}
            <div className="px-3 py-1.5 bg-[var(--color-secondary)] border-b border-[var(--color-border)] text-[11px] text-[var(--color-muted)] font-mono">
              {query || "Web Search"}
            </div>

            {/* Scrollable content */}
            <div className="max-h-[520px] overflow-y-auto">
              <div className="px-3 py-2">
                {/* Success: results list */}
                {isSuccess && (
                  <div className="flex flex-col gap-2">
                    {summary.sources.length > 0 ? (
                      summary.sources.map((source, i) => (
                        <a
                          key={i}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "group/link flex items-start gap-2 p-2 rounded border border-amber-500/20",
                            "bg-amber-500/5 hover:bg-amber-500/10 transition-colors",
                            "text-[12px] text-amber-600 dark:text-amber-400",
                          )}
                        >
                          <ExternalLink className="h-3 w-3 flex-shrink-0 mt-0.5 opacity-60" />
                          <div className="flex-1 min-w-0 truncate">
                            {source.title}
                          </div>
                        </a>
                      ))
                    ) : (
                      <div className="text-[12px] text-[var(--color-muted)] px-2 py-1">
                        — 无结果 —
                      </div>
                    )}
                  </div>
                )}

                {/* Error: error details */}
                {isError && (
                  <div className="rounded border border-red-500/20 bg-red-500/5 p-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-red-500" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-red-600 dark:text-red-400 font-mono whitespace-pre-wrap break-words">
                          {summary.message}
                        </div>
                        {summary.traceid && (
                          <div className="text-[11px] text-[var(--color-muted)] mt-1 font-mono">
                            traceid: {summary.traceid}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
