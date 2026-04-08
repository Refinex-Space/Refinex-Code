import { useUIStore } from "@renderer/stores/ui";
import { cn } from "@renderer/lib/cn";

interface ThreadModeToggleProps {
  sessionId: string | null;
  className?: string;
}

export function ThreadModeToggle({
  sessionId,
  className,
}: ThreadModeToggleProps) {
  const threadConversationModes = useUIStore(
    (state) => state.threadConversationModes,
  );
  const setThreadConversationMode = useUIStore(
    (state) => state.setThreadConversationMode,
  );

  if (!sessionId) {
    return null;
  }

  const activeMode = threadConversationModes[sessionId] ?? "gui";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--color-border)_82%,rgba(255,255,255,0.45))] bg-[color-mix(in_srgb,var(--color-thread-mode-toggle-bg)_82%,transparent)] p-[3px] backdrop-blur-2xl dark:shadow-[0_12px_28px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.05)]",
        className,
      )}
      role="tablist"
      aria-label="线程交互模式"
    >
      {(["gui", "tui"] as const).map((mode) => {
        const label = mode === "gui" ? "GUI" : "TUI";
        const active = activeMode === mode;

        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={`切换到 ${label} 模式`}
            onClick={() => {
              setThreadConversationMode(sessionId, mode);
            }}
            className={
              active
                ? "flex h-6 min-w-[38px] items-center justify-center rounded-full border border-[var(--color-thread-mode-toggle-active-border)] bg-[var(--color-thread-mode-toggle-active-bg)] px-2 text-[10px] font-semibold tracking-[0.06em] text-[var(--color-thread-mode-toggle-active-fg)] shadow-[var(--shadow-thread-mode-toggle-active),inset_0_1px_0_rgba(255,255,255,0.62)] backdrop-blur-xl transition-colors duration-150"
                : "flex h-6 min-w-[38px] items-center justify-center rounded-full px-2 text-[10px] font-semibold tracking-[0.06em] text-[var(--color-thread-mode-toggle-inactive-fg)] transition-colors duration-150 hover:bg-[var(--color-thread-mode-toggle-hover-bg)] hover:text-[var(--color-thread-mode-toggle-hover-fg)]"
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
