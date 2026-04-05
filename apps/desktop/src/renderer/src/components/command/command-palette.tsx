import * as Dialog from "@radix-ui/react-dialog";
import { Command as CommandMenu } from "cmdk";
import {
  FolderOpen,
  MonitorCog,
  MoonStar,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SquareTerminal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@renderer/components/ui/button";
import { Kbd } from "@renderer/components/ui/kbd";
import { getErrorMessage } from "@renderer/lib/errors";
import { getNextThemeLabel, useUIStore } from "@renderer/stores/ui";
import { useWorkspaceStore } from "@renderer/stores/workspace";

interface CommandPaletteProps {
  onOpenWorkspace: () => Promise<void>;
  onRevealWorkspace: (workspacePath: string) => Promise<void>;
}

interface CommandItem {
  id: string;
  label: string;
  keywords: string[];
  shortcut?: string;
  group: string;
  run: () => void | Promise<void>;
}

export function CommandPalette({
  onOpenWorkspace,
  onRevealWorkspace,
}: CommandPaletteProps) {
  const commandPaletteOpen = useUIStore((state) => state.commandPaletteOpen);
  const terminalOpen = useUIStore((state) => state.terminalOpen);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const theme = useUIStore((state) => state.theme);
  const setCommandPaletteOpen = useUIStore((state) => state.setCommandPaletteOpen);
  const toggleTerminal = useUIStore((state) => state.toggleTerminal);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const toggleTheme = useUIStore((state) => state.toggleTheme);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const activeWorkspace = useWorkspaceStore((state) =>
    state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId) ?? null,
  );
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);

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
      shortcut: "cmd+`",
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

  if (activeWorkspace) {
    commands.push({
      id: "workspace.reveal",
      label: "Reveal active workspace in Finder",
      keywords: ["finder", "workspace", "path"],
      group: "Workspace",
      run: () => onRevealWorkspace(activeWorkspace.path),
    });
  }

  commands.push(
    ...workspaces.map((workspace) => ({
      id: `workspace.switch.${workspace.id}`,
      label: `Switch to ${workspace.label}`,
      keywords: ["switch", workspace.label, workspace.path],
      group: "Workspace",
      run: () => {
        setActiveWorkspace(workspace.id);
      },
    })),
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
