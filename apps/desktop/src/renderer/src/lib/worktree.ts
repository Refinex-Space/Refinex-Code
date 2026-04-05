import type { WorktreeRecord } from "../../../shared/contracts";

export function getExpandedWorktreeLabel(worktree: WorktreeRecord, worktrees: WorktreeRecord[]) {
  const segments = worktree.worktreePath.split("/").filter(Boolean);
  const label = segments.at(-1) ?? worktree.label;
  const duplicateCount = worktrees.filter((entry) => entry.label === worktree.label).length;

  if (duplicateCount <= 1) {
    return label;
  }

  const parent = segments.at(-2);
  return parent ? `${label} · ${parent}` : label;
}

export function formatRelativeTimeLabel(isoTimestamp: string) {
  const deltaMs = Date.now() - new Date(isoTimestamp).getTime();
  const deltaMinutes = Math.max(1, Math.round(deltaMs / 60000));

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours}h ago`;
  }

  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays}d ago`;
}

export function compactPath(pathname: string, width = 46) {
  if (pathname.length <= width) {
    return pathname;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 2) {
    return pathname;
  }

  const head = segments.slice(0, 2).join("/");
  const tail = segments.slice(-2).join("/");
  return `/${head}/…/${tail}`;
}
