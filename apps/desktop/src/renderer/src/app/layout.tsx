import { motion } from "framer-motion";
import {
  Command,
  MoonStar,
  PanelLeftClose,
  PanelLeftOpen,
  SquareTerminal,
} from "lucide-react";
import {
  useEffect,
  useEffectEvent,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { toast } from "sonner";
import { CommandPalette } from "@renderer/components/command/command-palette";
import { McpQuickAccessMenu } from "@renderer/components/mcp/mcp-quick-access-menu";
import { AppearanceSettingsPanel } from "@renderer/components/settings/appearance-settings-panel";
import { McpSettingsPanel } from "@renderer/components/settings/mcp-settings-panel";
import { ProviderSettingsPanel } from "@renderer/components/settings/provider-settings-panel";
import { SettingsSidebar } from "@renderer/components/settings/settings-sidebar";
import { WorkspaceSidebar } from "@renderer/components/sidebar/workspace-sidebar";
import { TerminalPanel } from "@renderer/components/terminal/terminal-panel";
import { Button } from "@renderer/components/ui/button";
import { Kbd } from "@renderer/components/ui/kbd";
import { Tooltip } from "@renderer/components/ui/tooltip";
import { WorkspaceHome } from "@renderer/components/workspace/workspace-home";
import { useDesktopShell } from "@renderer/hooks/use-desktop-shell";
import { useKeyboardShortcuts } from "@renderer/hooks/use-keyboard-shortcuts";
import { getErrorMessage } from "@renderer/lib/errors";
import {
  findActiveSession,
  findActiveWorktree,
  useWorktreeStore,
} from "@renderer/stores/worktree";
import { getNextThemeLabel, useUIStore } from "@renderer/stores/ui";

export function Layout() {
  useKeyboardShortcuts();

  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const sidebarWidth = useUIStore((state) => state.sidebarWidth);
  const shellView = useUIStore((state) => state.shellView);
  const settingsSection = useUIStore((state) => state.settingsSection);
  const terminalOpen = useUIStore((state) => state.terminalOpen);
  const theme = useUIStore((state) => state.theme);
  const openSettings = useUIStore((state) => state.openSettings);
  const closeSettings = useUIStore((state) => state.closeSettings);
  const setSettingsSection = useUIStore((state) => state.setSettingsSection);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const setSidebarWidth = useUIStore((state) => state.setSidebarWidth);
  const toggleTerminal = useUIStore((state) => state.toggleTerminal);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const setCommandPaletteOpen = useUIStore(
    (state) => state.setCommandPaletteOpen,
  );
  const [isSidebarResizing, setIsSidebarResizing] = useState(false);
  const worktrees = useWorktreeStore((state) => state.worktrees);
  const activeWorktree = useWorktreeStore((state) => findActiveWorktree(state));
  const activeSession = useWorktreeStore((state) => findActiveSession(state));
  const {
    appInfo,
    openWorkspace,
    revealWorkspace,
    selectWorktree,
    prepareSession,
    selectSession,
    removeSession,
    removeWorktree,
  } = useDesktopShell();
  const isSettingsView = shellView === "settings";

  const handleOpenWorkspace = async () => {
    try {
      await openWorkspace();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleRevealWorkspace = async (workspacePath: string) => {
    try {
      await revealWorkspace(workspacePath);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const clampSidebarToViewport = useEffectEvent(() => {
    if (typeof window === "undefined") {
      return;
    }

    setSidebarWidth(sidebarWidth, window.innerWidth);
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleWindowResize = () => {
      clampSidebarToViewport();
    };

    handleWindowResize();
    window.addEventListener("resize", handleWindowResize);

    return () => {
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [clampSidebarToViewport]);

  const handleSidebarResizeStart = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!sidebarOpen) {
      return;
    }

    event.preventDefault();

    const startX = event.clientX;
    const startWidth = sidebarWidth;
    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;

    setIsSidebarResizing(true);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      setSidebarWidth(startWidth + delta, window.innerWidth);
    };

    const stopResizing = () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      setIsSidebarResizing(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      window.removeEventListener("pointercancel", stopResizing);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    window.addEventListener("pointercancel", stopResizing);
  };

  return (
    <div className="relative flex h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-fg)]">
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? sidebarWidth : 0 }}
        transition={
          isSidebarResizing
            ? { duration: 0 }
            : { duration: 0.2, ease: "easeInOut" }
        }
        className="relative z-10 shrink-0 overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-sidebar)]"
      >
        <div className="h-[var(--titlebar-height)]" />
        {isSettingsView ? (
          <SettingsSidebar
            activeSection={settingsSection}
            onSelectSection={setSettingsSection}
            onBackToApp={closeSettings}
          />
        ) : (
          <WorkspaceSidebar
            onOpenWorkspace={handleOpenWorkspace}
            onOpenSettings={() => openSettings("appearance")}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            onSelectWorktree={selectWorktree}
            onPrepareSession={prepareSession}
            onSelectSession={selectSession}
            onRemoveSession={removeSession}
            onRemoveWorktree={removeWorktree}
          />
        )}
        {sidebarOpen ? (
          <div
            className="absolute top-0 right-0 h-full w-4 cursor-col-resize touch-none"
            data-no-drag
            onPointerDown={handleSidebarResizeStart}
          />
        ) : null}
      </motion.aside>

      <section className="relative z-10 flex min-w-0 flex-1 flex-col bg-[var(--color-bg)]">
        <header
          className="flex h-[var(--titlebar-height)] items-center justify-between gap-4 px-5"
          data-window-drag-region
        >
          <div className="min-w-0 flex-1" data-window-drag-region />

          {isSettingsView ? null : (
            <div className="flex items-center gap-2" data-no-drag>
              <Tooltip
                content={
                  <span className="inline-flex items-center gap-2">
                    <span>{sidebarOpen ? "收起侧边栏" : "展开侧边栏"}</span>
                    <Kbd className="h-5 px-1.5 text-[9px] tracking-[0.08em]">
                      ⌘B
                    </Kbd>
                  </span>
                }
              >
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                  onClick={toggleSidebar}
                  title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                  className="h-8 w-8 rounded-lg bg-transparent hover:bg-[var(--color-surface)]/72 hover:backdrop-blur-md focus-visible:bg-[var(--color-surface)]/72 focus-visible:backdrop-blur-md active:bg-[var(--color-surface-strong)]"
                >
                  {sidebarOpen ? (
                    <PanelLeftClose className="h-4 w-4" />
                  ) : (
                    <PanelLeftOpen className="h-4 w-4" />
                  )}
                </Button>
              </Tooltip>

              <McpQuickAccessMenu onOpenSettings={() => openSettings("mcp")} />

              <Tooltip
                content={
                  <span className="inline-flex items-center gap-2">
                    <span>{terminalOpen ? "关闭终端" : "打开终端"}</span>
                    <Kbd className="h-5 px-1.5 text-[9px] tracking-[0.08em]">
                      ⌘T
                    </Kbd>
                  </span>
                }
              >
                <Button
                  variant={terminalOpen ? "secondary" : "ghost"}
                  size="icon"
                  aria-label={terminalOpen ? "Hide terminal" : "Show terminal"}
                  onClick={toggleTerminal}
                  title="Toggle terminal"
                  className="h-8 w-8 rounded-lg"
                >
                  <SquareTerminal className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip
                content={
                  <span className="inline-flex items-center gap-2">
                    <span>命令面板</span>
                    <Kbd className="h-5 px-1.5 text-[9px] tracking-[0.08em]">
                      ⌘K
                    </Kbd>
                  </span>
                }
              >
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Open command palette"
                  onClick={() => setCommandPaletteOpen(true)}
                  title="Command palette"
                  className="h-8 w-8 rounded-lg"
                >
                  <Command className="h-4 w-4" />
                </Button>
              </Tooltip>

              <Tooltip
                content={
                  <span className="inline-flex items-center gap-2">
                    <span>{`切换到 ${getNextThemeLabel(theme)} 主题`}</span>
                    <Kbd className="h-5 px-1.5 text-[9px] tracking-[0.08em]">
                      ⌘⇧T
                    </Kbd>
                  </span>
                }
              >
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Cycle theme to ${getNextThemeLabel(theme)}`}
                  onClick={toggleTheme}
                  title={`Cycle theme to ${getNextThemeLabel(theme)}`}
                  className="h-8 w-8 rounded-lg"
                >
                  <MoonStar className="h-4 w-4" />
                </Button>
              </Tooltip>
            </div>
          )}
        </header>

        <main className={isSettingsView ? "min-h-0 flex-1" : "min-h-0 flex-1 px-4 pb-4"}>
          {isSettingsView ? (
            settingsSection === "appearance" ? (
              <AppearanceSettingsPanel />
            ) : settingsSection === "provider" ? (
              <ProviderSettingsPanel />
            ) : settingsSection === "mcp" ? (
              <McpSettingsPanel />
            ) : null
          ) : (
            <WorkspaceHome
              worktrees={worktrees}
              activeWorktree={activeWorktree}
              activeSession={activeSession}
              onOpenWorkspace={handleOpenWorkspace}
              onSelectWorktree={selectWorktree}
            />
          )}
        </main>

        {terminalOpen && !isSettingsView ? (
          <TerminalPanel
            sessionId={
              activeSession?.id ?? activeWorktree?.id ?? "global-shell"
            }
            cwd={
              activeWorktree?.worktreePath ??
              appInfo?.defaultWorkspacePath ??
              undefined
            }
          />
        ) : null}
      </section>

      <CommandPalette
        onOpenWorkspace={handleOpenWorkspace}
        onRevealWorkspace={handleRevealWorkspace}
        onPrepareSession={prepareSession}
        onSelectWorktree={selectWorktree}
        onSelectSession={selectSession}
      />
    </div>
  );
}
