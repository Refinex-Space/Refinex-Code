import { Command, FolderOpen, GitBranch, HardDriveDownload, PanelBottom, Sparkles, TerminalSquare } from "lucide-react";
import type { AppInfo, WorktreeRecord, WorktreeSessionRecord } from "../../../../shared/contracts";
import { Button } from "@renderer/components/ui/button";
import { Kbd } from "@renderer/components/ui/kbd";
import { Panel } from "@renderer/components/ui/panel";
import { compactPath } from "@renderer/lib/worktree";

interface WorkspaceHomeProps {
  appInfo: AppInfo | null;
  activeWorktree: WorktreeRecord | null;
  activeSession: WorktreeSessionRecord | null;
  storageRoot: string;
  onOpenWorkspace: () => Promise<unknown>;
  onRevealWorkspace: (workspacePath: string) => Promise<unknown>;
  onToggleTerminal: () => void;
  onOpenCommandPalette: () => void;
  onPrepareSession: (worktreeId: string) => Promise<unknown>;
}

const shippedSurfaces = [
  "Window chrome and titlebar shell",
  "Persistent worktree rail",
  "Command palette and keyboard shortcuts",
  "Theme tokens, sessions, and xterm-based terminal panel",
];

const deferredSurfaces = [
  "LLM response block parsing",
  "Settings panel and model controls",
  "Chat timeline and conversation protocol",
  "Rich thread transcript persistence",
];

const handoffBoundaries = [
  "Electron main/preload own desktop capabilities",
  "Renderer stays on React and local state only",
  "Terminal traffic crosses IPC with a minimal contract",
];

export function WorkspaceHome({
  appInfo,
  activeWorktree,
  activeSession,
  storageRoot,
  onOpenWorkspace,
  onRevealWorkspace,
  onToggleTerminal,
  onOpenCommandPalette,
  onPrepareSession,
}: WorkspaceHomeProps) {
  const headline = activeSession?.title ?? activeWorktree?.label ?? "RWork shell is up";
  const supportingCopy = activeWorktree
    ? "Projects are isolated as worktrees and threads are persisted outside the repo, ready for future chat and agent layers."
    : "Open a project to pin it as a worktree, then branch into multiple local threads without writing app state into the repo.";

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
            <h1 className="text-4xl font-semibold tracking-[-0.04em]">{headline}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-muted)]">
              {supportingCopy}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => void onOpenWorkspace()}>
              <FolderOpen className="h-4 w-4" />
              Open project
            </Button>
            {activeWorktree ? (
              <Button
                variant="secondary"
                onClick={() => {
                  void onPrepareSession(activeWorktree.id);
                }}
              >
                <Sparkles className="h-4 w-4" />
                Create thread
              </Button>
            ) : null}
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
                <span className="text-sm font-medium">Active worktree</span>
                <span className="rounded-full bg-[var(--color-surface-strong)] px-3 py-1 text-xs text-[var(--color-muted)]">
                  {activeWorktree?.worktreePath ?? "Not selected"}
                </span>
                {activeWorktree ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void onRevealWorkspace(activeWorktree.worktreePath);
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
              <div className="text-sm font-semibold">Current context</div>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                The active worktree owns its own session folder, current thread focus, and terminal
                working directory.
              </p>
            </div>
            <span className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs text-[var(--color-muted)]">
              {appInfo?.platform ?? "darwin"}
            </span>
          </div>

          <ul className="mt-5 space-y-3 text-sm leading-6">
            <li className="rounded-2xl bg-[var(--color-surface)] px-4 py-3">
              Worktree path: {activeWorktree ? compactPath(activeWorktree.worktreePath, 54) : "None"}
            </li>
            <li className="rounded-2xl bg-[var(--color-surface)] px-4 py-3">
              Active thread: {activeSession?.title ?? "No thread selected"}
            </li>
            <li className="rounded-2xl bg-[var(--color-surface)] px-4 py-3">
              Sessions in worktree: {activeWorktree?.sessions.length ?? 0}
            </li>
          </ul>
        </Panel>

        <Panel className="p-5">
          <div className="text-sm font-semibold">Storage design</div>
          <div className="mt-4 space-y-3 text-sm text-[var(--color-muted)]">
            <div className="rounded-2xl bg-[var(--color-surface)] px-4 py-3">
              App name: {appInfo?.appName ?? "RWork"}
            </div>
            <div className="rounded-2xl bg-[var(--color-surface)] px-4 py-3">
              Version: {appInfo?.appVersion ?? "0.1.0"}
            </div>
            <div className="rounded-2xl bg-[var(--color-surface)] px-4 py-3">
              <div className="flex items-center gap-2">
                <HardDriveDownload className="h-4 w-4 text-[var(--color-accent)]" />
                Root: {storageRoot ? compactPath(storageRoot, 52) : "Pending"}
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--color-surface)] px-4 py-3">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-[var(--color-accent)]" />
                Branch: {activeWorktree?.branch ?? "No git branch"}
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--color-surface)] px-4 py-3">
              Worktree metadata and session files stay in app data, not inside the repo.
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
