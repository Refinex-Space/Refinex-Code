import { startTransition, useEffect, useState } from "react";
import type { AppInfo } from "../../../shared/contracts";
import { useWorkspaceStore } from "@renderer/stores/workspace";

export function useDesktopShell() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const rememberWorkspace = useWorkspaceStore((state) => state.rememberWorkspace);

  useEffect(() => {
    let cancelled = false;

    void window.desktopApp.getAppInfo().then((info) => {
      if (cancelled) {
        return;
      }

      setAppInfo(info);
      const defaultWorkspacePath = info.defaultWorkspacePath;
      if (defaultWorkspacePath) {
        startTransition(() => {
          rememberWorkspace(defaultWorkspacePath);
        });
      }
    }).catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [rememberWorkspace]);

  const openWorkspace = async () => {
    const workspacePath = await window.desktopApp.pickWorkspace();
    if (!workspacePath) {
      return null;
    }

    rememberWorkspace(workspacePath);
    return workspacePath;
  };

  const revealWorkspace = async (workspacePath: string) => {
    await window.desktopApp.revealInFinder(workspacePath);
  };

  return {
    appInfo,
    openWorkspace,
    revealWorkspace,
  };
}
