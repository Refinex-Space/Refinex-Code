import { motion } from "framer-motion";
import {
  Command,
  FolderOpen,
  MoonStar,
  PanelLeftClose,
  PanelLeftOpen,
  SquareTerminal,
} from "lucide-react";
import { toast } from "sonner";
import { CommandPalette } from "@renderer/components/command/command-palette";
import { WorkspaceSidebar } from "@renderer/components/sidebar/workspace-sidebar";
import { TerminalPanel } from "@renderer/components/terminal/terminal-panel";
import { Button } from "@renderer/components/ui/button";
import { WorkspaceHome } from "@renderer/components/workspace/workspace-home";
import { useDesktopShell } from "@renderer/hooks/use-desktop-shell";
import { useKeyboardShortcuts } from "@renderer/hooks/use-keyboard-shortcuts";
import { getErrorMessage } from "@renderer/lib/errors";
import { getNextThemeLabel, useUIStore } from "@renderer/stores/ui";
import { useWorkspaceStore } from "@renderer/stores/workspace";

export function Layout() {
  useKeyboardShortcuts();

  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const terminalOpen = useUIStore((state) => state.terminalOpen);
  const theme = useUIStore((state) => state.theme);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const toggleTerminal = useUIStore((state) => state.toggleTerminal);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const activeWorkspace = useWorkspaceStore((state) =>
    state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId) ?? null,
  );
  const { appInfo, openWorkspace, revealWorkspace } = useDesktopShell();

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

  const title = activeWorkspace?.label ?? appInfo?.appName ?? "RWork";
  const subtitle =
    activeWorkspace?.path ?? "TypeScript-only shell bootstrap for future desktop workflows";

  return (
    <div className="relative flex h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-fg)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at top left, rgba(52,211,153,0.18), transparent 32%), radial-gradient(circle at top right, rgba(96,165,250,0.18), transparent 30%), linear-gradient(180deg, transparent, rgba(15,23,42,0.12))",
        }}
      />

      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? "var(--sidebar-width)" : 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="relative z-10 shrink-0 overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-sidebar)] backdrop-blur-2xl"
      >
        <div className="h-[var(--titlebar-height)]" />
        <WorkspaceSidebar
          onOpenWorkspace={handleOpenWorkspace}
          onRevealWorkspace={handleRevealWorkspace}
        />
      </motion.aside>

      <section className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-[var(--titlebar-height)] items-center justify-between gap-4 px-5"
          data-window-drag-region
        >
          <div className="min-w-0" data-window-drag-region>
            <div className="truncate text-[13px] font-semibold tracking-[0.02em]">{title}</div>
            <div className="truncate text-[11px] text-[var(--color-muted)]">{subtitle}</div>
          </div>

          <div className="flex items-center gap-2" data-no-drag>
            <Button
              variant="ghost"
              size="icon"
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              onClick={toggleSidebar}
              title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </Button>

            <Button
              variant={terminalOpen ? "secondary" : "ghost"}
              size="icon"
              aria-label={terminalOpen ? "Hide terminal" : "Show terminal"}
              onClick={toggleTerminal}
              title="Toggle terminal"
            >
              <SquareTerminal className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Open command palette"
              onClick={() => setCommandPaletteOpen(true)}
              title="Command palette"
            >
              <Command className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label={`Cycle theme to ${getNextThemeLabel(theme)}`}
              onClick={toggleTheme}
              title={`Cycle theme to ${getNextThemeLabel(theme)}`}
            >
              <MoonStar className="h-4 w-4" />
            </Button>

            <Button variant="secondary" onClick={handleOpenWorkspace}>
              <FolderOpen className="h-4 w-4" />
              Open Project
            </Button>
          </div>
        </header>

        <main className="min-h-0 flex-1 px-4 pb-4">
          <WorkspaceHome
            appInfo={appInfo}
            activeWorkspace={activeWorkspace}
            onOpenWorkspace={handleOpenWorkspace}
            onRevealWorkspace={handleRevealWorkspace}
            onToggleTerminal={toggleTerminal}
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          />
        </main>

        {terminalOpen ? (
          <TerminalPanel
            sessionId={activeWorkspace?.id ?? "global-shell"}
            cwd={activeWorkspace?.path ?? appInfo?.defaultWorkspacePath ?? undefined}
          />
        ) : null}
      </section>

      <CommandPalette
        onOpenWorkspace={handleOpenWorkspace}
        onRevealWorkspace={handleRevealWorkspace}
      />
    </div>
  );
}
