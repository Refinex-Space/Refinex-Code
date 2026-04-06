import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import { App } from "@renderer/app";
import {
  DEFAULT_SIDEBAR_WIDTH,
  useUIStore,
} from "@renderer/stores/ui";
import { emptySidebarState } from "@renderer/stores/worktree";

describe("desktop shell", () => {
  it("renders the shell frame and bootstrap content", async () => {
    render(<App />);

    expect(await screen.findByText("开始构建")).toBeInTheDocument();
    const header = screen.getByRole("banner");
    const main = screen.getByRole("main");
    expect(within(header).queryByRole("button", { name: "Open Project" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "设置" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "RWork logo" })).toBeInTheDocument();
    expect(within(main).getByText("选择项目")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("先打开一个项目，再从左侧创建或选择线程"),
    ).toBeInTheDocument();
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
    const main = screen.getByRole("main");

    expect((await screen.findAllByText("Thread 02")).length).toBeGreaterThan(0);
    const projectTrigger = within(main).getByText("alpha");
    expect(projectTrigger).toBeInTheDocument();
    expect(screen.getByText("Thread 01")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "搜索会话" })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("描述下一步要做的事，Enter 发送，Shift+Enter 换行"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "切换模型（TODO）" })).toBeInTheDocument();
    fireEvent.click(projectTrigger);
    expect(
      await screen.findByPlaceholderText("Search projects"),
    ).toBeInTheDocument();
    expect(await screen.findByText("添加新项目")).toBeInTheDocument();
  });

  it("keeps the sidebar toggle interactive after collapsing", async () => {
    useUIStore.setState({
      sidebarOpen: true,
      sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
      terminalOpen: false,
      commandPaletteOpen: false,
      terminalHeight: 300,
      theme: "system",
    });

    render(<App />);

    const collapseButton = await screen.findByRole("button", {
      name: "Collapse sidebar",
    });
    const terminalButton = screen.getByRole("button", {
      name: "Show terminal",
    });

    expect(
      collapseButton.compareDocumentPosition(terminalButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);

    fireEvent.click(collapseButton);
    const expandButton = await screen.findByRole("button", {
      name: "Expand sidebar",
    });

    expect(
      expandButton.compareDocumentPosition(terminalButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);

    fireEvent.click(expandButton);

    expect(
      await screen.findByRole("button", { name: "Collapse sidebar" }),
    ).toBeInTheDocument();
  });

  it("opens the fullscreen settings panel and returns to the app", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "设置" }));

    expect(await screen.findByRole("heading", { name: "Appearance" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回应用" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Collapse sidebar" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "返回应用" }));

    expect(
      await screen.findByPlaceholderText("先打开一个项目，再从左侧创建或选择线程"),
    ).toBeInTheDocument();
  });

  it("applies appearance settings in the fullscreen panel", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "设置" }));
    fireEvent.click(screen.getByRole("button", { name: "深色" }));

    expect(document.documentElement.dataset.theme).toBe("dark");

    fireEvent.click(screen.getByRole("switch", { name: "使用指针光标" }));
    expect(document.documentElement.dataset.pointerCursor).toBe("enabled");

    fireEvent.change(screen.getByLabelText("UI 字体大小"), {
      target: { value: "15" },
    });
    fireEvent.change(screen.getByLabelText("代码字体大小"), {
      target: { value: "14" },
    });
    fireEvent.change(screen.getByLabelText("侧边栏背景色（深色）"), {
      target: { value: "#ddeeff" },
    });
    fireEvent.change(screen.getByLabelText("右侧主面板背景色（深色）"), {
      target: { value: "#faf1e2" },
    });

    expect(document.documentElement.style.getPropertyValue("--ui-font-size")).toBe("15px");
    expect(document.documentElement.style.getPropertyValue("--code-font-size")).toBe("14px");
    expect(document.documentElement.style.getPropertyValue("--color-sidebar")).toBe("#ddeeff");
    expect(document.documentElement.style.getPropertyValue("--color-bg")).toBe("#faf1e2");

    await waitFor(() => {
      expect(window.desktopApp.saveAppearanceSettings).toHaveBeenLastCalledWith(
        expect.objectContaining({
          uiFontSize: 15,
          codeFontSize: 14,
          colors: expect.objectContaining({
            dark: expect.objectContaining({
              sidebarBackground: "#ddeeff",
              panelBackground: "#faf1e2",
            }),
          }),
        }),
      );
    });
  });

  it("hydrates persisted appearance colors on startup", async () => {
    vi.mocked(window.desktopApp.getAppearanceSettings).mockResolvedValue({
      theme: "light",
      pointerCursorEnabled: true,
      uiFontSize: 16,
      codeFontSize: 13,
      colors: {
        light: {
          sidebarBackground: "#ccddee",
          panelBackground: "#fdf6ec",
        },
        dark: {
          sidebarBackground: "#111315",
          panelBackground: "#0a0b0d",
        },
      },
      storagePath:
        "/Users/test/Library/Application Support/RWork/appearance-settings.json",
    });

    render(<App />);

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue("--color-sidebar")).toBe("#ccddee");
      expect(document.documentElement.style.getPropertyValue("--color-bg")).toBe("#fdf6ec");
      expect(document.documentElement.style.getPropertyValue("--ui-font-size")).toBe("16px");
      expect(document.documentElement.dataset.pointerCursor).toBe("enabled");
    });
  });

  it("toggles terminal with cmd+t", async () => {
    render(<App />);
    const header = screen.getByRole("banner");

    expect(
      await within(header).findByRole("button", { name: "Show terminal" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "t", metaKey: true });

    expect(
      await within(header).findByRole("button", { name: "Hide terminal" }),
    ).toBeInTheDocument();
  });
});
