import type { WorktreeRecord, WorktreeSessionRecord } from "../../../../shared/contracts";
import { TerminalPanel } from "@renderer/components/terminal/terminal-panel";
import { WorkspaceComposer } from "@renderer/components/workspace/workspace-composer";
import { WorkspaceEmptyState } from "@renderer/components/workspace/workspace-empty-state";
import {
  resolveThreadConversationMode,
  useUIStore,
} from "@renderer/stores/ui";

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
  const activeConversationMode = resolveThreadConversationMode(
    threadConversationModes,
    activeSession?.id ?? null,
  );
  const showThreadSurface = activeWorktree !== null && activeSession !== null;

  return (
    <div className="relative flex h-full min-h-0 justify-center overflow-hidden bg-[var(--color-bg)] px-4">
      <div className="relative mx-auto flex h-full w-full max-w-[960px] flex-col items-center pb-6">
        {showThreadSurface ? (
          <>
            <div
              className="mx-auto flex min-h-0 w-full max-w-[920px] flex-1 pb-4 pt-4"
              data-thread-surface="content"
            >
              {activeConversationMode === "tui" ? (
                <TerminalPanel
                  sessionId={`thread-tui:${activeSession.id}`}
                  cwd={activeWorktree.worktreePath}
                  profile="thread-tui"
                  chrome="embedded"
                  persistOnUnmount
                  showCloseButton={false}
                />
              ) : (
                <WorkspaceEmptyState
                  activeWorktree={activeWorktree}
                  worktrees={worktrees}
                  onOpenWorkspace={onOpenWorkspace}
                  onSelectWorktree={onSelectWorktree}
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
            hasActiveSession={activeSession !== null}
            hasWorktree={activeWorktree !== null}
          />
        </div>
      </div>
    </div>
  );
}
