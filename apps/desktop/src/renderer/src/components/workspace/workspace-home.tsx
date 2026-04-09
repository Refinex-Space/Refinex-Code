import type {
  WorktreeRecord,
  WorktreeSessionRecord,
} from "../../../../shared/contracts";
import type {
  DesktopGuiConversationSendInput,
  DesktopGuiConversationSnapshot,
  GuiContentBlock,
  GuiBlockDelta,
} from "../../../../shared/contracts";
import { ChevronDown } from "lucide-react";
import { WorkspaceComposer } from "@renderer/components/workspace/workspace-composer";
import { WorkspaceConversation } from "@renderer/components/workspace/workspace-conversation";
import { WorkspaceEmptyState } from "@renderer/components/workspace/workspace-empty-state";
import { getErrorMessage } from "@renderer/lib/errors";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface WorkspaceHomeProps {
  worktrees: WorktreeRecord[];
  activeWorktree: WorktreeRecord | null;
  activeSession: WorktreeSessionRecord | null;
  onOpenWorkspace: () => Promise<unknown>;
  onSelectWorktree: (worktreeId: string) => Promise<unknown>;
}

export function WorkspaceHome({
  worktrees,
  activeWorktree,
  activeSession,
  onOpenWorkspace,
  onSelectWorktree,
}: WorkspaceHomeProps) {
  const [guiConversation, setGuiConversation] =
    useState<DesktopGuiConversationSnapshot | null>(null);
  const [guiConversationLoading, setGuiConversationLoading] = useState(false);
  const [guiConversationSending, setGuiConversationSending] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const threadSurfaceRef = useRef<HTMLDivElement | null>(null);
  const showThreadSurface = activeWorktree !== null && activeSession !== null;

  useEffect(() => {
    if (!activeSession?.id) {
      setGuiConversation(null);
      setGuiConversationLoading(false);
      return;
    }

    let cancelled = false;
    setGuiConversationLoading(true);

    void window.desktopApp
      .getGuiConversation(activeSession.id)
      .then((snapshot) => {
        if (!cancelled) {
          setGuiConversation(snapshot);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setGuiConversation(null);
          toast.error(getErrorMessage(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setGuiConversationLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeSession?.id]);

  useEffect(() => {
    const surface = threadSurfaceRef.current;
    if (!surface || !showThreadSurface) {
      setShowScrollToBottom(false);
      return;
    }

    const updateScrollState = () => {
      const distanceToBottom =
        surface.scrollHeight - surface.scrollTop - surface.clientHeight;
      setShowScrollToBottom(distanceToBottom > 120);
    };

    updateScrollState();
    surface.addEventListener("scroll", updateScrollState);
    return () => {
      surface.removeEventListener("scroll", updateScrollState);
    };
  }, [showThreadSurface, guiConversation?.updatedAt]);

  // Subscribe to streaming block deltas from the main process.
  // The delta contains the GUI sessionId, so we scope updates to the active session.
  // We match the pending assistant message by role+status instead of id because
  // the optimistic message has a temporary id that differs from the real one.
  useEffect(() => {
    const unsubscribe = window.desktopApp.onGuiConversationBlockDelta(
      (payload) => {
        console.log(
          `[GUI-DEBUG renderer] delta blockIdx=${payload.blockIndex} type=${payload.delta.type}`,
        );
        setGuiConversation((current) => {
          if (!current || current.sessionId !== payload.sessionId) {
            return current;
          }
          let changed = false;
          const messages = current.messages.map((msg) => {
            if (msg.role !== "assistant" || msg.status !== "pending") {
              return msg;
            }
            const updatedBlocks = applyBlockDelta(
              [...(msg.blocks ?? [])],
              payload.blockIndex,
              payload.delta,
            );
            changed = true;
            return { ...msg, blocks: updatedBlocks };
          });
          return changed ? { ...current, messages } : current;
        });
      },
    );
    return unsubscribe;
  }, []);

  const handleScrollToBottom = () => {
    const surface = threadSurfaceRef.current;
    if (!surface) {
      return;
    }

    surface.scrollTo({
      top: surface.scrollHeight,
      behavior: "smooth",
    });
  };

  const handleGuiConversationSend = async (
    input: Omit<
      DesktopGuiConversationSendInput,
      "sessionId" | "worktreePath"
    > & {
      prompt: string;
    },
  ) => {
    if (!activeSession?.id || !activeWorktree?.worktreePath) {
      return;
    }

    const createdAt = new Date().toISOString();
    setGuiConversationSending(true);
    setGuiConversation((current) => ({
      sessionId: activeSession.id,
      updatedAt: createdAt,
      messages: [
        ...(current?.messages ?? []),
        {
          id: `optimistic-user:${createdAt}`,
          role: "user",
          text: input.prompt.trim(),
          createdAt,
          status: "completed",
          providerId: input.providerId,
          model: input.model,
          effort: input.effort,
        },
        {
          id: `optimistic-assistant:${createdAt}`,
          role: "assistant",
          text: "",
          createdAt,
          status: "pending",
          providerId: input.providerId,
          model: input.model,
          effort: input.effort,
        },
      ],
    }));

    try {
      const snapshot = await window.desktopApp.sendGuiConversationMessage({
        sessionId: activeSession.id,
        worktreePath: activeWorktree.worktreePath,
        ...input,
      });
      setGuiConversation(snapshot);
    } catch (error) {
      setGuiConversation((current) => {
        if (!current) {
          return current;
        }

        const messages = [...current.messages];
        const assistantIndex = messages.findLastIndex(
          (message) => message.id === `optimistic-assistant:${createdAt}`,
        );
        if (assistantIndex >= 0) {
          messages[assistantIndex] = {
            ...messages[assistantIndex]!,
            status: "error",
            text: getErrorMessage(error),
          };
        }

        return {
          ...current,
          messages,
          updatedAt: new Date().toISOString(),
        };
      });
      toast.error(getErrorMessage(error));
    } finally {
      setGuiConversationSending(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-[var(--color-bg)]">
      <div className="relative flex h-full w-full flex-col items-center pb-6">
        {showThreadSurface ? (
          <>
            <div
              ref={threadSurfaceRef}
              className="flex min-h-0 w-full flex-1 overflow-y-auto pb-4 pt-4"
              data-thread-surface="content"
            >
              {!guiConversationLoading &&
              (!guiConversation || guiConversation.messages.length === 0) ? (
                <WorkspaceEmptyState
                  activeWorktree={activeWorktree}
                  worktrees={worktrees}
                  onOpenWorkspace={onOpenWorkspace}
                  onSelectWorktree={onSelectWorktree}
                />
              ) : (
                <WorkspaceConversation
                  snapshot={guiConversation}
                  isLoading={guiConversationLoading}
                />
              )}
            </div>
          </>
        ) : (
          <WorkspaceEmptyState
            activeWorktree={activeWorktree}
            worktrees={worktrees}
            onOpenWorkspace={onOpenWorkspace}
            onSelectWorktree={onSelectWorktree}
          />
        )}

        <div className="w-full">
          {showThreadSurface && showScrollToBottom ? (
            <div className="pointer-events-none flex w-full justify-center pb-2">
              <button
                type="button"
                onClick={handleScrollToBottom}
                className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-border)_86%,rgba(255,255,255,0.48))] bg-[color-mix(in_srgb,var(--color-panel)_82%,transparent)] text-[var(--color-muted)] shadow-[0_10px_28px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-2xl transition-all duration-150 hover:-translate-y-[1px] hover:text-[var(--color-fg)] dark:shadow-[0_12px_26px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.05)]"
                aria-label="回到底部"
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : null}

          <WorkspaceComposer
            activeSessionTitle={activeSession?.title ?? null}
            activeSessionId={activeSession?.id ?? null}
            activeWorktreePath={activeWorktree?.worktreePath ?? null}
            guiConversationSending={guiConversationSending}
            hasActiveSession={activeSession !== null}
            hasWorktree={activeWorktree !== null}
            onSendGuiMessage={handleGuiConversationSend}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Block delta application ──────────────────────────────────────────────────

function applyBlockDelta(
  blocks: GuiContentBlock[],
  blockIndex: number,
  delta: GuiBlockDelta,
): GuiContentBlock[] {
  const result = [...blocks];

  switch (delta.type) {
    case "block_added":
      result[blockIndex] = delta.block;
      break;
    case "text_delta": {
      const b = result[blockIndex];
      if (b?.type === "text") {
        result[blockIndex] = { ...b, text: b.text + delta.text };
      }
      break;
    }
    case "thinking_delta": {
      const b = result[blockIndex];
      if (b?.type === "thinking") {
        result[blockIndex] = { ...b, thinking: b.thinking + delta.thinking };
      }
      break;
    }
    case "tool_status": {
      const b = result[blockIndex];
      if (b?.type === "tool_use") {
        result[blockIndex] = { ...b, status: delta.status };
      }
      break;
    }
    case "tool_progress": {
      const b = result[blockIndex];
      if (b?.type === "tool_use") {
        result[blockIndex] = { ...b, progress: delta.progress };
      }
      break;
    }
    case "tool_result": {
      const b = result[blockIndex];
      if (b?.type === "tool_use") {
        result[blockIndex] = { ...b, result: delta.result };
      }
      break;
    }
  }

  return result;
}
