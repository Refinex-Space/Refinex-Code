import { useEffect, useRef } from "react";
import type { DesktopGuiConversationSnapshot } from "../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";

interface WorkspaceConversationProps {
  snapshot: DesktopGuiConversationSnapshot | null;
  isLoading: boolean;
}

export function WorkspaceConversation({
  snapshot,
  isLoading,
}: WorkspaceConversationProps) {
  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({
      block: "end",
    });
  }, [snapshot]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center px-6">
        <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-2 text-[13px] text-[var(--color-muted)]">
          正在加载对话…
        </div>
      </div>
    );
  }

  if (!snapshot || snapshot.messages.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[920px] flex-col py-2">
      <div className="flex w-full flex-col gap-4 pb-6">
        {snapshot.messages.map((message) => {
          const isAssistant = message.role === "assistant";
          const isPending = message.status === "pending";
          const isError = message.status === "error";
          const body = isPending
            ? "正在思考…"
            : message.text.trim() || "模型没有返回可展示的内容。";

          return (
            <div
              key={message.id}
              className={cn(
                "flex w-full",
                isAssistant ? "justify-start" : "justify-end",
              )}
            >
              <div
                className={cn(
                  "max-w-[min(88%,46rem)] rounded-[22px] px-4 py-3 text-[14px] leading-7",
                  isAssistant
                    ? "bg-transparent text-[var(--color-fg)]"
                    : "bg-[var(--color-surface-strong)] text-[var(--color-fg)]",
                  isError &&
                    "border-[rgba(239,68,68,0.24)] bg-[rgba(239,68,68,0.08)] text-[var(--color-fg)]",
                  isPending && "text-[var(--color-muted)]",
                )}
              >
                <div className="whitespace-pre-wrap break-words">{body}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomAnchorRef} />
      </div>
    </div>
  );
}
