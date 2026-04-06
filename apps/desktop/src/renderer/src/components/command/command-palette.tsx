import * as Dialog from "@radix-ui/react-dialog";
import { Command as CommandMenu } from "cmdk";
import {
  FolderOpen,
  GitBranch,
  MonitorCog,
  MoonStar,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Search,
  SquareTerminal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@renderer/components/ui/button";
import { Kbd } from "@renderer/components/ui/kbd";
import { getErrorMessage } from "@renderer/lib/errors";
import { findActiveWorktree, useWorktreeStore } from "@renderer/stores/worktree";
import { getNextThemeLabel, useUIStore } from "@renderer/stores/ui";

interface CommandPaletteProps {
  onOpenWorkspace: () => Promise<unknown>;
  onRevealWorkspace: (workspacePath: string) => Promise<unknown>;
  onPrepareSession: (worktreeId: string) => Promise<unknown>;
  onSelectWorktree: (worktreeId: string) => Promise<unknown>;
  onSelectSession: (worktreeId: string, sessionId: string) => Promise<unknown>;
}

interface CommandItem {
  id: string;
  label: string;
  keywords: string[];
  shortcut?: string;
  group: string;
  run: () => void | Promise<unknown>;
}

export function CommandPalette({
  onOpenWorkspace,
  onRevealWorkspace,
  onPrepareSession,
  onSelectWorktree,
  onSelectSession,
}: CommandPaletteProps) {
  const commandPaletteOpen = useUIStore((state) => state.commandPaletteOpen);
  const terminalOpen = useUIStore((state) => state.terminalOpen);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const theme = useUIStore((state) => state.theme);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const toggleTerminal = useUIStore((state) => state.toggleTerminal);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const worktrees = useWorktreeStore((state) => state.worktrees);
  const activeWorktree = useWorktreeStore((state) => findActiveWorktree(state));

  const commands: CommandItem[] = [
    {
      id: "workspace.open",
      label: "Open project",
      keywords: ["workspace", "folder", "project"],
      shortcut: "cmd+o",
      group: "Workspace",
      run: onOpenWorkspace,
    },
    {
      id: "sidebar.toggle",
      label: sidebarOpen ? "Collapse sidebar" : "Expand sidebar",
      keywords: ["sidebar", "layout"],
      shortcut: "cmd+b",
      group: "Window",
      run: toggleSidebar,
    },
    {
      id: "terminal.toggle",
      label: terminalOpen ? "Hide terminal" : "Show terminal",
      keywords: ["terminal", "shell"],
      shortcut: "cmd+t",
      group: "Window",
      run: toggleTerminal,
    },
    {
      id: "theme.toggle",
      label: `Cycle theme to ${getNextThemeLabel(theme)}`,
      keywords: ["theme", "appearance", "dark", "light"],
      shortcut: "cmd+shift+t",
      group: "Window",
      run: toggleTheme,
    },
  ];

  if (activeWorktree) {
    commands.push({
      id: "workspace.reveal",
      label: "Reveal active worktree in Finder",
      keywords: ["finder", "workspace", "worktree", "path"],
      group: "Workspace",
      run: () => onRevealWorkspace(activeWorktree.worktreePath),
    });

    commands.push({
      id: "session.create",
      label: "Create thread in active worktree",
      keywords: ["session", "thread", "create"],
      shortcut: "cmd+shift+n",
      group: "Session",
      run: () => onPrepareSession(activeWorktree.id),
    });
  }

  commands.push(
    ...worktrees.map((worktree) => ({
      id: `workspace.switch.${worktree.id}`,
      label: `Switch to ${worktree.label}`,
      keywords: ["switch", worktree.label, worktree.worktreePath],
      group: "Workspace",
      run: () => {
        return onSelectWorktree(worktree.id);
      },
    })),
  );

  commands.push(
    ...worktrees.flatMap((worktree) =>
      worktree.sessions.map((session) => ({
        id: `session.switch.${session.id}`,
        label: `Jump to ${session.title}`,
        keywords: ["session", "thread", session.title, worktree.label],
        group: "Session",
        run: () => {
          return onSelectSession(worktree.id, session.id);
        },
      })),
    ),
  );

  const groups = [...new Set(commands.map((command) => command.group))];

  const handleSelect = (command: CommandItem) => {
    setCommandPaletteOpen(false);
    void Promise.resolve(command.run()).catch((error) => {
      toast.error(getErrorMessage(error));
    });
  };

  return (
    <Dialog.Root open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/36 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed top-[18vh] left-1/2 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[0_40px_120px_rgba(15,23,42,0.34)] outline-none"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>

          <CommandMenu label="Desktop commands" className="flex flex-col">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-4">
              <Search className="h-4 w-4 text-[var(--color-muted)]" />
              <CommandMenu.Input
                autoFocus
                placeholder="Search commands, workspaces, and shell actions"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-muted)]"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCommandPaletteOpen(false);
                }}
              >
                Esc
              </Button>
            </div>

            <CommandMenu.List className="max-h-[480px] overflow-y-auto p-3">
              <CommandMenu.Empty className="px-3 py-12 text-center text-sm text-[var(--color-muted)]">
                No command matches this search.
              </CommandMenu.Empty>

              {groups.map((group) => (
                <CommandMenu.Group key={group} heading={group} className="space-y-1 pb-3">
                  {commands
                    .filter((command) => command.group === group)
                    .map((command) => (
                      <CommandMenu.Item
                        key={command.id}
                        value={command.label}
                        keywords={command.keywords}
                        onSelect={() => {
                          handleSelect(command);
                        }}
                        className="flex cursor-pointer items-center justify-between rounded-2xl px-3 py-3 text-sm outline-none data-[selected=true]:bg-[var(--color-surface-strong)]"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-surface)] text-[var(--color-accent)]">
                            {command.id.startsWith("workspace.open") ? (
                              <FolderOpen className="h-4 w-4" />
                            ) : command.id.startsWith("session") ? (
                              command.id === "session.create" ? (
                                <Sparkles className="h-4 w-4" />
                              ) : (
                                <GitBranch className="h-4 w-4" />
                              )
                            ) : command.id.startsWith("theme") ? (
                              <MoonStar className="h-4 w-4" />
                            ) : command.id.startsWith("sidebar") ? (
                              sidebarOpen ? (
                                <PanelLeftClose className="h-4 w-4" />
                              ) : (
                                <PanelLeftOpen className="h-4 w-4" />
                              )
                            ) : command.id.startsWith("terminal") ? (
                              <SquareTerminal className="h-4 w-4" />
                            ) : (
                              <MonitorCog className="h-4 w-4" />
                            )}
                          </span>
                          <div>
                            <div className="font-medium">{command.label}</div>
                            <div className="text-xs text-[var(--color-muted)]">{command.group}</div>
                          </div>
                        </div>
                        {command.shortcut ? <Kbd>{command.shortcut}</Kbd> : null}
                      </CommandMenu.Item>
                    ))}
                </CommandMenu.Group>
              ))}
            </CommandMenu.List>
          </CommandMenu>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
