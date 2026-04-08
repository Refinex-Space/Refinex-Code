import { useEffect, useRef } from "react";
import type {
  DesktopGuiConversationMessage,
  DesktopGuiConversationSnapshot,
} from "../../../../shared/contracts";
import { cn } from "@renderer/lib/cn";
import { BlockRenderer } from "./block-renderer";
import { StreamingMarkdown } from "./streaming-markdown";
import { PendingIndicator } from "./blocks/pending-indicator";
import { MessageFooter } from "./blocks/message-footer";

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
    bottomAnchorRef.current?.scrollIntoView({ block: "end" });
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
      <div className="flex w-full flex-col gap-5 pb-6">
        {snapshot.messages.map((message) => (
          <MessageRow key={message.id} message={message} />
        ))}
        <div ref={bottomAnchorRef} />
      </div>
    </div>
  );
}

// ─── MessageRow ───────────────────────────────────────────────────────────────

interface MessageRowProps {
  message: DesktopGuiConversationMessage;
}

function MessageRow({ message }: MessageRowProps) {
  if (message.role === "user") {
    return <UserMessageBubble message={message} />;
  }
  return <AssistantMessageRow message={message} />;
}

// ─── User bubble ──────────────────────────────────────────────────────────────

function UserMessageBubble({
  message,
}: {
  message: DesktopGuiConversationMessage;
}) {
  return (
    <div className="flex w-full justify-end">
      <div
        className={cn(
          "max-w-[min(85%,44rem)] rounded-[20px] rounded-br-[6px]",
          "bg-[var(--color-surface-strong)] px-4 py-3",
          "text-[14px] leading-7 text-[var(--color-fg)]",
          "whitespace-pre-wrap break-words",
        )}
      >
        {message.text}
      </div>
    </div>
  );
}

// ─── Assistant row ────────────────────────────────────────────────────────────

function AssistantMessageRow({
  message,
}: {
  message: DesktopGuiConversationMessage;
}) {
  const isPending = message.status === "pending";
  const isError = message.status === "error";

  return (
    <div className="flex w-full justify-start">
      <div
        className={cn(
          "w-full max-w-[760px] text-[14px] leading-7 text-[var(--color-fg)]",
          isError &&
            "rounded-xl border border-red-500/20 bg-red-500/6 px-4 py-3",
        )}
      >
        {isPending && (!message.blocks || message.blocks.length === 0) ? (
          <PendingIndicator />
        ) : message.blocks && message.blocks.length > 0 ? (
          <AssistantBlockList message={message} />
        ) : (
          <LegacyAssistantText message={message} />
        )}
        {!isPending && <MessageFooter message={message} />}
      </div>
    </div>
  );
}

// ─── Block list (new format) ──────────────────────────────────────────────────

function AssistantBlockList({
  message,
}: {
  message: DesktopGuiConversationMessage;
}) {
  const isStreaming = message.status === "pending";
  return (
    <div className="flex flex-col gap-3">
      {message.blocks!.map((block, i) => (
        <BlockRenderer key={i} block={block} isStreaming={isStreaming} />
      ))}
    </div>
  );
}

// ─── Legacy text fallback ─────────────────────────────────────────────────────

function LegacyAssistantText({
  message,
}: {
  message: DesktopGuiConversationMessage;
}) {
  const text = message.text.trim() || "模型没有返回可展示的内容。";
  return <StreamingMarkdown text={text} />;
}
