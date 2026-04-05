import { create } from "zustand";

export interface WorkspaceItem {
  id: string;
  path: string;
  label: string;
  openedAt: string;
}

function getWorkspaceLabel(pathname: string) {
  return pathname.split(/[/\\]/).filter(Boolean).at(-1) ?? pathname;
}

function toWorkspace(pathname: string): WorkspaceItem {
  return {
    id: pathname,
    path: pathname,
    label: getWorkspaceLabel(pathname),
    openedAt: new Date().toISOString(),
  };
}

interface WorkspaceState {
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string | null;
  rememberWorkspace: (pathname: string) => WorkspaceItem;
  setActiveWorkspace: (workspaceId: string) => void;
  removeWorkspace: (workspaceId: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  activeWorkspaceId: null,
  rememberWorkspace: (pathname) => {
    const workspace = toWorkspace(pathname);
    set((state) => ({
      workspaces: [workspace, ...state.workspaces.filter((item) => item.id !== workspace.id)],
      activeWorkspaceId: workspace.id,
    }));
    return workspace;
  },
  setActiveWorkspace: (workspaceId) => {
    set({
      activeWorkspaceId: workspaceId,
    });
  },
  removeWorkspace: (workspaceId) => {
    set((state) => {
      const nextWorkspaces = state.workspaces.filter((workspace) => workspace.id !== workspaceId);
      return {
        workspaces: nextWorkspaces,
        activeWorkspaceId:
          state.activeWorkspaceId === workspaceId
            ? (nextWorkspaces[0]?.id ?? null)
            : state.activeWorkspaceId,
      };
    });
  },
}));
