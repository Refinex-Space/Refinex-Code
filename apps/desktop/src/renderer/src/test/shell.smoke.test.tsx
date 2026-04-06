import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("opens the skills view and previews skill files", async () => {
    vi.mocked(window.desktopApp.getSkillsSnapshot).mockResolvedValue({
      activeWorktreePath: null,
      generatedAt: "2026-04-06T00:00:00.000Z",
      skills: [
        {
          id: "personal:tech-rewrite",
          name: "tech-rewrite",
          displayName: "tech-rewrite",
          sourceKind: "personal",
          sourceLabel: "Personal skills",
          skillRoot: "/Users/test/.agents/skills/tech-rewrite",
          skillMdPath: "/Users/test/.agents/skills/tech-rewrite/SKILL.md",
          description: "Rewrite technical material into structured docs.",
          userInvocable: true,
          disableModelInvocation: false,
          invokedBy: "User or RWork",
          addedBy: "User",
          lastUpdated: "2026-04-05T00:00:00.000Z",
          tree: [
            {
              id: "SKILL.md",
              name: "SKILL.md",
              path: "/Users/test/.agents/skills/tech-rewrite/SKILL.md",
              relativePath: "SKILL.md",
              type: "file",
            },
            {
              id: "references",
              name: "references",
              path: "/Users/test/.agents/skills/tech-rewrite/references",
              relativePath: "references",
              type: "directory",
              children: [
                {
                  id: "references/notes.md",
                  name: "notes.md",
                  path: "/Users/test/.agents/skills/tech-rewrite/references/notes.md",
                  relativePath: "references/notes.md",
                  type: "file",
                },
              ],
            },
          ],
        },
      ],
    });
    vi.mocked(window.desktopApp.readSkillFile).mockImplementation(async (path) => {
      if (path.endsWith("notes.md")) {
        return {
          path,
          kind: "text",
          size: 20,
          language: "markdown",
          content: "reference notes",
        };
      }

      return {
        path,
        kind: "markdown",
        size: 64,
        language: "markdown",
        content: "# Technical Rewrite\n\nUse this skill carefully.",
      };
    });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "技能" }));

    expect(await screen.findByText("Skills")).toBeInTheDocument();
    expect(screen.getAllByText("Personal skills").length).toBeGreaterThan(0);
    expect(screen.queryByText("Project skills")).not.toBeInTheDocument();
    expect(screen.getAllByText("tech-rewrite").length).toBeGreaterThan(0);
    expect(screen.getByText("Rewrite technical material into structured docs.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "源码" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "源码" }));
    expect(useUIStore.getState().skillsContentMode).toBe("source");

    act(() => {
      useUIStore.getState().selectSkillItem(
        "personal:tech-rewrite",
        "references/notes.md",
      );
    });

    await waitFor(() => {
      expect(window.desktopApp.readSkillFile).toHaveBeenCalledWith(
        "/Users/test/.agents/skills/tech-rewrite/references/notes.md",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "新线程" }));
    expect(
      await screen.findByPlaceholderText("先打开一个项目，再从左侧创建或选择线程"),
    ).toBeInTheDocument();
  });

  it("opens the skill actions menu and forwards replace/download/uninstall", async () => {
    vi.mocked(window.desktopApp.getSkillsSnapshot).mockResolvedValue({
      activeWorktreePath: null,
      generatedAt: "2026-04-06T00:00:00.000Z",
      skills: [
        {
          id: "personal:harness-feat",
          name: "harness-feat",
          displayName: "harness-feat",
          sourceKind: "personal",
          sourceLabel: "Personal skills",
          skillRoot: "/Users/test/.agents/skills/harness-feat",
          skillMdPath: "/Users/test/.agents/skills/harness-feat/SKILL.md",
          description: "Plan and execute features.",
          userInvocable: true,
          disableModelInvocation: false,
          invokedBy: "User or RWork",
          addedBy: "User",
          lastUpdated: "2026-04-05T00:00:00.000Z",
          tree: [],
        },
      ],
    });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "技能" }));

    fireEvent.pointerDown(
      await screen.findByRole("button", { name: "harness-feat 更多操作" }),
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "替换" }));

    await waitFor(() => {
      expect(window.desktopApp.replaceSkill).toHaveBeenCalledWith(
        "/Users/test/.agents/skills/harness-feat",
      );
    });

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "harness-feat 更多操作" }),
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "下载" }));

    await waitFor(() => {
      expect(window.desktopApp.downloadSkill).toHaveBeenCalledWith(
        "/Users/test/.agents/skills/harness-feat",
      );
    });

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "harness-feat 更多操作" }),
    );
    fireEvent.click(await screen.findByRole("menuitem", { name: "卸载" }));

    await waitFor(() => {
      expect(window.desktopApp.uninstallSkill).toHaveBeenCalledWith(
        "/Users/test/.agents/skills/harness-feat",
      );
    });
  });

  it("opens the create menu and forwards uploaded skill archives", async () => {
    vi.mocked(window.desktopApp.getSkillsSnapshot).mockResolvedValue({
      activeWorktreePath: null,
      generatedAt: "2026-04-06T00:00:00.000Z",
      skills: [],
    });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "技能" }));

    fireEvent.pointerDown(await screen.findByRole("button", { name: "新增技能" }));
    fireEvent.click(await screen.findByText("创建 Skill"));
    fireEvent.click(await screen.findByText("上传技能"));

    await waitFor(() => {
      expect(window.desktopApp.uploadSkill).toHaveBeenCalledTimes(1);
    });
  });

  it("opens the remote skills browser and installs a remote skill", async () => {
    vi.mocked(window.desktopApp.getSkillsSnapshot).mockResolvedValue({
      activeWorktreePath: null,
      generatedAt: "2026-04-06T00:00:00.000Z",
      skills: [],
    });
    vi.mocked(window.desktopApp.getRemoteSkillCatalog).mockResolvedValue({
      fetchedAt: "2026-04-06T00:00:00.000Z",
      skills: [
        {
          id: "skill-creator",
          name: "skill-creator",
          description: "Create new skills from structured guidance.",
          sourceLabel: "Anthropic & Partners",
          providerLabel: "Anthropic",
        },
      ],
    });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "技能" }));
    fireEvent.pointerDown(await screen.findByRole("button", { name: "新增技能" }));
    fireEvent.click(await screen.findByText("浏览 Skills"));

    expect(await screen.findByText("Browse Skills")).toBeInTheDocument();
    expect(await screen.findByText("/skill-creator")).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "安装 skill-creator" }));

    await waitFor(() => {
      expect(window.desktopApp.installRemoteSkill).toHaveBeenCalledWith("skill-creator");
    });
  });

  it("shows update instead of plus when the remote skill already exists locally", async () => {
    vi.mocked(window.desktopApp.getSkillsSnapshot).mockResolvedValue({
      activeWorktreePath: null,
      generatedAt: "2026-04-06T00:00:00.000Z",
      skills: [
        {
          id: "personal:skill-creator",
          name: "skill-creator",
          displayName: "skill-creator",
          sourceKind: "personal",
          sourceLabel: "Personal skills",
          skillRoot: "/Users/test/.agents/skills/skill-creator",
          skillMdPath: "/Users/test/.agents/skills/skill-creator/SKILL.md",
          description: "Local installed skill.",
          userInvocable: true,
          disableModelInvocation: false,
          invokedBy: "User or RWork",
          addedBy: "User",
          lastUpdated: "2026-04-05T00:00:00.000Z",
          tree: [],
        },
      ],
    });
    vi.mocked(window.desktopApp.getRemoteSkillCatalog).mockResolvedValue({
      fetchedAt: "2026-04-06T00:00:00.000Z",
      skills: [
        {
          id: "skill-creator",
          name: "skill-creator",
          description: "Create new skills from structured guidance.",
          sourceLabel: "Anthropic & Partners",
          providerLabel: "Anthropic",
        },
      ],
    });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "技能" }));
    fireEvent.pointerDown(await screen.findByRole("button", { name: "新增技能" }));
    fireEvent.click(await screen.findByText("浏览 Skills"));

    expect(await screen.findByRole("button", { name: "更新 skill-creator" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "安装 skill-creator" })).not.toBeInTheDocument();
  });

  it("filters skills with the search input", async () => {
    vi.mocked(window.desktopApp.getSkillsSnapshot).mockResolvedValue({
      activeWorktreePath: null,
      generatedAt: "2026-04-06T00:00:00.000Z",
      skills: [
        {
          id: "personal:tech-writing",
          name: "tech-writing",
          displayName: "tech-writing",
          sourceKind: "personal",
          sourceLabel: "Personal skills",
          skillRoot: "/Users/test/.agents/skills/tech-writing",
          skillMdPath: "/Users/test/.agents/skills/tech-writing/SKILL.md",
          description: "Write long-form technical content.",
          userInvocable: true,
          disableModelInvocation: false,
          invokedBy: "User or RWork",
          addedBy: "User",
          lastUpdated: "2026-04-05T00:00:00.000Z",
          tree: [],
        },
        {
          id: "personal:harness-feat",
          name: "harness-feat",
          displayName: "harness-feat",
          sourceKind: "personal",
          sourceLabel: "Personal skills",
          skillRoot: "/Users/test/.agents/skills/harness-feat",
          skillMdPath: "/Users/test/.agents/skills/harness-feat/SKILL.md",
          description: "Implement new features with harness discipline.",
          userInvocable: true,
          disableModelInvocation: false,
          invokedBy: "User or RWork",
          addedBy: "User",
          lastUpdated: "2026-04-05T00:00:00.000Z",
          tree: [],
        },
      ],
    });

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "技能" }));
    fireEvent.click(screen.getByRole("button", { name: "搜索技能" }));

    fireEvent.change(
      await screen.findByRole("textbox", { name: "搜索技能或文件" }),
      { target: { value: "harness" } },
    );

    expect(screen.getByText("harness-feat")).toBeInTheDocument();
    expect(screen.getAllByText("tech-writing")).toHaveLength(1);
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

  it("renders provider settings and saves a Codex configuration", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "设置" }));
    fireEvent.click(screen.getByRole("button", { name: "供应商" }));

    expect(await screen.findByRole("heading", { name: "供应商" })).toBeInTheDocument();
    await screen.findByText("使用当前 Claude 登录状态");
    expect(screen.getByRole("button", { name: "Codex" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Claude" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Codex" }));
    fireEvent.change(screen.getByLabelText("Codex 接口地址"), {
      target: { value: "https://gateway.example.com/v1" },
    });
    fireEvent.change(screen.getByLabelText("Codex 默认模型"), {
      target: { value: "gpt-5.4" },
    });
    fireEvent.change(screen.getByLabelText("Codex 输出详细程度"), {
      target: { value: "high" },
    });
    fireEvent.change(screen.getByLabelText("Codex 推理强度"), {
      target: { value: "high" },
    });
    fireEvent.change(screen.getByLabelText("Codex 上下文窗口"), {
      target: { value: "300000" },
    });
    fireEvent.change(screen.getByLabelText("Codex 自动压缩阈值"), {
      target: { value: "240000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(window.desktopApp.saveProviderSettings).toHaveBeenCalledWith({
        providerId: "codex",
        baseUrl: "https://gateway.example.com/v1",
        apiKey: "",
        defaultModel: "gpt-5.4",
        defaultVerbosity: "high",
        defaultReasoningEffort: "high",
        modelContextWindow: 300000,
        modelAutoCompactTokenLimit: 240000,
      });
    });
  });

  it("opens the Codex config file menu and reveals the selected file", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "设置" }));
    fireEvent.click(screen.getByRole("button", { name: "供应商" }));
    await screen.findByText("使用当前 Claude 登录状态");
    fireEvent.click(screen.getByRole("button", { name: "Codex" }));
    await screen.findByLabelText("Codex 接口地址");
    fireEvent.click(screen.getByRole("button", { name: "打开配置" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "auth.json" }));

    await waitFor(() => {
      expect(window.desktopApp.showItemInFolder).toHaveBeenCalledWith(
        "/Users/test/.claude/auth.json",
      );
    });
  });

  it("switches back to Claude from the provider settings panel", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "设置" }));
    fireEvent.click(screen.getByRole("button", { name: "供应商" }));
    fireEvent.click(await screen.findByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(window.desktopApp.saveProviderSettings).toHaveBeenCalledWith({
        providerId: "anthropic",
      });
    });
  });

  it("opens the header MCP quick menu, toggles a server, and jumps to MCP settings", async () => {
    render(<App />);
    const header = screen.getByRole("banner");

    fireEvent.click(
      await within(header).findByRole("button", { name: "Open MCP quick menu" }),
    );

    expect(await screen.findByText("MCP")).toBeInTheDocument();
    expect(screen.getByText("context7")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "context7 quick toggle" }));

    await waitFor(() => {
      expect(window.desktopApp.toggleMcpServer).toHaveBeenCalledWith({
        name: "context7",
        enabled: false,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "打开 MCP 设置" }));

    expect(await screen.findByRole("heading", { name: "MCP 服务器" })).toBeInTheDocument();
  });

  it("renders MCP settings and saves a new stdio server", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "设置" }));
    fireEvent.click(screen.getByRole("button", { name: "MCP 服务器" }));

    expect(await screen.findByRole("heading", { name: "MCP 服务器" })).toBeInTheDocument();
    expect(screen.getByText("自定义服务器")).toBeInTheDocument();
    expect(screen.getByText("context7")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "context7 启用状态" }));

    await waitFor(() => {
      expect(window.desktopApp.toggleMcpServer).toHaveBeenCalledWith({
        name: "context7",
        enabled: false,
      });
    });

    fireEvent.click(screen.getAllByRole("button", { name: "添加服务器" })[0]);
    expect(await screen.findByText("添加服务器")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("MCP 服务器名称"), {
      target: { value: "pencil" },
    });
    fireEvent.change(screen.getByLabelText("MCP 启动命令"), {
      target: { value: "npx" },
    });
    fireEvent.change(screen.getByLabelText("MCP 启动参数"), {
      target: { value: "-y\n@modelcontextprotocol/server-filesystem" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("变量名")[0], {
      target: { value: "ROOT_DIR" },
    });
    fireEvent.change(screen.getAllByPlaceholderText("变量值")[0], {
      target: { value: "/tmp" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(window.desktopApp.saveMcpServer).toHaveBeenCalledWith({
        previousName: null,
        name: "pencil",
        enabled: true,
        transport: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem"],
        env: [{ key: "ROOT_DIR", value: "/tmp" }],
      });
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
