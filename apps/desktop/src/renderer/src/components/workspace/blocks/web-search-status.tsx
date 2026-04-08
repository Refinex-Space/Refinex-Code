import { Globe, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

type SearchState = "searching" | "done" | "error";

interface WebSearchStatusProps {
  query?: string;
  state: SearchState;
  resultCount?: number;
  sources?: Array<{ title: string; url: string }>;
}

export function WebSearchStatus({
  query,
  state,
  resultCount,
  sources,
}: WebSearchStatusProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] overflow-hidden">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <Globe className="h-3.5 w-3.5 text-blue-400" />
        <span className="flex-1 truncate text-[12.5px] text-[var(--color-foreground)]">
          {query ? `搜索：${query}` : "联网检索"}
        </span>
        {state === "searching" && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
        )}
        {state === "done" && (
          <span className="flex items-center gap-1 text-[11.5px] text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {resultCount ?? 0} 条结果
          </span>
        )}
        {state === "error" && (
          <AlertCircle className="h-3.5 w-3.5 text-red-400" />
        )}
      </div>

      {state === "done" && sources && sources.length > 0 && (
        <div className="border-t border-[var(--color-border)] px-3.5 py-2 flex flex-wrap gap-1.5">
          {sources.slice(0, 4).map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-[180px] truncate rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-400 hover:bg-blue-500/20 transition-colors"
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
