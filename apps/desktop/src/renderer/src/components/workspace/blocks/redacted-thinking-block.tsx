import { Lock } from "lucide-react";

export function RedactedThinkingBlock() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2.5">
      <Lock className="h-3.5 w-3.5 flex-shrink-0 text-[var(--color-muted)]" />
      <span className="text-[12.5px] text-[var(--color-muted)]">
        思考内容已加密
      </span>
    </div>
  );
}
