// @vitest-environment node

import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { createWorktreeStateStore } from "./worktree-state-store";

const testRoots: string[] = [];

afterEach(() => {
  for (const root of testRoots.splice(0)) {
    rmSync(root, {
      force: true,
      recursive: true,
    });
  }
});

describe("createWorktreeStateStore", () => {
  it("persists worktrees and sessions under the app data directory", () => {
    const root = mkdtempSync(join(tmpdir(), "rwork-sidebar-"));
    testRoots.push(root);

    const projectPath = join(root, "projects", "alpha");
    mkdirSync(projectPath, {
      recursive: true,
    });

    const store = createWorktreeStateStore({
      userDataPath: root,
      appName: "RWork",
      resolveGitMetadata: () => ({
        gitRoot: null,
        branch: null,
        isGitRepository: false,
      }),
    });

    let snapshot = store.openWorktree(projectPath);
    expect(snapshot.worktrees).toHaveLength(1);
    expect(snapshot.worktrees[0]?.worktreePath).toBe(projectPath);
    expect(snapshot.storageRoot).toContain("sidebar-state");

    snapshot = store.createSession(snapshot.worktrees[0]!.id);
    snapshot = store.createSession(snapshot.worktrees[0]!.id);

    expect(snapshot.worktrees[0]?.sessions).toHaveLength(2);
    expect(snapshot.activeSessionId).toBe(snapshot.worktrees[0]?.sessions[0]?.id);
    expect(existsSync(snapshot.worktrees[0]!.storagePath)).toBe(true);
    expect(existsSync(snapshot.worktrees[0]!.sessions[0]!.storagePath)).toBe(true);

    const reloadedStore = createWorktreeStateStore({
      userDataPath: root,
      appName: "RWork",
      resolveGitMetadata: () => ({
        gitRoot: null,
        branch: null,
        isGitRepository: false,
      }),
    });
    const reloadedSnapshot = reloadedStore.getSnapshot();

    expect(reloadedSnapshot.worktrees).toHaveLength(1);
    expect(reloadedSnapshot.worktrees[0]?.sessions).toHaveLength(2);
    expect(reloadedSnapshot.activeWorktreeId).toBe(snapshot.activeWorktreeId);
  });
});
