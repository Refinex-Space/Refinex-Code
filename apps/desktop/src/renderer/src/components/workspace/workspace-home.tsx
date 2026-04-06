import type { WorktreeRecord, WorktreeSessionRecord } from "../../../../shared/contracts";
import { WorkspaceComposer } from "@renderer/components/workspace/workspace-composer";
import { WorkspaceEmptyState } from "@renderer/components/workspace/workspace-empty-state";

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
  return (
    <div className="relative flex h-full min-h-0 justify-center overflow-hidden px-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at top, rgba(96,165,250,0.16), transparent 34%), radial-gradient(circle at bottom left, rgba(52,211,153,0.12), transparent 28%)",
        }}
      />

      <div className="relative mx-auto flex h-full w-full max-w-[960px] flex-col items-center pb-6">
        <WorkspaceEmptyState
          activeWorktree={activeWorktree}
          worktrees={worktrees}
          onOpenWorkspace={onOpenWorkspace}
          onSelectWorktree={onSelectWorktree}
        />

        <div className="w-full">
          <WorkspaceComposer
            activeSessionTitle={activeSession?.title ?? null}
            hasActiveSession={activeSession !== null}
            hasWorktree={activeWorktree !== null}
          />
        </div>
      </div>
    </div>
  );
}
