import { startTransition, useEffect, useState } from "react";
import type { AppInfo, SidebarStateSnapshot } from "../../../shared/contracts";
import { useWorktreeStore } from "@renderer/stores/worktree";

export function useDesktopShell() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const applySnapshot = useWorktreeStore((state) => state.applySnapshot);

  const pushSnapshot = (snapshot: SidebarStateSnapshot) => {
    startTransition(() => {
      applySnapshot(snapshot);
    });
  };

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      window.desktopApp.getAppInfo(),
      window.desktopApp.getSidebarState(),
    ])
      .then(async ([info, snapshot]) => {
        if (cancelled) {
          return;
        }

        setAppInfo(info);
        if (snapshot.worktrees.length > 0) {
          pushSnapshot(snapshot);
          return;
        }

        const defaultWorkspacePath = info.defaultWorkspacePath;
        if (!defaultWorkspacePath) {
          pushSnapshot(snapshot);
          return;
        }

        const nextSnapshot = await window.desktopApp.openWorktree(defaultWorkspacePath);
        if (!cancelled) {
          pushSnapshot(nextSnapshot);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [applySnapshot]);

  const openWorkspace = async () => {
    const snapshot = await window.desktopApp.pickAndOpenWorktree();
    if (!snapshot) {
      return null;
    }

    pushSnapshot(snapshot);
    return snapshot;
  };

  const openWorktree = async (projectPath: string) => {
    const snapshot = await window.desktopApp.openWorktree(projectPath);
    pushSnapshot(snapshot);
    return snapshot;
  };

  const selectWorktree = async (worktreeId: string) => {
    const snapshot = await window.desktopApp.selectWorktree(worktreeId);
    pushSnapshot(snapshot);
    return snapshot;
  };

  const removeWorktree = async (worktreeId: string) => {
    const snapshot = await window.desktopApp.removeWorktree(worktreeId);
    pushSnapshot(snapshot);
    return snapshot;
  };

  const prepareSession = async (worktreeId: string) => {
    const snapshot = await window.desktopApp.prepareSession(worktreeId);
    pushSnapshot(snapshot);
    return snapshot;
  };

  const selectSession = async (worktreeId: string, sessionId: string) => {
    const snapshot = await window.desktopApp.selectSession(worktreeId, sessionId);
    pushSnapshot(snapshot);
    return snapshot;
  };

  const removeSession = async (worktreeId: string, sessionId: string) => {
    const snapshot = await window.desktopApp.removeSession(worktreeId, sessionId);
    pushSnapshot(snapshot);
    return snapshot;
  };

  const revealWorkspace = async (path: string) => {
    await window.desktopApp.revealInFinder(path);
  };

  return {
    appInfo,
    openWorkspace,
    openWorktree,
    selectWorktree,
    removeWorktree,
    prepareSession,
    selectSession,
    removeSession,
    revealWorkspace,
  };
}
