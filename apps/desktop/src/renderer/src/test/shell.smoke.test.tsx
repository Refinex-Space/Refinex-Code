import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import { App } from "@renderer/app";
import {
  DEFAULT_SIDEBAR_WIDTH,
  useUIStore,
} from "@renderer/stores/ui";
import { emptySidebarState } from "@renderer/stores/worktree";
import type {
  SidebarStateSnapshot,
  SkillSnapshot,
} from "../../../shared/contracts";

const slashCommandSidebarState = {
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
          title: "新线程",
          status: "idle",
          createdAt: "2026-04-06T00:00:00.000Z",
          updatedAt: "2026-04-06T00:00:00.000Z",
          lastOpenedAt: "2026-04-06T00:00:00.000Z",
          storagePath:
            "/Users/test/Library/Application Support/RWork/sidebar-state/worktrees/alpha/sessions/thread-2.json",
        },
      ],
    },
  ],
} satisfies SidebarStateSnapshot;

const slashCommandSkillSnapshot = {
  activeWorktreePath: "/Users/test/projects/alpha",
  generatedAt: "2026-04-07T00:00:00.000Z",
  skills: [
    {
      id: "personal:harness-feat",
      name: "harness-feat",
      displayName: "harness-feat",
      sourceKind: "personal",
      sourceLabel: "Personal skills",
      skillRoot: "/Users/test/.agents/skills/harness-feat",
      skillMdPath: "/Users/test/.agents/skills/harness-feat/SKILL.md",
      description: "Plan and execute features with harness discipline.",
      userInvocable: true,
      disableModelInvocation: false,
      invokedBy: "User or RWork",
      addedBy: "User",
      lastUpdated: "2026-04-07T00:00:00.000Z",
      tree: [],
    },
    {
      id: "personal:tech-writing",
      name: "tech-writing",
      displayName: "tech-writing",
      sourceKind: "personal",
      sourceLabel: "Personal skills",
      skillRoot: "/Users/test/.agents/skills/tech-writing",
      skillMdPath: "/Users/test/.agents/skills/tech-writing/SKILL.md",
      description: "Write long-form technical content for engineering work.",
      userInvocable: true,
      disableModelInvocation: false,
      invokedBy: "User or RWork",
      addedBy: "User",
      lastUpdated: "2026-04-07T00:00:00.000Z",
      tree: [],
    },
  ],
} satisfies SkillSnapshot;

describe("desktop shell", () => {
  it("renders the shell frame and bootstrap content", async () => {
    render(<App />);

    expect(await screen.findByText("开始构建")).toBeInTheDocument();
    const header = screen.getByRole("banner");
    const main = screen.getByRole("main");
    expect(within(header).queryByRole("button", { name: "Open Project" })).not.toBeInTheDocument();
    expect(within(header).queryByRole("tablist", { name: "线程交互模式" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "设置" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "RWork logo" })).toBeInTheDocument();
    expect(within(main).getByText("选择项目")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("先打开一个项目，再从左侧创建或选择线程"),
    ).toBeInTheDocument();
  });

  it("uses a visible light-theme hover token in the GUI project picker", async () => {
    vi.mocked(window.desktopApp.getSidebarState).mockResolvedValue({
      ...emptySidebarState,
      storageRoot:
        "/Users/test/Library/Application Support/RWork/sidebar-state",
      activeWorktreeId: "alpha",
      activeSessionId: null,
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
          createdAt: "2026-04-07T00:00:00.000Z",
          updatedAt: "2026-04-07T00:00:00.000Z",
          lastOpenedAt: "2026-04-07T00:00:00.000Z",
          lastSessionId: null,
          sessions: [],
        },
        {
          id: "beta",
          label: "beta",
          sourcePath: "/Users/test/projects/beta",
          worktreePath: "/Users/test/projects/beta",
          gitRoot: "/Users/test/projects/beta",
          branch: "main",
          isGitRepository: true,
          storagePath:
            "/Users/test/Library/Application Support/RWork/sidebar-state/worktrees/beta",
          createdAt: "2026-04-07T00:00:00.000Z",
          updatedAt: "2026-04-07T00:00:00.000Z",
          lastOpenedAt: "2026-04-07T00:00:00.000Z",
          lastSessionId: null,
          sessions: [],
        },
      ],
    });

    render(<App />);

    expect(await screen.findByLabelText("当前项目：alpha")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("当前项目：alpha"));

    const menu = await screen.findByRole("menu");
    const inactiveProjectButton = within(menu).getByRole("button", {
      name: "beta",
    });
    const addProjectButton = within(menu).getByRole("button", {
      name: "添加新项目",
    });

    expect(inactiveProjectButton).toHaveClass(
      "hover:bg-[var(--color-sidebar-hover)]",
    );
    expect(addProjectButton).toHaveClass(
      "hover:bg-[var(--color-sidebar-hover)]",
    );
  });

  it("renders persisted worktrees and threads in the sidebar", async () => {
    const sidebarSnapshot: SidebarStateSnapshot = {
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
    };
    vi.mocked(window.desktopApp.getSidebarState).mockResolvedValue(sidebarSnapshot);
    vi.mocked(window.desktopApp.createSession).mockResolvedValue({
      ...sidebarSnapshot,
      activeSessionId: "thread-3",
      worktrees: [
        {
          ...sidebarSnapshot.worktrees[0]!,
          updatedAt: "2026-04-06T01:00:00.000Z",
          lastOpenedAt: "2026-04-06T01:00:00.000Z",
          lastSessionId: "thread-3",
          sessions: [
            {
              id: "thread-3",
              worktreeId: "alpha",
              title: "新线程",
              status: "idle",
              createdAt: "2026-04-06T01:00:00.000Z",
              updatedAt: "2026-04-06T01:00:00.000Z",
              lastOpenedAt: "2026-04-06T01:00:00.000Z",
              storagePath:
                "/Users/test/Library/Application Support/RWork/sidebar-state/worktrees/alpha/sessions/thread-3.json",
            },
            ...sidebarSnapshot.worktrees[0]!.sessions,
          ],
        },
      ],
    });

    render(<App />);

    const header = screen.getByRole("banner");
    expect((await screen.findAllByText("Thread 02")).length).toBeGreaterThan(0);
    expect(screen.getByText("Thread 01")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "搜索会话" })).toBeInTheDocument();
    expect(within(header).getByRole("tablist", { name: "线程交互模式" })).toBeInTheDocument();
    expect(within(header).getByRole("tab", { name: "切换到 TUI 模式" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      document.querySelector('[data-thread-surface="content"]'),
    ).toHaveClass("max-w-[920px]");
    expect(
      document.querySelector('[data-thread-composer="surface"]'),
    ).toHaveClass("mx-auto", "max-w-[920px]");
    expect(
      screen.getByRole("button", { name: "发送消息不可用" }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("描述下一步要做的事，Enter 发送，Shift+Enter 换行"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "选择供应商" })).toHaveTextContent("Claude");
      expect(screen.getByRole("button", { name: "选择模型" })).toHaveTextContent("Sonnet 4.6");
      expect(screen.getByRole("button", { name: "选择推理强度" })).toHaveTextContent("High");
    });

    fireEvent.click(screen.getByRole("button", { name: "选择供应商" }));
    fireEvent.click(await screen.findByText("Codex"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "选择供应商" })).toHaveTextContent("Codex");
      expect(screen.getByRole("button", { name: "选择模型" })).toHaveTextContent("GPT-5.4");
      expect(screen.getByRole("button", { name: "选择推理强度" })).toHaveTextContent("Medium");
    });

    fireEvent.click(screen.getByRole("button", { name: "选择模型" }));
    fireEvent.click(await screen.findByText("GPT-5.4 Mini"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "选择模型" })).toHaveTextContent("GPT-5.4 Mini");
      expect(screen.getByRole("button", { name: "选择推理强度" })).toHaveTextContent("Medium");
    });

    fireEvent.click(screen.getByRole("button", { name: "选择推理强度" }));
    fireEvent.click(await screen.findByText("Low"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "选择推理强度" })).toHaveTextContent("Low");
    });

    fireEvent.click(screen.getByRole("button", { name: "选择供应商" }));
    fireEvent.click(await screen.findByText("Claude"));
    fireEvent.click(screen.getByRole("button", { name: "选择模型" }));
    fireEvent.click(await screen.findByText("Haiku 4.5"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "选择模型" })).toHaveTextContent("Haiku 4.5");
      expect(screen.getByRole("button", { name: "选择推理强度" })).toHaveTextContent("N/A");
      expect(screen.getByRole("button", { name: "选择推理强度" })).toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "新线程" }));

    await waitFor(() => {
      expect(window.desktopApp.createSession).toHaveBeenCalledWith({
        worktreeId: "alpha",
        title: null,
      });
      expect(screen.getAllByText("新线程").length).toBeGreaterThan(0);
    });
  });

  it("switches between GUI and TUI modes and routes composer input into the correct backend", async () => {
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
              title: "新线程",
              status: "idle",
              createdAt: "2026-04-06T00:00:00.000Z",
              updatedAt: "2026-04-06T00:00:00.000Z",
              lastOpenedAt: "2026-04-06T00:00:00.000Z",
              storagePath:
                "/Users/test/Library/Application Support/RWork/sidebar-state/worktrees/alpha/sessions/thread-2.json",
            },
          ],
        },
      ],
    });

    render(<App />);

    const composer = await screen.findByLabelText("新线程");
    fireEvent.change(composer, {
      target: {
        value: "帮我检查 README",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送到当前线程 TUI" }));

    await waitFor(() => {
      expect(window.desktopApp.createTerminalSession).toHaveBeenCalledWith({
        sessionId: "thread-tui:thread-2",
        cwd: "/Users/test/projects/alpha",
        profile: "thread-tui",
      });
      expect(window.desktopApp.writeTerminal).toHaveBeenCalledWith(
        "thread-tui:thread-2",
        "帮我检查 README\r",
      );
    });

    vi.mocked(window.desktopApp.createTerminalSession).mockClear();
    vi.mocked(window.desktopApp.writeTerminal).mockClear();
    vi.mocked(window.desktopApp.getGuiConversation).mockClear();
    vi.mocked(window.desktopApp.sendGuiConversationMessage).mockClear();

    fireEvent.click(screen.getByRole("tab", { name: "切换到 GUI 模式" }));

    expect(await screen.findByText("开始一段 GUI 对话")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "切换到 GUI 模式" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await waitFor(() => {
      expect(window.desktopApp.getGuiConversation).toHaveBeenCalledWith("thread-2");
    });

    fireEvent.change(screen.getByLabelText("新线程"), {
      target: {
        value: "请总结 README 的核心目标",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送到 GUI 模式" }));

    await waitFor(() => {
      expect(window.desktopApp.sendGuiConversationMessage).toHaveBeenCalledWith({
        sessionId: "thread-2",
        worktreePath: "/Users/test/projects/alpha",
        prompt: "请总结 README 的核心目标",
        providerId: "anthropic",
        model: "claude-sonnet-4-6",
        effort: "high",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("请总结 README 的核心目标")).toBeInTheDocument();
      expect(screen.getByText("测试响应")).toBeInTheDocument();
    });

    expect(window.desktopApp.createTerminalSession).not.toHaveBeenCalled();
    expect(window.desktopApp.writeTerminal).not.toHaveBeenCalled();
  });

  it("shows code review slash suggestions above skills and routes /review input into thread tui", async () => {
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
              title: "新线程",
              status: "idle",
              createdAt: "2026-04-06T00:00:00.000Z",
              updatedAt: "2026-04-06T00:00:00.000Z",
              lastOpenedAt: "2026-04-06T00:00:00.000Z",
              storagePath:
                "/Users/test/Library/Application Support/RWork/sidebar-state/worktrees/alpha/sessions/thread-2.json",
            },
          ],
        },
      ],
    });
    vi.mocked(window.desktopApp.getSkillsSnapshot).mockResolvedValue({
      activeWorktreePath: "/Users/test/projects/alpha",
      generatedAt: "2026-04-07T00:00:00.000Z",
      skills: [
        {
          id: "personal:harness-feat",
          name: "harness-feat",
          displayName: "harness-feat",
          sourceKind: "personal",
          sourceLabel: "Personal skills",
          skillRoot: "/Users/test/.agents/skills/harness-feat",
          skillMdPath: "/Users/test/.agents/skills/harness-feat/SKILL.md",
          description: "Plan and execute features with harness discipline.",
          userInvocable: true,
          disableModelInvocation: false,
          invokedBy: "User or RWork",
          addedBy: "User",
          lastUpdated: "2026-04-07T00:00:00.000Z",
          tree: [],
        },
        {
          id: "personal:tech-writing",
          name: "tech-writing",
          displayName: "tech-writing",
          sourceKind: "personal",
          sourceLabel: "Personal skills",
          skillRoot: "/Users/test/.agents/skills/tech-writing",
          skillMdPath: "/Users/test/.agents/skills/tech-writing/SKILL.md",
          description: "Write long-form technical content for engineering work.",
          userInvocable: true,
          disableModelInvocation: false,
          invokedBy: "User or RWork",
          addedBy: "User",
          lastUpdated: "2026-04-07T00:00:00.000Z",
          tree: [],
        },
        {
          id: "personal:hidden-skill",
          name: "hidden-skill",
          displayName: "hidden-skill",
          sourceKind: "personal",
          sourceLabel: "Personal skills",
          skillRoot: "/Users/test/.agents/skills/hidden-skill",
          skillMdPath: "/Users/test/.agents/skills/hidden-skill/SKILL.md",
          description: "This skill should stay unavailable to slash input.",
          userInvocable: false,
          disableModelInvocation: false,
          invokedBy: "RWork",
          addedBy: "User",
          lastUpdated: "2026-04-07T00:00:00.000Z",
          tree: [],
        },
      ],
    });

    render(<App />);

    const composer = await screen.findByLabelText("新线程");
    vi.mocked(window.desktopApp.writeTerminal).mockClear();
    fireEvent.change(composer, {
      target: {
        value: "/",
      },
    });

    const suggestionList = await screen.findByRole("listbox", {
      name: "Slash suggestions",
    });
    expect(within(suggestionList).getByText("初始化")).toBeInTheDocument();
    expect(within(suggestionList).getByText("代码审查")).toBeInTheDocument();
    expect(within(suggestionList).getByText("技能")).toBeInTheDocument();
    expect(within(suggestionList).getByText("Init")).toBeInTheDocument();
    expect(within(suggestionList).getByText("Review")).toBeInTheDocument();
    expect(within(suggestionList).getByText("PR Comments")).toBeInTheDocument();
    expect(
      within(suggestionList).getByText("Security Review"),
    ).toBeInTheDocument();
    expect(within(suggestionList).getByRole("option", { name: /Harness Feat/i })).toBeInTheDocument();
    expect(within(suggestionList).getByRole("option", { name: /Tech Writing/i })).toBeInTheDocument();

    fireEvent.change(composer, {
      target: {
        value: "/rev",
      },
    });

    fireEvent.keyDown(composer, {
      key: "Enter",
    });

    await waitFor(() => {
      expect(
        screen.getByLabelText("已选择代码审查命令 Review"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("输入 PR 编号；留空发送时，CLI 会先列出可审查的 open PR。"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("listbox", { name: "Slash suggestions" }),
    ).not.toBeInTheDocument();
    expect(composer).toHaveAttribute(
      "placeholder",
      "输入 PR 编号，留空发送会先列出 open PR",
    );

    fireEvent.change(composer, {
      target: {
        value: "42",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送到当前线程 TUI" }));

    await waitFor(() => {
      expect(window.desktopApp.writeTerminal).toHaveBeenCalledWith(
        "thread-tui:thread-2",
        "/review 42\r",
      );
    });
  });

  it("supports /init as a built-in prompt command and routes it into thread tui", async () => {
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
              title: "新线程",
              status: "idle",
              createdAt: "2026-04-06T00:00:00.000Z",
              updatedAt: "2026-04-06T00:00:00.000Z",
              lastOpenedAt: "2026-04-06T00:00:00.000Z",
              storagePath:
                "/Users/test/Library/Application Support/RWork/sidebar-state/worktrees/alpha/sessions/thread-2.json",
            },
          ],
        },
      ],
    });
    vi.mocked(window.desktopApp.getSkillsSnapshot).mockResolvedValue({
      activeWorktreePath: "/Users/test/projects/alpha",
      generatedAt: "2026-04-07T00:00:00.000Z",
      skills: [],
    });

    render(<App />);

    const composer = await screen.findByLabelText("新线程");
    vi.mocked(window.desktopApp.writeTerminal).mockClear();
    fireEvent.change(composer, {
      target: {
        value: "/ini",
      },
    });

    const suggestionList = await screen.findByRole("listbox", {
      name: "Slash suggestions",
    });
    expect(within(suggestionList).getByText("初始化")).toBeInTheDocument();
    expect(within(suggestionList).getByRole("option", { name: /Init/i })).toBeInTheDocument();

    fireEvent.keyDown(composer, {
      key: "Enter",
    });

    await waitFor(() => {
      expect(
        screen.getByLabelText("已选择初始化命令 Init"),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("直接发送即可；CLI 会先扫描代码库，并通过提问逐步确定 AGENTS、skills 和 hooks 的产出范围。"),
    ).toBeInTheDocument();
    expect(composer).toHaveAttribute(
      "placeholder",
      "直接发送，开始扫描代码库并初始化 AGENTS / skills / hooks",
    );

    fireEvent.click(screen.getByRole("button", { name: "发送到当前线程 TUI" }));

    await waitFor(() => {
      expect(window.desktopApp.writeTerminal).toHaveBeenCalledWith(
        "thread-tui:thread-2",
        "/init\r",
      );
    });
  });

  it("keeps slash skill suggestions selectable as pills after adding code review commands", async () => {
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
              title: "新线程",
              status: "idle",
              createdAt: "2026-04-06T00:00:00.000Z",
              updatedAt: "2026-04-06T00:00:00.000Z",
              lastOpenedAt: "2026-04-06T00:00:00.000Z",
              storagePath:
                "/Users/test/Library/Application Support/RWork/sidebar-state/worktrees/alpha/sessions/thread-2.json",
            },
          ],
        },
      ],
    });
    vi.mocked(window.desktopApp.getSkillsSnapshot).mockResolvedValue({
      activeWorktreePath: "/Users/test/projects/alpha",
      generatedAt: "2026-04-07T00:00:00.000Z",
      skills: [
        {
          id: "personal:harness-feat",
          name: "harness-feat",
          displayName: "harness-feat",
          sourceKind: "personal",
          sourceLabel: "Personal skills",
          skillRoot: "/Users/test/.agents/skills/harness-feat",
          skillMdPath: "/Users/test/.agents/skills/harness-feat/SKILL.md",
          description: "Plan and execute features with harness discipline.",
          userInvocable: true,
          disableModelInvocation: false,
          invokedBy: "User or RWork",
          addedBy: "User",
          lastUpdated: "2026-04-07T00:00:00.000Z",
          tree: [],
        },
        {
          id: "personal:tech-writing",
          name: "tech-writing",
          displayName: "tech-writing",
          sourceKind: "personal",
          sourceLabel: "Personal skills",
          skillRoot: "/Users/test/.agents/skills/tech-writing",
          skillMdPath: "/Users/test/.agents/skills/tech-writing/SKILL.md",
          description: "Write long-form technical content for engineering work.",
          userInvocable: true,
          disableModelInvocation: false,
          invokedBy: "User or RWork",
          addedBy: "User",
          lastUpdated: "2026-04-07T00:00:00.000Z",
          tree: [],
        },
        {
          id: "personal:hidden-skill",
          name: "hidden-skill",
          displayName: "hidden-skill",
          sourceKind: "personal",
          sourceLabel: "Personal skills",
          skillRoot: "/Users/test/.agents/skills/hidden-skill",
          skillMdPath: "/Users/test/.agents/skills/hidden-skill/SKILL.md",
          description: "This skill should stay unavailable to slash input.",
          userInvocable: false,
          disableModelInvocation: false,
          invokedBy: "RWork",
          addedBy: "User",
          lastUpdated: "2026-04-07T00:00:00.000Z",
          tree: [],
        },
      ],
    });

    render(<App />);

    const composer = await screen.findByLabelText("新线程");
    fireEvent.change(composer, {
      target: {
        value: "/tech",
      },
    });

    const suggestionList = await screen.findByRole("listbox", {
      name: "Slash suggestions",
    });
    expect(
      within(suggestionList).queryByRole("option", { name: /Hidden Skill/i }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(composer, {
      key: "Enter",
    });

    await waitFor(() => {
      expect(composer).toHaveValue("");
    });
    const firstPill = screen.getByLabelText("已选择技能 Tech Writing");
    expect(firstPill).toBeInTheDocument();
    expect(firstPill).toHaveClass("text-[length:var(--ui-font-size-lg)]");
    expect(firstPill).toHaveClass("px-2.5", "py-0", "leading-6", "gap-1", "h-6", "self-start");
    expect(firstPill.parentElement).toHaveClass("items-start");
    expect(composer).toHaveClass("py-0");
    expect(
      screen.queryByRole("listbox", { name: "Slash suggestions" }),
    ).not.toBeInTheDocument();

    fireEvent.change(composer, {
      target: {
        value: "/har",
      },
    });

    const secondSuggestionList = await screen.findByRole("listbox", {
      name: "Slash suggestions",
    });
    expect(
      within(secondSuggestionList).getByRole("option", { name: /Harness Feat/i }),
    ).toBeInTheDocument();

    fireEvent.keyDown(composer, {
      key: "Enter",
    });

    await waitFor(() => {
      expect(screen.getByLabelText("已选择技能 Harness Feat")).toBeInTheDocument();
    });

    fireEvent.change(composer, {
      target: {
        value: "帮我写一段发布说明",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "发送到当前线程 TUI" }));

    await waitFor(() => {
      expect(window.desktopApp.writeTerminal).toHaveBeenCalledWith(
        "thread-tui:thread-2",
        "/tech-writing /harness-feat 帮我写一段发布说明\r",
      );
    });
  });

  it("shows /status as a hover card instead of writing a slash command pill", async () => {
    vi.mocked(window.desktopApp.getSidebarState).mockResolvedValue(
      slashCommandSidebarState,
    );
    vi.mocked(window.desktopApp.getSkillsSnapshot).mockResolvedValue(
      slashCommandSkillSnapshot,
    );

    render(<App />);

    const composer = await screen.findByLabelText("新线程");
    fireEvent.change(composer, {
      target: {
        value: "/",
      },
    });

    const suggestionList = await screen.findByRole("listbox", {
      name: "Slash suggestions",
    });
    expect(suggestionList).toHaveClass("inset-x-0", "mb-1.5");
    expect(suggestionList.parentElement?.parentElement).toHaveClass(
      "relative",
      "rounded-[28px]",
    );
    expect(
      within(suggestionList).getByText("状态、诊断与运营"),
    ).toBeInTheDocument();

    fireEvent.change(composer, {
      target: {
        value: "/status",
      },
    });
    fireEvent.keyDown(composer, {
      key: "Enter",
    });

    const previewCard = await screen.findByRole("dialog", {
      name: "运行状态总览 悬浮卡片",
    });
    expect(previewCard).toHaveClass("inset-x-0", "mb-1.5");
    expect(previewCard.parentElement?.parentElement).toHaveClass(
      "relative",
      "rounded-[28px]",
    );
    expect(within(previewCard).getByText("/status")).toBeInTheDocument();
    expect(within(previewCard).getByText("Desktop 版本")).toBeInTheDocument();
    expect(within(previewCard).getByText("0.1.0")).toBeInTheDocument();
    expect(within(previewCard).getByText("Claude · Sonnet 4.6")).toBeInTheDocument();
    expect(
      within(previewCard).queryByText("对齐 CLI 的即时状态入口，先用 desktop 已知本地状态给你一眼看清当前工作面。"),
    ).not.toBeInTheDocument();
    expect(
      within(previewCard).queryByText("CLI 中该命令会打开完整运行状态总览；desktop 当前先展示本地快照与入口语义。"),
    ).not.toBeInTheDocument();
    expect(
      within(previewCard).queryByText("点击右上角关闭按钮、空白处，或继续输入，也会立即收起这张卡片。"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("已选择代码审查命令 Review"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("listbox", { name: "Slash suggestions" }),
    ).not.toBeInTheDocument();
  });

  it("dismisses the status hover card when clicking outside the composer", async () => {
    vi.mocked(window.desktopApp.getSidebarState).mockResolvedValue(
      slashCommandSidebarState,
    );
    vi.mocked(window.desktopApp.getSkillsSnapshot).mockResolvedValue(
      slashCommandSkillSnapshot,
    );

    render(<App />);

    const composer = await screen.findByLabelText("新线程");
    fireEvent.change(composer, {
      target: {
        value: "/stats",
      },
    });
    fireEvent.keyDown(composer, {
      key: "Enter",
    });

    expect(
      await screen.findByRole("dialog", { name: "使用统计预览 悬浮卡片" }),
    ).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "使用统计预览 悬浮卡片" }),
      ).not.toBeInTheDocument();
    });
  });

  it("keeps the keyboard-highlighted slash suggestion centered in the panel", async () => {
    vi.mocked(window.desktopApp.getSidebarState).mockResolvedValue(
      slashCommandSidebarState,
    );
    vi.mocked(window.desktopApp.getSkillsSnapshot).mockResolvedValue(
      slashCommandSkillSnapshot,
    );

    const scrollIntoViewMock = vi.fn();
    const originalScrollIntoView = HTMLButtonElement.prototype.scrollIntoView;
    Object.defineProperty(HTMLButtonElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoViewMock,
    });

    try {
      render(<App />);

      const composer = await screen.findByLabelText("新线程");
      fireEvent.change(composer, {
        target: {
          value: "/",
        },
      });

      await screen.findByRole("listbox", {
        name: "Slash suggestions",
      });

      fireEvent.keyDown(composer, {
        key: "ArrowDown",
      });

      expect(scrollIntoViewMock).toHaveBeenCalled();
      expect(scrollIntoViewMock).toHaveBeenLastCalledWith({
        block: "center",
      });
    } finally {
      Object.defineProperty(HTMLButtonElement.prototype, "scrollIntoView", {
        configurable: true,
        value: originalScrollIntoView,
      });
    }
  });

  it("dismisses the usage hover card from the close button", async () => {
    vi.mocked(window.desktopApp.getSidebarState).mockResolvedValue(
      slashCommandSidebarState,
    );
    vi.mocked(window.desktopApp.getSkillsSnapshot).mockResolvedValue(
      slashCommandSkillSnapshot,
    );

    render(<App />);

    const composer = await screen.findByLabelText("新线程");
    fireEvent.change(composer, {
      target: {
        value: "/usage",
      },
    });
    fireEvent.keyDown(composer, {
      key: "Enter",
    });

    expect(
      screen.getByRole("dialog", { name: "额度与账户概览 悬浮卡片" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "关闭状态预览卡片" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "额度与账户概览 悬浮卡片" }),
      ).not.toBeInTheDocument();
    });
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

  it("starts voice dictation and writes transcript into the composer", async () => {
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
              title: "新线程",
              status: "idle",
              createdAt: "2026-04-06T00:00:00.000Z",
              updatedAt: "2026-04-06T00:00:00.000Z",
              lastOpenedAt: "2026-04-06T00:00:00.000Z",
              storagePath:
                "/Users/test/Library/Application Support/RWork/sidebar-state/worktrees/alpha/sessions/thread-2.json",
            },
          ],
        },
      ],
    });

    render(<App />);

    const composer = await screen.findByLabelText("新线程");
    fireEvent.keyDown(window, {
      altKey: true,
      code: "Space",
      key: " ",
    });

    await waitFor(() => {
      expect(window.desktopApp.prepareVoiceDictation).toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "结束语音输入" })).toBeInTheDocument();
    });

    const audioContextClass = window.AudioContext as unknown as {
      lastProcessor: {
        emit: (samples: number[]) => void;
      } | null;
    };

    expect(audioContextClass.lastProcessor).not.toBeNull();

    act(() => {
      audioContextClass.lastProcessor?.emit(new Array(4096).fill(0.08));
    });

    fireEvent.click(screen.getByRole("button", { name: "结束语音输入" }));

    await waitFor(() => {
      expect(window.desktopApp.transcribeVoiceDictation).toHaveBeenCalled();
      expect(composer).toHaveValue("帮我总结这个项目");
    });
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
  }, 10000);

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
  }, 10000);

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
