import { FolderOpen, FolderPlus, Sparkles, TerminalSquare, Trash2 } from "lucide-react";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { Button } from "@renderer/components/ui/button";
import { Panel } from "@renderer/components/ui/panel";
import { cn } from "@renderer/lib/cn";
import { useWorkspaceStore } from "@renderer/stores/workspace";

interface WorkspaceSidebarProps {
  onOpenWorkspace: () => Promise<void>;
  onRevealWorkspace: (workspacePath: string) => Promise<void>;
}

const plannedModules = [
  "Conversation surface",
  "Settings and config",
  "Persistent sessions",
];

export function WorkspaceSidebar({
  onOpenWorkspace,
  onRevealWorkspace,
}: WorkspaceSidebarProps) {
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const setActiveWorkspace = useWorkspaceStore((state) => state.setActiveWorkspace);
  const removeWorkspace = useWorkspaceStore((state) => state.removeWorkspace);

  return (
    <div className="flex h-[calc(100vh-var(--titlebar-height))] flex-col">
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              Workspace
            </div>
            <div className="mt-1 text-sm text-[var(--color-muted)]">
              Shell-only bootstrap
            </div>
          </div>

          <Button
            size="icon"
            variant="secondary"
            aria-label="Open project"
            title="Open project"
            onClick={() => {
              void onOpenWorkspace();
            }}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1 px-3 pb-4">
        <div className="space-y-3">
          {workspaces.length === 0 ? (
            <Panel className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-surface-strong)]">
                  <FolderOpen className="h-4 w-4 text-[var(--color-accent)]" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold">No workspace yet</h2>
                  <p className="text-sm leading-6 text-[var(--color-muted)]">
                    Open any project folder to bind the shell frame and terminal panel.
                  </p>
                </div>
              </div>
            </Panel>
          ) : null}

          {workspaces.map((workspace) => {
            const isActive = workspace.id === activeWorkspaceId;

            return (
              <Panel
                key={workspace.id}
                className={cn(
                  "overflow-hidden transition-colors",
                  isActive
                    ? "border-[var(--color-accent)] bg-[var(--color-surface-strong)]"
                    : "bg-[var(--color-panel)]",
                )}
              >
                <button
                  type="button"
                  className="w-full px-4 pt-4 text-left"
                  onClick={() => {
                    setActiveWorkspace(workspace.id);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-[var(--color-accent)]" />
                    <span className="truncate text-sm font-semibold">{workspace.label}</span>
                  </div>
                  <p className="mt-2 truncate text-xs leading-5 text-[var(--color-muted)]">
                    {workspace.path}
                  </p>
                </button>

                <div className="flex items-center gap-2 px-4 pt-3 pb-4">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void onRevealWorkspace(workspace.path);
                    }}
                  >
                    <FolderOpen className="h-3.5 w-3.5" />
                    Reveal
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      removeWorkspace(workspace.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
              </Panel>
            );
          })}

          <Panel className="p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
              <h2 className="text-sm font-semibold">Not migrated on purpose</h2>
            </div>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-muted)]">
              {plannedModules.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <TerminalSquare className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </ScrollArea>
    </div>
  );
}
