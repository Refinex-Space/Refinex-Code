import { startTransition, useCallback, useEffect, useState } from "react";
import type {
  AppInfo,
  RemoteSkillCatalog,
  SidebarStateSnapshot,
  SkillDownloadResult,
  SkillFilePreview,
  SkillMutationResult,
  SkillSnapshot,
  SkillUploadResult,
} from "../../../shared/contracts";
import { useWorktreeStore } from "@renderer/stores/worktree";

export function useDesktopShell() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const applySnapshot = useWorktreeStore((state) => state.applySnapshot);

  const pushSnapshot = useCallback((snapshot: SidebarStateSnapshot) => {
    startTransition(() => {
      applySnapshot(snapshot);
    });
  }, [applySnapshot]);

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

  const openWorkspace = useCallback(async () => {
    const snapshot = await window.desktopApp.pickAndOpenWorktree();
    if (!snapshot) {
      return null;
    }

    pushSnapshot(snapshot);
    return snapshot;
  }, [pushSnapshot]);

  const openWorktree = useCallback(async (projectPath: string) => {
    const snapshot = await window.desktopApp.openWorktree(projectPath);
    pushSnapshot(snapshot);
    return snapshot;
  }, [pushSnapshot]);

  const selectWorktree = useCallback(async (worktreeId: string) => {
    const snapshot = await window.desktopApp.selectWorktree(worktreeId);
    pushSnapshot(snapshot);
    return snapshot;
  }, [pushSnapshot]);

  const removeWorktree = useCallback(async (worktreeId: string) => {
    const snapshot = await window.desktopApp.removeWorktree(worktreeId);
    pushSnapshot(snapshot);
    return snapshot;
  }, [pushSnapshot]);

  const prepareSession = useCallback(async (worktreeId: string) => {
    const snapshot = await window.desktopApp.prepareSession(worktreeId);
    pushSnapshot(snapshot);
    return snapshot;
  }, [pushSnapshot]);

  const createSession = useCallback(
    async (worktreeId: string, title?: string | null) => {
      const snapshot = await window.desktopApp.createSession({
        worktreeId,
        title: title ?? null,
      });
      pushSnapshot(snapshot);
      return snapshot;
    },
    [pushSnapshot],
  );

  const selectSession = useCallback(async (worktreeId: string, sessionId: string) => {
    const snapshot = await window.desktopApp.selectSession(worktreeId, sessionId);
    pushSnapshot(snapshot);
    return snapshot;
  }, [pushSnapshot]);

  const removeSession = useCallback(async (worktreeId: string, sessionId: string) => {
    const snapshot = await window.desktopApp.removeSession(worktreeId, sessionId);
    pushSnapshot(snapshot);
    return snapshot;
  }, [pushSnapshot]);

  const revealWorkspace = useCallback(async (path: string) => {
    await window.desktopApp.revealInFinder(path);
  }, []);

  const getSkillsSnapshot = useCallback(async (): Promise<SkillSnapshot> => {
    return window.desktopApp.getSkillsSnapshot();
  }, []);

  const readSkillFile = useCallback(async (path: string): Promise<SkillFilePreview> => {
    return window.desktopApp.readSkillFile(path);
  }, []);

  const replaceSkill = useCallback(async (skillRoot: string): Promise<SkillMutationResult> => {
    if (typeof window.desktopApp.replaceSkill !== "function") {
      throw new Error("技能管理桥接未更新，请重启 `bun run desktop:dev`。");
    }

    return window.desktopApp.replaceSkill(skillRoot);
  }, []);

  const downloadSkill = useCallback(async (skillRoot: string): Promise<SkillDownloadResult> => {
    if (typeof window.desktopApp.downloadSkill !== "function") {
      throw new Error("技能管理桥接未更新，请重启 `bun run desktop:dev`。");
    }

    return window.desktopApp.downloadSkill(skillRoot);
  }, []);

  const uninstallSkill = useCallback(async (skillRoot: string): Promise<SkillMutationResult> => {
    if (typeof window.desktopApp.uninstallSkill !== "function") {
      throw new Error("技能管理桥接未更新，请重启 `bun run desktop:dev`。");
    }

    return window.desktopApp.uninstallSkill(skillRoot);
  }, []);

  const uploadSkill = useCallback(async (): Promise<SkillUploadResult> => {
    if (typeof window.desktopApp.uploadSkill !== "function") {
      throw new Error("技能管理桥接未更新，请重启 `bun run desktop:dev`。");
    }

    return window.desktopApp.uploadSkill();
  }, []);

  const getRemoteSkillCatalog = useCallback(async (): Promise<RemoteSkillCatalog> => {
    if (typeof window.desktopApp.getRemoteSkillCatalog !== "function") {
      throw new Error("远程 Skill 桥接未更新，请重启 `bun run desktop:dev`。");
    }

    return window.desktopApp.getRemoteSkillCatalog();
  }, []);

  const installRemoteSkill = useCallback(async (skillId: string): Promise<SkillMutationResult> => {
    if (typeof window.desktopApp.installRemoteSkill !== "function") {
      throw new Error("远程 Skill 桥接未更新，请重启 `bun run desktop:dev`。");
    }

    return window.desktopApp.installRemoteSkill(skillId);
  }, []);

  const supportsSkillActions =
    typeof window.desktopApp.replaceSkill === "function" &&
    typeof window.desktopApp.downloadSkill === "function" &&
    typeof window.desktopApp.uninstallSkill === "function" &&
    typeof window.desktopApp.uploadSkill === "function" &&
    typeof window.desktopApp.getRemoteSkillCatalog === "function" &&
    typeof window.desktopApp.installRemoteSkill === "function";

  return {
    appInfo,
    openWorkspace,
    openWorktree,
    selectWorktree,
    removeWorktree,
    prepareSession,
    createSession,
    selectSession,
    removeSession,
    revealWorkspace,
    getSkillsSnapshot,
    readSkillFile,
    replaceSkill,
    downloadSkill,
    uninstallSkill,
    uploadSkill,
    getRemoteSkillCatalog,
    installRemoteSkill,
    supportsSkillActions,
  };
}
