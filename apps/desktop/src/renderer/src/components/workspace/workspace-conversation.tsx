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
    return (
      <div className="flex h-full w-full items-center justify-center px-6">
        <div className="max-w-md rounded-[24px] border border-[var(--color-border)] bg-[var(--color-panel)] px-6 py-5 text-center shadow-[var(--shadow-panel)]">
          <div className="text-[15px] font-medium text-[var(--color-fg)]">
            开始一段 GUI 对话
          </div>
          <div className="mt-2 text-[13px] leading-6 text-[var(--color-muted)]">
            发送一条消息后，AI 响应会直接展示在这里。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto px-2 py-2">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 pb-6">
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
                  "max-w-[min(88%,46rem)] rounded-[22px] px-4 py-3 text-[14px] leading-7 shadow-[var(--shadow-panel)]",
                  isAssistant
                    ? "border border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-fg)]"
                    : "bg-[var(--color-fg)] text-[var(--color-bg)]",
                  isError &&
                    "border-[rgba(239,68,68,0.24)] bg-[rgba(239,68,68,0.08)] text-[var(--color-fg)]",
                  isPending && "text-[var(--color-muted)]",
                )}
              >
                <div className="whitespace-pre-wrap break-words">{body}</div>
                <div
                  className={cn(
                    "mt-2 text-[11px]",
                    isAssistant
                      ? "text-[var(--color-muted)]"
                      : "text-[var(--color-bg)]/72",
                  )}
                >
                  {isAssistant ? "AI" : "你"}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomAnchorRef} />
      </div>
    </div>
  );
}
