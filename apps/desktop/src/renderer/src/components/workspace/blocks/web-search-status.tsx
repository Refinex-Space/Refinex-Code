import { Globe, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@renderer/lib/cn";

type SearchState = "searching" | "done" | "error";

interface WebSearchStatusProps {
  query?: string;
  state: SearchState;
  resultCount?: number;
}

export function WebSearchStatus({
  query,
  state,
  resultCount,
}: WebSearchStatusProps) {
  const queryText = query?.trim() || "联网信息";
  const statusText =
    state === "searching"
      ? "正在搜索网页"
      : state === "done"
        ? "已搜索网页"
        : "搜索网页失败";

  return (
    <div className="flex items-center gap-2 py-1.5 px-1 text-[12.5px] overflow-hidden">
      <Globe
        className={cn(
          "h-3.5 w-3.5 flex-shrink-0",
          state === "searching"
            ? "text-amber-400"
            : state === "done"
              ? "text-emerald-500"
              : "text-red-500",
        )}
      />

      <span className="flex-shrink-0 whitespace-nowrap text-[var(--color-muted)]">
        {statusText}
      </span>

      <span
        data-testid="web-search-query"
        className={cn(
          "flex-1 min-w-0 truncate font-medium text-[var(--color-foreground)]",
          state === "searching" && "animate-pulse",
        )}
      >
        {queryText}
      </span>

      {state === "searching" && (
        <span
          aria-hidden="true"
          className="flex-shrink-0 inline-flex text-[var(--color-muted)] tracking-[0.08em]"
        >
          <span className="animate-pulse [animation-delay:0ms]">.</span>
          <span className="animate-pulse [animation-delay:160ms]">.</span>
          <span className="animate-pulse [animation-delay:320ms]">.</span>
        </span>
      )}

      {state === "searching" && (
        <Loader2 className="flex-shrink-0 h-3.5 w-3.5 animate-spin text-amber-400" />
      )}

      {state === "done" && (
        <span className="flex-shrink-0 whitespace-nowrap inline-flex items-center gap-1 text-[12px] text-[var(--color-muted)]">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          {resultCount ?? 0} 条结果
        </span>
      )}

      {state === "error" && (
        <AlertCircle className="flex-shrink-0 h-3.5 w-3.5 text-red-500" />
      )}
    </div>
  );
}
