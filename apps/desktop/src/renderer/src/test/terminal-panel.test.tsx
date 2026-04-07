import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const terminalMocks = vi.hoisted(() => {
  const terminalInstances: MockTerminal[] = [];
  const terminalDataHandlers: Array<(data: string) => void> = [];
  const fitAddonInstances: MockFitAddon[] = [];

  class MockFitAddon {
    fit = vi.fn();

    constructor() {
      fitAddonInstances.push(this);
    }
  }

  class MockTerminal {
    options: Record<string, unknown> = {};
    loadAddon = vi.fn();
    open = vi.fn();
    focus = vi.fn();
    onData = vi.fn((handler: (data: string) => void) => {
      terminalDataHandlers.push(handler);
      return {
        dispose: vi.fn(),
      };
    });
    dispose = vi.fn();
    write = vi.fn();
    writeln = vi.fn();

    constructor(options?: Record<string, unknown>) {
      this.options = {
        ...options,
      };
      terminalInstances.push(this);
    }
  }

  return {
    MockFitAddon,
    MockTerminal,
    terminalInstances,
    terminalDataHandlers,
    fitAddonInstances,
  };
});

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: terminalMocks.MockFitAddon,
}));

vi.mock("@xterm/xterm", () => ({
  Terminal: terminalMocks.MockTerminal,
  default: {
    Terminal: terminalMocks.MockTerminal,
  },
}));

import { TerminalPanel } from "@renderer/components/terminal/terminal-panel";

describe("TerminalPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    terminalMocks.terminalInstances.length = 0;
    terminalMocks.terminalDataHandlers.length = 0;
    terminalMocks.fitAddonInstances.length = 0;
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("style");
  });

  it("为 shell 终端建立输入桥接并显式聚焦", async () => {
    const { container } = render(
      <TerminalPanel sessionId="shell:test" cwd="/tmp" profile="shell" />,
    );

    await waitFor(() => {
      expect(window.desktopApp.createTerminalSession).toHaveBeenCalledWith({
        sessionId: "shell:test",
        cwd: "/tmp",
        profile: "shell",
      });
    });

    expect(terminalMocks.terminalInstances).toHaveLength(1);
    expect(terminalMocks.fitAddonInstances).toHaveLength(1);

    await waitFor(() => {
      expect(terminalMocks.terminalInstances[0]?.focus).toHaveBeenCalled();
    });

    terminalMocks.terminalDataHandlers[0]?.("echo 1\r");

    await waitFor(() => {
      expect(window.desktopApp.writeTerminal).toHaveBeenCalledWith(
        "shell:test",
        "echo 1\r",
      );
    });

    const host = container.querySelector("[data-no-drag]");
    expect(host).not.toBeNull();

    const focusCallsBeforeClick =
      terminalMocks.terminalInstances[0]?.focus.mock.calls.length ?? 0;
    fireEvent.pointerDown(host!);

    expect(terminalMocks.terminalInstances[0]?.focus.mock.calls.length).toBeGreaterThan(
      focusCallsBeforeClick,
    );
  });

  it("为 thread-tui 保留后端输入通道但不自动聚焦", async () => {
    render(
      <TerminalPanel
        sessionId="thread-tui:test"
        cwd="/tmp/project"
        profile="thread-tui"
      />,
    );

    await waitFor(() => {
      expect(window.desktopApp.createTerminalSession).toHaveBeenCalledWith({
        sessionId: "thread-tui:test",
        cwd: "/tmp/project",
        profile: "thread-tui",
      });
    });

    expect(terminalMocks.terminalInstances).toHaveLength(1);

    terminalMocks.terminalDataHandlers[0]?.("\u001b[>q");

    await waitFor(() => {
      expect(window.desktopApp.writeTerminal).toHaveBeenCalledWith(
        "thread-tui:test",
        "\u001b[>q",
      );
    });

    expect(terminalMocks.terminalInstances[0]?.focus).not.toHaveBeenCalled();
  });

  it("在复用既有会话时回放 backlog，避免 thread-tui 首帧丢失", async () => {
    vi.mocked(window.desktopApp.createTerminalSession)
      .mockResolvedValueOnce({
        sessionId: "thread-tui:strict",
        cwd: "/tmp/project",
        shellPath: "/Users/test/bin/rcode",
        created: true,
        alive: true,
      })
      .mockResolvedValueOnce({
        sessionId: "thread-tui:strict",
        cwd: "/tmp/project",
        shellPath: "/Users/test/bin/rcode",
        created: false,
        alive: true,
        backlog: "Claude Code 首屏",
      });

    const firstRender = render(
      <TerminalPanel
        sessionId="thread-tui:strict"
        cwd="/tmp/project"
        profile="thread-tui"
        persistOnUnmount
      />,
    );

    await waitFor(() => {
      expect(window.desktopApp.createTerminalSession).toHaveBeenCalledTimes(1);
    });

    firstRender.unmount();

    render(
      <TerminalPanel
        sessionId="thread-tui:strict"
        cwd="/tmp/project"
        profile="thread-tui"
        persistOnUnmount
      />,
    );

    await waitFor(() => {
      expect(window.desktopApp.createTerminalSession).toHaveBeenCalledTimes(2);
      expect(terminalMocks.terminalInstances[1]?.write).toHaveBeenCalledWith(
        "Claude Code 首屏",
      );
    });

    expect(window.desktopApp.closeTerminal).not.toHaveBeenCalled();
  });

  it("将主进程输出写入 xterm，避免面板黑屏但后端已有输出", async () => {
    let onTerminalDataListener:
      | ((payload: { sessionId: string; chunk: string }) => void)
      | undefined;

    vi.mocked(window.desktopApp.onTerminalData).mockImplementation((listener) => {
      onTerminalDataListener = listener;
      return () => {};
    });

    render(
      <TerminalPanel
        sessionId="thread-tui:stream"
        cwd="/tmp/project"
        profile="thread-tui"
      />,
    );

    await waitFor(() => {
      expect(window.desktopApp.createTerminalSession).toHaveBeenCalledWith({
        sessionId: "thread-tui:stream",
        cwd: "/tmp/project",
        profile: "thread-tui",
      });
    });

    onTerminalDataListener?.({
      sessionId: "thread-tui:stream",
      chunk: "Claude Code 首屏",
    });

    expect(terminalMocks.terminalInstances[0]?.write).toHaveBeenCalledWith(
      "Claude Code 首屏",
    );
  });

  it("embedded 模式仅展示终端内容，不渲染额外标题条", async () => {
    const { queryByText, queryByLabelText, container } = render(
      <TerminalPanel
        sessionId="thread-tui:embedded"
        cwd="/tmp/project"
        profile="thread-tui"
        chrome="embedded"
        title="新线程"
        subtitle="/tmp/project"
      />,
    );

    await waitFor(() => {
      expect(window.desktopApp.createTerminalSession).toHaveBeenCalledWith({
        sessionId: "thread-tui:embedded",
        cwd: "/tmp/project",
        profile: "thread-tui",
      });
    });

    expect(queryByText("新线程")).not.toBeInTheDocument();
    expect(queryByText("/tmp/project")).not.toBeInTheDocument();
    expect(queryByLabelText("Hide terminal")).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-terminal-chrome="embedded"]'),
    ).toBeInTheDocument();
  });

  it("embedded 模式在亮色主题下初始化为亮色终端配色", async () => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.style.setProperty(
      "--color-terminal-embedded-bg",
      "rgba(255, 255, 255, 0)",
    );
    document.documentElement.style.setProperty(
      "--color-terminal-embedded-fg",
      "#162033",
    );
    document.documentElement.style.setProperty(
      "--color-terminal-embedded-cursor",
      "#162033",
    );
    document.documentElement.style.setProperty(
      "--color-terminal-embedded-cursor-accent",
      "#f8fafc",
    );

    render(
      <TerminalPanel
        sessionId="thread-tui:embedded-light"
        cwd="/tmp/project"
        profile="thread-tui"
        chrome="embedded"
      />,
    );

    await waitFor(() => {
      expect(window.desktopApp.createTerminalSession).toHaveBeenCalledWith({
        sessionId: "thread-tui:embedded-light",
        cwd: "/tmp/project",
        profile: "thread-tui",
      });
    });

    expect(terminalMocks.terminalInstances[0]?.options.theme).toMatchObject({
      background: "rgba(255, 255, 255, 0)",
      foreground: "#162033",
      cursor: "#162033",
      cursorAccent: "#f8fafc",
    });
    expect(
      (terminalMocks.terminalInstances[0]?.options.theme as { extendedAnsi?: string[] })
        .extendedAnsi,
    ).toHaveLength(240);
    expect(
      (terminalMocks.terminalInstances[0]?.options.theme as { extendedAnsi?: string[] })
        .extendedAnsi?.[131],
    ).toBe("#7377b0");
  });
});
