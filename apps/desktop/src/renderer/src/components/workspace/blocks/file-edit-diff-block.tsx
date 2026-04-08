import { useState } from "react";
import { Check, X, CheckSquare, XSquare } from "lucide-react";
import type { GuiStructuredPatchHunk } from "../../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

interface FileEditDiffBlockProps {
  filePath?: string;
  hunks: GuiStructuredPatchHunk[];
}

export function FileEditDiffBlock({ filePath, hunks }: FileEditDiffBlockProps) {
  const [hunkStates, setHunkStates] = useState<
    Record<number, "accepted" | "rejected">
  >({});

  function setHunk(index: number, state: "accepted" | "rejected") {
    setHunkStates((prev) => ({ ...prev, [index]: state }));
  }

  function acceptAll() {
    const next: Record<number, "accepted" | "rejected"> = {};
    hunks.forEach((_, i) => {
      next[i] = "accepted";
    });
    setHunkStates(next);
  }

  function rejectAll() {
    const next: Record<number, "accepted" | "rejected"> = {};
    hunks.forEach((_, i) => {
      next[i] = "rejected";
    });
    setHunkStates(next);
  }

  return (
    <div className="flex flex-col">
      {/* File header + bulk actions */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3.5 py-2">
        {filePath && (
          <span className="flex-1 truncate font-mono text-[11.5px] text-[var(--color-muted)]">
            {filePath}
          </span>
        )}
        <button
          type="button"
          onClick={acceptAll}
          className="flex items-center gap-1 rounded-md bg-green-500/15 px-2 py-1 text-[11px] font-medium text-green-400 hover:bg-green-500/25 transition-colors"
        >
          <CheckSquare className="h-3 w-3" />
          全部接受
        </button>
        <button
          type="button"
          onClick={rejectAll}
          className="flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-500/20 transition-colors"
        >
          <XSquare className="h-3 w-3" />
          全部拒绝
        </button>
      </div>

      {/* Hunks */}
      <div className="flex flex-col divide-y divide-[var(--color-border)]">
        {hunks.map((hunk, i) => (
          <DiffHunk
            key={i}
            hunk={hunk}
            state={hunkStates[i]}
            onAccept={() => setHunk(i, "accepted")}
            onReject={() => setHunk(i, "rejected")}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Individual hunk ──────────────────────────────────────────────────────────

interface DiffHunkProps {
  hunk: GuiStructuredPatchHunk;
  state?: "accepted" | "rejected";
  onAccept: () => void;
  onReject: () => void;
}

function DiffHunk({ hunk, state, onAccept, onReject }: DiffHunkProps) {
  return (
    <div
      className={cn(
        "transition-colors",
        state === "accepted" && "bg-green-500/5",
        state === "rejected" && "bg-red-500/5 opacity-60",
      )}
    >
      {/* Hunk range header */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[var(--color-panel)]">
        <span className="font-mono text-[10.5px] text-[var(--color-muted)]">
          @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines}{" "}
          @@
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAccept}
            disabled={state === "accepted"}
            className={cn(
              "rounded-md p-1 transition-colors",
              state === "accepted"
                ? "text-green-400"
                : "text-[var(--color-muted)] hover:bg-green-500/15 hover:text-green-400",
            )}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onReject}
            disabled={state === "rejected"}
            className={cn(
              "rounded-md p-1 transition-colors",
              state === "rejected"
                ? "text-red-400"
                : "text-[var(--color-muted)] hover:bg-red-500/15 hover:text-red-400",
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Diff lines */}
      <div className="overflow-x-auto">
        <pre className="px-3.5 py-2 font-mono text-[12px] leading-5">
          {hunk.lines.map((line, i) => {
            const isAdd = line.startsWith("+");
            const isDel = line.startsWith("-");
            return (
              <div
                key={i}
                className={cn(
                  "whitespace-pre",
                  isAdd && "bg-green-500/12 text-green-300",
                  isDel && "bg-red-500/12 text-red-300",
                  !isAdd && !isDel && "text-[var(--color-muted)]",
                )}
              >
                {line}
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
