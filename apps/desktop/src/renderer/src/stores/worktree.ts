import { create } from "zustand";
import type {
  SidebarStateSnapshot,
  WorktreeRecord,
  WorktreeSessionRecord,
} from "../../../shared/contracts";

export const emptySidebarState: SidebarStateSnapshot = {
  worktrees: [],
  activeWorktreeId: null,
  activeSessionId: null,
  storageRoot: "",
};

interface WorktreeState extends SidebarStateSnapshot {
  hydrated: boolean;
  applySnapshot: (snapshot: SidebarStateSnapshot) => void;
  reset: () => void;
}

export const useWorktreeStore = create<WorktreeState>((set) => ({
  ...emptySidebarState,
  hydrated: false,
  applySnapshot: (snapshot) => {
    set({
      ...snapshot,
      hydrated: true,
    });
  },
  reset: () => {
    set({
      ...emptySidebarState,
      hydrated: false,
    });
  },
}));

export function findActiveWorktree(state: SidebarStateSnapshot): WorktreeRecord | null {
  return state.worktrees.find((worktree) => worktree.id === state.activeWorktreeId) ?? null;
}

export function findActiveSession(state: SidebarStateSnapshot): WorktreeSessionRecord | null {
  const activeWorktree = findActiveWorktree(state);
  if (!activeWorktree) {
    return null;
  }

  return activeWorktree.sessions.find((session) => session.id === state.activeSessionId) ?? null;
}
