import { Command, FolderOpen, PanelBottom, Sparkles, TerminalSquare } from "lucide-react";
import type { AppInfo } from "../../../../shared/contracts";
import type { WorkspaceItem } from "@renderer/stores/workspace";
import { Button } from "@renderer/components/ui/button";
import { Kbd } from "@renderer/components/ui/kbd";
import { Panel } from "@renderer/components/ui/panel";

interface WorkspaceHomeProps {
  appInfo: AppInfo | null;
  activeWorkspace: WorkspaceItem | null;
  onOpenWorkspace: () => Promise<void>;
  onRevealWorkspace: (workspacePath: string) => Promise<void>;
  onToggleTerminal: () => void;
  onOpenCommandPalette: () => void;
}

const shippedSurfaces = [
  "Window chrome and titlebar shell",
  "In-memory workspace rail",
  "Command palette and keyboard shortcuts",
  "Theme tokens and xterm-based terminal panel",
];

const deferredSurfaces = [
  "LLM response block parsing",
  "Settings panel and model controls",
  "Session persistence and config files",
  "Chat timeline and conversation protocol",
];

const handoffBoundaries = [
  "Electron main/preload own desktop capabilities",
  "Renderer stays on React and local state only",
  "Terminal traffic crosses IPC with a minimal contract",
];

export function WorkspaceHome({
  appInfo,
  activeWorkspace,
  onOpenWorkspace,
  onRevealWorkspace,
  onToggleTerminal,
  onOpenCommandPalette,
}: WorkspaceHomeProps) {
  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)] gap-4">
      <Panel className="relative overflow-hidden p-6">
        <div
          className="absolute inset-x-0 top-0 h-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at top left, rgba(59,130,246,0.22), transparent 52%), radial-gradient(circle at top right, rgba(45,212,191,0.16), transparent 44%)",
          }}
        />

        <div className="relative flex h-full flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <Kbd>cmd+k</Kbd>
            <Kbd>cmd+`</Kbd>
            <Kbd>cmd+b</Kbd>
          </div>

          <div className="mt-6 max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-[-0.04em]">
              {activeWorkspace ? activeWorkspace.label : "Desktop shell is up"}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-muted)]">
              This bootstrap keeps the Omni shell language, but strips away Rust-backed
              settings, models, parsing, and storage. What remains is the reusable desktop
              frame for the TypeScript roadmap.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => void onOpenWorkspace()}>
              <FolderOpen className="h-4 w-4" />
              Open project
            </Button>
            <Button variant="secondary" onClick={onToggleTerminal}>
              <TerminalSquare className="h-4 w-4" />
              Toggle terminal
            </Button>
            <Button variant="ghost" onClick={onOpenCommandPalette}>
              <Command className="h-4 w-4" />
              Command palette
            </Button>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <Panel className="bg-[var(--color-surface)] p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Shipped in this slice
                </h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6">
                {shippedSurfaces.map((item) => (
                  <li key={item} className="rounded-2xl bg-[var(--color-surface-strong)] px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel className="bg-[var(--color-surface)] p-5">
              <div className="flex items-center gap-2">
                <PanelBottom className="h-4 w-4 text-[var(--color-accent)]" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  Deferred by design
                </h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6">
                {deferredSurfaces.map((item) => (
                  <li key={item} className="rounded-2xl bg-[var(--color-surface-strong)] px-4 py-3">
                    {item}
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <div className="mt-auto pt-8">
            <div className="rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium">Active workspace</span>
                <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-1 text-xs text-[var(--color-muted)]">
                  {activeWorkspace?.path ?? "Not selected"}
                </span>
                {activeWorkspace ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void onRevealWorkspace(activeWorkspace.path);
                    }}
                  >
                    Reveal in Finder
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid min-h-0 gap-4">
        <Panel className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Desktop contract</div>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                These are the boundaries kept intentionally thin for the first TypeScript-only
                slice.
              </p>
            </div>
            <span className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-muted)]">
              {appInfo?.platform ?? "darwin"}
            </span>
          </div>

          <ul className="mt-5 space-y-3 text-sm leading-6">
            {handoffBoundaries.map((item) => (
              <li key={item} className="rounded-2xl bg-[var(--color-surface)] px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="p-5">
          <div className="text-sm font-semibold">Runtime</div>
          <div className="mt-4 space-y-3 text-sm text-[var(--color-muted)]">
            <div className="rounded-2xl bg-[var(--color-surface)] px-4 py-3">
              App name: {appInfo?.appName ?? "Refinex Code Desktop"}
            </div>
            <div className="rounded-2xl bg-[var(--color-surface)] px-4 py-3">
              Version: {appInfo?.appVersion ?? "0.1.0"}
            </div>
            <div className="rounded-2xl bg-[var(--color-surface)] px-4 py-3">
              Workspace memory is ephemeral in this bootstrap.
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
