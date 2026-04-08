import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import xss from "xss";
import { getDefaultWhiteList } from "xss";
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
  const seenAssistantIdsRef = useRef<Set<string>>(new Set());
  const streamTimerRef = useRef<number | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const [streamingVisibleText, setStreamingVisibleText] = useState("");

  useEffect(() => {
    return () => {
      if (streamTimerRef.current !== null) {
        window.clearInterval(streamTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!snapshot?.messages?.length) {
      return;
    }

    const completedAssistants = snapshot.messages.filter(
      (message) =>
        message.role === "assistant" && message.status === "completed",
    );
    const newestCompleted = completedAssistants.at(-1);

    if (!newestCompleted) {
      return;
    }

    if (seenAssistantIdsRef.current.has(newestCompleted.id)) {
      return;
    }

    seenAssistantIdsRef.current.add(newestCompleted.id);

    const target = newestCompleted.text.trim() || "模型没有返回可展示的内容。";
    setStreamingMessageId(newestCompleted.id);
    setStreamingVisibleText("");

    if (streamTimerRef.current !== null) {
      window.clearInterval(streamTimerRef.current);
    }

    let index = 0;
    streamTimerRef.current = window.setInterval(() => {
      index = Math.min(target.length, index + 3);
      setStreamingVisibleText(target.slice(0, index));

      if (index >= target.length) {
        if (streamTimerRef.current !== null) {
          window.clearInterval(streamTimerRef.current);
        }
        streamTimerRef.current = null;
        setStreamingMessageId(null);
      }
    }, 16);
  }, [snapshot]);

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
          const shouldStreamThisMessage =
            isAssistant && message.id === streamingMessageId;
          const body = isPending
            ? ""
            : shouldStreamThisMessage
              ? streamingVisibleText
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
                {isPending ? (
                  <ThinkingState />
                ) : isAssistant ? (
                  <GuiMarkdownMessage text={body} />
                ) : (
                  <div className="whitespace-pre-wrap break-words">{body}</div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomAnchorRef} />
      </div>
    </div>
  );
}

const guiMarkdownWhitelist = {
  ...getDefaultWhiteList(),
  table: ["class"],
  thead: ["class"],
  tbody: ["class"],
  tr: ["class"],
  th: ["class", "colspan", "rowspan", "align"],
  td: ["class", "colspan", "rowspan", "align"],
};

function GuiMarkdownMessage({ text }: { text: string }) {
  const html = useMemo(() => {
    const rendered = marked.parse(text, {
      async: false,
      gfm: true,
      breaks: true,
    }) as string;
    return xss(rendered, {
      whiteList: guiMarkdownWhitelist,
    });
  }, [text]);

  return (
    <article
      className="gui-markdown"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function ThinkingState() {
  return (
    <div className="flex items-center gap-2 text-[13px] font-medium text-[var(--color-muted)]">
      <span>Thinking</span>
      <span className="inline-flex items-center gap-1" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-muted)] [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-muted)] [animation-delay:120ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-muted)] [animation-delay:240ms]" />
      </span>
    </div>
  );
}
