import { ShieldCheck, ShieldX, Shield } from "lucide-react";
import { cn } from "@renderer/lib/cn";

export type ApprovalAction = "allow_once" | "allow_always" | "deny";

interface ApprovalOverlayProps {
  toolName: string;
  description?: string;
  command?: string;
  filePath?: string;
  onDecide: (action: ApprovalAction) => void;
  isResolved?: boolean;
  resolvedAction?: ApprovalAction;
}

const resolvedLabels: Record<
  ApprovalAction,
  { text: string; colorClass: string }
> = {
  allow_once: { text: "已允许（本次）", colorClass: "text-green-400" },
  allow_always: { text: "已永久允许", colorClass: "text-green-400" },
  deny: { text: "已拒绝", colorClass: "text-red-400" },
};

export function ApprovalOverlay({
  toolName,
  description,
  command,
  filePath,
  onDecide,
  isResolved,
  resolvedAction,
}: ApprovalOverlayProps) {
  if (isResolved && resolvedAction) {
    const { text, colorClass } = resolvedLabels[resolvedAction];
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2.5">
        <Shield className={cn("h-4 w-4", colorClass)} />
        <span className={cn("text-[12.5px] font-medium", colorClass)}>
          {text}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/6 p-4">
      <div className="mb-3 flex items-start gap-2.5">
        <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-amber-200">
            AI 请求执行：{toolName}
          </p>
          {description && (
            <p className="mt-0.5 text-[12px] text-amber-300/70">
              {description}
            </p>
          )}
        </div>
      </div>

      {(command ?? filePath) && (
        <div className="mb-3 overflow-x-auto rounded-lg bg-amber-900/20 px-3 py-2">
          <code className="font-mono text-[12px] text-amber-200">
            {command ?? filePath}
          </code>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onDecide("allow_once")}
          className="flex items-center gap-1.5 rounded-lg bg-green-500/20 px-3 py-1.5 text-[12.5px] font-medium text-green-300 hover:bg-green-500/30 transition-colors"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          允许一次
        </button>
        <button
          type="button"
          onClick={() => onDecide("allow_always")}
          className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-[12.5px] font-medium text-green-400/70 hover:bg-green-500/20 transition-colors"
        >
          永久允许
        </button>
        <button
          type="button"
          onClick={() => onDecide("deny")}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-1.5 text-[12.5px] font-medium text-red-400 hover:bg-red-500/25 transition-colors"
        >
          <ShieldX className="h-3.5 w-3.5" />
          拒绝
        </button>
      </div>
    </div>
  );
}
