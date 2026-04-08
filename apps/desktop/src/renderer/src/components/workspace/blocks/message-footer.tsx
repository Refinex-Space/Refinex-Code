import type { DesktopGuiConversationMessage } from "../../../../../shared/contracts";

interface MessageFooterProps {
  message: DesktopGuiConversationMessage;
}

export function MessageFooter({ message }: MessageFooterProps) {
  const { usage, durationMs, model } = message;
  if (!usage && !durationMs && !model) return null;

  const parts: string[] = [];
  if (model) parts.push(model);
  if (usage) {
    const total = usage.inputTokens + usage.outputTokens;
    parts.push(`${total.toLocaleString()} tokens`);
    if (usage.costUsd !== undefined) {
      parts.push(`$${usage.costUsd.toFixed(4)}`);
    }
  }
  if (durationMs) {
    parts.push(`${(durationMs / 1000).toFixed(1)}s`);
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {parts.map((part, i) => (
        <span
          key={i}
          className="text-[11px] text-[var(--color-muted)] opacity-70"
        >
          {i > 0 && <span className="mr-1.5 opacity-40">·</span>}
          {part}
        </span>
      ))}
    </div>
  );
}
