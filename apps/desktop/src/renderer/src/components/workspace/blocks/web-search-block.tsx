import { useMemo } from "react";
import { AlertCircle, ExternalLink } from "lucide-react";
import type { GuiToolUseBlock } from "../../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";
import { WebSearchStatus } from "./web-search-status";

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

// ─── Web search block (always-inline) ─────────────────────────────────────────

interface WebSearchBlockProps {
  block: GuiToolUseBlock;
}

export function WebSearchBlock({ block }: WebSearchBlockProps) {
  const query = (block.input?.query as string) || "";
  const summary = useMemo(() => extractWebSearchSummary(block), [block]);

  const isError = isSearchError(summary);
  const isSuccess = isSearchResult(summary);
  const state =
    block.status === "running"
      ? "searching"
      : isError || block.status === "error"
        ? "error"
        : "done";
  const resultCount = isSuccess ? summary.resultCount : 0;
  const sources = isSuccess ? summary.sources : [];

  return (
    <div>
      <WebSearchStatus query={query} state={state} resultCount={resultCount} />

      {/* Success: inline results list (non-card, non-collapsible, only when sources exist) */}
      {isSuccess && sources.length > 0 && (
        <div className="ml-5.5 mt-1 flex flex-col gap-1.5">
          {sources.map((source, i) => (
            <a
              key={i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group/link inline-flex max-w-full items-start gap-2 rounded px-1.5 py-1",
                "text-[12px] text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors",
              )}
            >
              <ExternalLink className="h-3 w-3 flex-shrink-0 mt-0.5 opacity-70" />
              <span className="truncate">{source.title}</span>
            </a>
          ))}
        </div>
      )}

      {/* Error: inline details */}
      {isError && (
        <div className="ml-5.5 mt-1 flex items-start gap-2 rounded px-1.5 py-1 text-[12px] text-red-600 dark:text-red-400">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="font-mono whitespace-pre-wrap break-words">
              {summary.message}
            </div>
            {summary.traceid && (
              <div className="mt-0.5 text-[11px] text-[var(--color-muted)] font-mono">
                traceid: {summary.traceid}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
