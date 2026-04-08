import type {
  WorktreeRecord,
  WorktreeSessionRecord,
} from "../../../../shared/contracts";
import type {
  DesktopGuiConversationSendInput,
  DesktopGuiConversationSnapshot,
} from "../../../../shared/contracts";
import { TerminalPanel } from "@renderer/components/terminal/terminal-panel";
import { WorkspaceComposer } from "@renderer/components/workspace/workspace-composer";
import { WorkspaceConversation } from "@renderer/components/workspace/workspace-conversation";
import { WorkspaceEmptyState } from "@renderer/components/workspace/workspace-empty-state";
import { resolveThreadConversationMode, useUIStore } from "@renderer/stores/ui";
import { getErrorMessage } from "@renderer/lib/errors";
import { useEffect, useState } from "react";
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
  const threadConversationModes = useUIStore(
    (state) => state.threadConversationModes,
  );
  const [guiConversation, setGuiConversation] =
    useState<DesktopGuiConversationSnapshot | null>(null);
  const [guiConversationLoading, setGuiConversationLoading] = useState(false);
  const [guiConversationSending, setGuiConversationSending] = useState(false);
  const activeConversationMode = resolveThreadConversationMode(
    threadConversationModes,
    activeSession?.id ?? null,
  );
  const showThreadSurface = activeWorktree !== null && activeSession !== null;

  useEffect(() => {
    if (activeConversationMode !== "gui" || !activeSession?.id) {
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
  }, [activeConversationMode, activeSession?.id]);

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
              className="flex min-h-0 w-full flex-1 overflow-y-auto pb-4 pt-4"
              data-thread-surface="content"
            >
              {activeConversationMode === "tui" ? (
                <div className="mx-auto flex min-h-0 w-full max-w-[920px] flex-1">
                  <TerminalPanel
                    sessionId={`thread-tui:${activeSession.id}`}
                    cwd={activeWorktree.worktreePath}
                    profile="thread-tui"
                    chrome="embedded"
                    persistOnUnmount
                    showCloseButton={false}
                  />
                </div>
              ) : !guiConversationLoading &&
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
          <WorkspaceComposer
            activeSessionTitle={activeSession?.title ?? null}
            activeSessionId={activeSession?.id ?? null}
            activeWorktreePath={activeWorktree?.worktreePath ?? null}
            conversationMode={activeConversationMode}
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
