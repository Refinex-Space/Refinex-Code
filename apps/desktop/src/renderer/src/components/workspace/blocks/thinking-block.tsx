import { useState } from "react";
import { Brain, ChevronDown } from "lucide-react";
import { cn } from "@renderer/lib/cn";

interface ThinkingBlockProps {
  thinking: string;
  defaultCollapsed?: boolean;
}

export function ThinkingBlock({
  thinking,
  defaultCollapsed = true,
}: ThinkingBlockProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 hover:bg-[var(--color-hover)] transition-colors text-left"
      >
        <Brain className="h-3.5 w-3.5 flex-shrink-0 text-indigo-400" />
        <span className="flex-1 text-[12.5px] font-medium text-[var(--color-muted)]">
          思考过程
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-[var(--color-muted)] transition-transform duration-200",
            collapsed && "-rotate-90",
          )}
        />
      </button>

      {!collapsed && (
        <div className="border-t border-[var(--color-border)] px-3.5 py-3">
          <pre className="whitespace-pre-wrap break-words font-sans text-[12.5px] leading-relaxed text-[var(--color-muted)]">
            {thinking}
          </pre>
        </div>
      )}
    </div>
  );
}
