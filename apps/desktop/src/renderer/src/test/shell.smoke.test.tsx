import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { App } from "@renderer/app";
import { emptySidebarState } from "@renderer/stores/worktree";

describe("desktop shell", () => {
  it("renders the shell frame and bootstrap content", async () => {
    render(<App />);

    expect(await screen.findByText("RWork shell is up")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Open project" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Shipped in this slice")).toBeInTheDocument();
  });

  it("renders persisted worktrees and threads in the sidebar", async () => {
    vi.mocked(window.desktopApp.getSidebarState).mockResolvedValue({
      ...emptySidebarState,
      storageRoot:
        "/Users/test/Library/Application Support/RWork/sidebar-state",
      activeWorktreeId: "alpha",
      activeSessionId: "thread-2",
      worktrees: [
        {
          id: "alpha",
          label: "alpha",
          sourcePath: "/Users/test/projects/alpha",
          worktreePath: "/Users/test/projects/alpha",
          gitRoot: "/Users/test/projects/alpha",
          branch: "main",
          isGitRepository: true,
          storagePath:
            "/Users/test/Library/Application Support/RWork/sidebar-state/worktrees/alpha",
          createdAt: "2026-04-06T00:00:00.000Z",
          updatedAt: "2026-04-06T00:00:00.000Z",
          lastOpenedAt: "2026-04-06T00:00:00.000Z",
          lastSessionId: "thread-2",
          sessions: [
            {
              id: "thread-2",
              worktreeId: "alpha",
              title: "Thread 02",
              status: "idle",
              createdAt: "2026-04-06T00:00:00.000Z",
              updatedAt: "2026-04-06T00:00:00.000Z",
              lastOpenedAt: "2026-04-06T00:00:00.000Z",
              storagePath:
                "/Users/test/Library/Application Support/RWork/sidebar-state/worktrees/alpha/sessions/thread-2.json",
            },
            {
              id: "thread-1",
              worktreeId: "alpha",
              title: "Thread 01",
              status: "idle",
              createdAt: "2026-04-06T00:00:00.000Z",
              updatedAt: "2026-04-06T00:00:00.000Z",
              lastOpenedAt: "2026-04-05T00:00:00.000Z",
              storagePath:
                "/Users/test/Library/Application Support/RWork/sidebar-state/worktrees/alpha/sessions/thread-1.json",
            },
          ],
        },
      ],
    });

    render(<App />);

    expect((await screen.findAllByText("Thread 02")).length).toBeGreaterThan(0);
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("Thread 01")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "搜索会话" }),
    ).toBeInTheDocument();
  });
});
