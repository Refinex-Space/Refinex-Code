import "@testing-library/jest-dom/vitest";
import { beforeEach, vi } from "vitest";
import type { DesktopBridge } from "../../../shared/contracts";
import { DEFAULT_APPEARANCE_SETTINGS } from "../../../shared/appearance-settings";
import type { DesktopMcpSettingsSnapshot } from "../../../shared/mcp-settings";
import type { DesktopProviderSettingsSnapshot } from "../../../shared/provider-settings";
import { useUIStore } from "@renderer/stores/ui";
import { emptySidebarState, useWorktreeStore } from "@renderer/stores/worktree";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class MediaStreamTrackMock {
  stop = vi.fn();
}

class MediaStreamMock {
  track = new MediaStreamTrackMock();

  getTracks() {
    return [this.track];
  }
}

class ScriptProcessorNodeMock {
  onaudioprocess: ((event: { inputBuffer: { getChannelData: (channel: number) => Float32Array } }) => void) | null =
    null;
  connect = vi.fn();
  disconnect = vi.fn();

  emit(samples: number[]) {
    this.onaudioprocess?.({
      inputBuffer: {
        getChannelData: () => Float32Array.from(samples),
      },
    });
  }
}

class MediaStreamAudioSourceNodeMock {
  connect = vi.fn();
  disconnect = vi.fn();
}

class GainNodeMock {
  gain = { value: 1 };
  connect = vi.fn();
  disconnect = vi.fn();
}

class AudioContextMock {
  sampleRate = 48000;
  static lastProcessor: ScriptProcessorNodeMock | null = null;

  createMediaStreamSource = vi.fn(() => new MediaStreamAudioSourceNodeMock());
  createScriptProcessor = vi.fn(() => {
    const processor = new ScriptProcessorNodeMock();
    AudioContextMock.lastProcessor = processor;
    return processor;
  });
  createGain = vi.fn(() => new GainNodeMock());
  close = vi.fn().mockResolvedValue(undefined);

  static reset() {
    AudioContextMock.lastProcessor = null;
  }
}

if (typeof HTMLCanvasElement !== "undefined") {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    writable: true,
    value: vi.fn(() => ({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    })),
  });
}

if (typeof HTMLElement !== "undefined") {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    writable: true,
    value: vi.fn(),
  });
}

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: ResizeObserverMock,
  });

  Object.defineProperty(window, "AudioContext", {
    writable: true,
    value: AudioContextMock,
  });

  Object.defineProperty(window.navigator, "mediaDevices", {
    writable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue(new MediaStreamMock()),
    },
  });
}

const defaultSidebarState = {
  ...emptySidebarState,
  storageRoot: "/Users/test/Library/Application Support/RWork/sidebar-state",
};

const defaultSkillsSnapshot = {
  skills: [],
  activeWorktreePath: null,
  generatedAt: "2026-04-06T00:00:00.000Z",
};

const defaultAppearanceSettings = {
  ...DEFAULT_APPEARANCE_SETTINGS,
  storagePath:
    "/Users/test/Library/Application Support/RWork/appearance-settings.json",
};

const defaultProviderSettings: DesktopProviderSettingsSnapshot = {
  activeProviderId: "anthropic",
  requestedProviderId: "anthropic",
  warning: null,
  lock: null,
  paths: {
    providersPath: "/Users/test/.claude/providers.json",
    authPath: "/Users/test/.claude/auth.json",
    settingsPath: "/Users/test/.claude/settings.json",
  },
  anthropic: {
    providerId: "anthropic",
    label: "Claude",
    description:
      "内建 Anthropic Messages 供应商，认证与订阅流程仍由 CLI 现有登录链路负责。",
    driver: "anthropic-messages",
    baseUrl: "https://api.anthropic.com",
    defaultModel: "claude-sonnet-4-6",
    defaultReasoningEffort: "high",
    isActive: true,
  },
  codex: {
    providerId: "codex",
    label: "Codex",
    description:
      "使用 OpenAI Responses 兼容配置来驱动桌面端与 CLI 的 Codex 供应商。",
    driver: "openai-responses",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5.4",
    defaultVerbosity: "medium",
    defaultReasoningEffort: "medium",
    modelContextWindow: undefined,
    modelAutoCompactTokenLimit: undefined,
    resolvedModelContextWindow: 272000,
    resolvedModelAutoCompactTokenLimit: 244800,
    hasStoredCredential: true,
    isActive: false,
  },
  codexModels: [
    {
      id: "gpt-5.4",
      label: "GPT-5.4",
      description: "Best default for general coding and planning",
      supportedEffortLevels: ["minimal", "low", "medium", "high", "xhigh"],
      defaultEffortLevel: "medium",
      supportedVerbosityLevels: ["low", "medium", "high"],
      defaultVerbosity: "medium",
      defaultContextWindowTokens: 272000,
    },
    {
      id: "gpt-5.4-mini",
      label: "GPT-5.4 Mini",
      description: "Faster and lighter for routine coding tasks",
      supportedEffortLevels: ["minimal", "low", "medium", "high"],
      defaultEffortLevel: "low",
      supportedVerbosityLevels: ["low", "medium", "high"],
      defaultVerbosity: "medium",
      defaultContextWindowTokens: 272000,
    },
  ],
};

const defaultMcpSettings: DesktopMcpSettingsSnapshot = {
  storagePath: "/Users/test/.claude.json",
  servers: [
    {
      name: "context7",
      enabled: true,
      transport: "stdio",
      transportLabel: "STDIO",
      summary: "npx -y @upstash/context7-mcp",
      command: "npx",
      args: ["-y", "@upstash/context7-mcp"],
      env: [{ key: "API_KEY", value: "ctx7sk-test" }],
    },
  ],
  unsupportedServers: [],
  transportOptions: [
    {
      value: "stdio",
      label: "STDIO",
      description: "通过本地命令启动 MCP 进程。",
    },
    {
      value: "http",
      label: "流式 HTTP",
      description: "连接支持 Streamable HTTP 的远程 MCP 服务。",
    },
    {
      value: "sse",
      label: "SSE",
      description: "兼容部分仍使用 SSE 的远程 MCP 服务。",
    },
  ],
};

const desktopBridgeMock: DesktopBridge = {
  getAppInfo: vi.fn().mockResolvedValue({
    appName: "RWork",
    appVersion: "0.1.0",
    platform: "darwin",
    defaultWorkspacePath: null,
  }),
  getSidebarState: vi.fn().mockResolvedValue(defaultSidebarState),
  getSkillsSnapshot: vi.fn().mockResolvedValue(defaultSkillsSnapshot),
  readSkillFile: vi.fn().mockResolvedValue({
    path: "/Users/test/.agents/skills/example/SKILL.md",
    kind: "markdown",
    size: 24,
    language: "markdown",
    content: "# Example\n\nBody",
  }),
  replaceSkill: vi.fn().mockResolvedValue({
    cancelled: false,
    snapshot: defaultSkillsSnapshot,
  }),
  downloadSkill: vi.fn().mockResolvedValue({
    cancelled: false,
    targetPath: "/Users/test/Downloads/example.zip",
  }),
  uninstallSkill: vi.fn().mockResolvedValue({
    cancelled: false,
    snapshot: defaultSkillsSnapshot,
  }),
  uploadSkill: vi.fn().mockResolvedValue({
    cancelled: false,
    snapshot: defaultSkillsSnapshot,
  }),
  getRemoteSkillCatalog: vi.fn().mockResolvedValue({
    skills: [],
    fetchedAt: "2026-04-06T00:00:00.000Z",
  }),
  installRemoteSkill: vi.fn().mockResolvedValue({
    cancelled: false,
    snapshot: defaultSkillsSnapshot,
  }),
  prepareVoiceDictation: vi.fn().mockResolvedValue({
    available: true,
    provider: "sherpa-onnx",
    modelId: "sherpa-onnx-paraformer-zh-small-2024-03-09",
    modelLabel: "Paraformer ZH Small",
    downloaded: true,
    message: null,
  }),
  transcribeVoiceDictation: vi.fn().mockResolvedValue({
    text: "帮我总结这个项目",
    modelLabel: "Paraformer ZH Small",
    sampleRate: 16000,
    sampleCount: 16000,
    durationMs: 180,
  }),
  openVoiceDictationModelsDirectory: vi.fn().mockResolvedValue(undefined),
  onVoiceDictationProgress: vi.fn().mockImplementation(() => () => {}),
  getAppearanceSettings: vi.fn().mockResolvedValue(defaultAppearanceSettings),
  saveAppearanceSettings: vi
    .fn()
    .mockImplementation(async (settings) => ({ ...settings, storagePath: defaultAppearanceSettings.storagePath })),
  getProviderSettings: vi.fn().mockResolvedValue(defaultProviderSettings),
  saveProviderSettings: vi.fn().mockImplementation(async (settings) => {
    if (settings.providerId === "anthropic") {
      return {
        ...defaultProviderSettings,
        activeProviderId: "anthropic",
        requestedProviderId: "anthropic",
        anthropic: {
          ...defaultProviderSettings.anthropic,
          isActive: true,
        },
        codex: {
          ...defaultProviderSettings.codex,
          isActive: false,
        },
      };
    }

    return {
      ...defaultProviderSettings,
      activeProviderId: "codex",
      requestedProviderId: "codex",
      codex: {
        ...defaultProviderSettings.codex,
        baseUrl: settings.baseUrl,
        defaultModel: settings.defaultModel,
        defaultVerbosity: settings.defaultVerbosity,
        defaultReasoningEffort: settings.defaultReasoningEffort,
        modelContextWindow: settings.modelContextWindow,
        modelAutoCompactTokenLimit: settings.modelAutoCompactTokenLimit,
        resolvedModelContextWindow: settings.modelContextWindow ?? 272000,
        resolvedModelAutoCompactTokenLimit:
          settings.modelAutoCompactTokenLimit ?? 244800,
        isActive: true,
      },
      anthropic: {
        ...defaultProviderSettings.anthropic,
        isActive: false,
      },
    };
  }),
  getMcpSettings: vi.fn().mockResolvedValue(defaultMcpSettings),
  saveMcpServer: vi.fn().mockImplementation(async (settings) => {
    if (settings.transport === "stdio") {
      return {
        ...defaultMcpSettings,
        servers: [
          {
            name: settings.name,
            enabled: settings.enabled,
            transport: "stdio",
            transportLabel: "STDIO",
            summary: [settings.command, ...settings.args].join(" "),
            command: settings.command,
            args: settings.args,
            env: settings.env,
          },
        ],
      };
    }

    return {
      ...defaultMcpSettings,
      servers: [
        {
          name: settings.name,
          enabled: settings.enabled,
          transport: settings.transport,
          transportLabel: settings.transport === "http" ? "流式 HTTP" : "SSE",
          summary: settings.url,
          url: settings.url,
          headers: settings.headers,
        },
      ],
    };
  }),
  removeMcpServer: vi.fn().mockResolvedValue({
    ...defaultMcpSettings,
    servers: [],
  }),
  toggleMcpServer: vi.fn().mockImplementation(async (settings) => ({
    ...defaultMcpSettings,
    servers: defaultMcpSettings.servers.map((server) =>
      server.name === settings.name
        ? {
            ...server,
            enabled: settings.enabled,
          }
        : server,
    ),
  })),
  openWorktree: vi.fn().mockResolvedValue(defaultSidebarState),
  pickAndOpenWorktree: vi.fn().mockResolvedValue(null),
  selectWorktree: vi.fn().mockResolvedValue(defaultSidebarState),
  removeWorktree: vi.fn().mockResolvedValue(defaultSidebarState),
  prepareSession: vi.fn().mockResolvedValue(defaultSidebarState),
  createSession: vi.fn().mockResolvedValue(defaultSidebarState),
  selectSession: vi.fn().mockResolvedValue(defaultSidebarState),
  removeSession: vi.fn().mockResolvedValue(defaultSidebarState),
  getGuiConversation: vi.fn().mockResolvedValue({
    sessionId: "session_test",
    messages: [],
    updatedAt: new Date().toISOString(),
  }),
  sendGuiConversationMessage: vi.fn().mockImplementation(async (input) => ({
    sessionId: input.sessionId,
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: "user_1",
        role: "user",
        text: input.prompt,
        createdAt: new Date().toISOString(),
        status: "completed",
        providerId: input.providerId,
        model: input.model,
        effort: input.effort,
      },
      {
        id: "assistant_1",
        role: "assistant",
        text: "测试响应",
        createdAt: new Date().toISOString(),
        status: "completed",
        providerId: input.providerId,
        model: input.model,
        effort: input.effort,
      },
    ],
  })),
  revealInFinder: vi.fn().mockResolvedValue(undefined),
  showItemInFolder: vi.fn().mockResolvedValue(undefined),
  createTerminalSession: vi.fn().mockResolvedValue({
    sessionId: "global-shell",
    cwd: "/tmp",
    shellPath: "/bin/zsh",
    created: true,
    alive: true,
  }),
  writeTerminal: vi.fn().mockResolvedValue(undefined),
  closeTerminal: vi.fn().mockResolvedValue(undefined),
  onTerminalData: vi.fn().mockImplementation(() => () => {}),
  onTerminalExit: vi.fn().mockImplementation(() => () => {}),
};

if (typeof window !== "undefined") {
  Object.defineProperty(window, "desktopApp", {
    writable: true,
    value: desktopBridgeMock,
  });

  beforeEach(() => {
    useUIStore.getState().reset();
    useWorktreeStore.getState().reset();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-pointer-cursor");
    document.documentElement.style.removeProperty("--ui-font-size");
    document.documentElement.style.removeProperty("--code-font-size");
    document.documentElement.style.removeProperty("--color-sidebar");
    document.documentElement.style.removeProperty("--color-bg");
    vi.mocked(window.desktopApp.getSidebarState).mockResolvedValue(defaultSidebarState);
    vi.mocked(window.desktopApp.getSkillsSnapshot).mockResolvedValue(
      defaultSkillsSnapshot,
    );
    vi.mocked(window.desktopApp.readSkillFile).mockResolvedValue({
      path: "/Users/test/.agents/skills/example/SKILL.md",
      kind: "markdown",
      size: 24,
      language: "markdown",
      content: "# Example\n\nBody",
    });
    vi.mocked(window.desktopApp.replaceSkill).mockResolvedValue({
      cancelled: false,
      snapshot: defaultSkillsSnapshot,
    });
    vi.mocked(window.desktopApp.downloadSkill).mockResolvedValue({
      cancelled: false,
      targetPath: "/Users/test/Downloads/example.zip",
    });
    vi.mocked(window.desktopApp.uninstallSkill).mockResolvedValue({
      cancelled: false,
      snapshot: defaultSkillsSnapshot,
    });
    vi.mocked(window.desktopApp.uploadSkill).mockResolvedValue({
      cancelled: false,
      snapshot: defaultSkillsSnapshot,
    });
    vi.mocked(window.desktopApp.getRemoteSkillCatalog).mockResolvedValue({
      skills: [],
      fetchedAt: "2026-04-06T00:00:00.000Z",
    });
    vi.mocked(window.desktopApp.installRemoteSkill).mockResolvedValue({
      cancelled: false,
      snapshot: defaultSkillsSnapshot,
    });
    vi.mocked(window.desktopApp.prepareVoiceDictation).mockResolvedValue({
      available: true,
      provider: "sherpa-onnx",
      modelId: "sherpa-onnx-paraformer-zh-small-2024-03-09",
      modelLabel: "Paraformer ZH Small",
      downloaded: true,
      message: null,
    });
    vi.mocked(window.desktopApp.transcribeVoiceDictation).mockResolvedValue({
      text: "帮我总结这个项目",
      modelLabel: "Paraformer ZH Small",
      sampleRate: 16000,
      sampleCount: 16000,
      durationMs: 180,
    });
    vi.mocked(window.desktopApp.openVoiceDictationModelsDirectory).mockResolvedValue(undefined);
    vi.mocked(window.desktopApp.onVoiceDictationProgress).mockImplementation(() => () => {});
    vi.mocked(window.desktopApp.getAppearanceSettings).mockResolvedValue(
      defaultAppearanceSettings,
    );
    vi.mocked(window.desktopApp.saveAppearanceSettings).mockImplementation(
      async (settings) => ({
        ...settings,
        storagePath: defaultAppearanceSettings.storagePath,
      }),
    );
    vi.mocked(window.desktopApp.getProviderSettings).mockResolvedValue(
      defaultProviderSettings,
    );
    vi.mocked(window.desktopApp.saveProviderSettings).mockImplementation(
      async (settings) => {
        if (settings.providerId === "anthropic") {
          return {
            ...defaultProviderSettings,
            activeProviderId: "anthropic",
            requestedProviderId: "anthropic",
            anthropic: {
              ...defaultProviderSettings.anthropic,
              isActive: true,
            },
            codex: {
              ...defaultProviderSettings.codex,
              isActive: false,
            },
          };
        }

        return {
          ...defaultProviderSettings,
          activeProviderId: "codex",
          requestedProviderId: "codex",
          codex: {
            ...defaultProviderSettings.codex,
            baseUrl: settings.baseUrl,
            defaultModel: settings.defaultModel,
            defaultVerbosity: settings.defaultVerbosity,
            defaultReasoningEffort: settings.defaultReasoningEffort,
            modelContextWindow: settings.modelContextWindow,
            modelAutoCompactTokenLimit: settings.modelAutoCompactTokenLimit,
            resolvedModelContextWindow: settings.modelContextWindow ?? 272000,
            resolvedModelAutoCompactTokenLimit:
              settings.modelAutoCompactTokenLimit ?? 244800,
            isActive: true,
          },
          anthropic: {
            ...defaultProviderSettings.anthropic,
            isActive: false,
          },
        };
      },
    );
    vi.mocked(window.desktopApp.getMcpSettings).mockResolvedValue(
      defaultMcpSettings,
    );
    vi.mocked(window.desktopApp.saveMcpServer).mockImplementation(
      async (settings) => {
        if (settings.transport === "stdio") {
          return {
            ...defaultMcpSettings,
            servers: [
              {
                name: settings.name,
                enabled: settings.enabled,
                transport: "stdio",
                transportLabel: "STDIO",
                summary: [settings.command, ...settings.args].join(" "),
                command: settings.command,
                args: settings.args,
                env: settings.env,
              },
            ],
          };
        }

        return {
          ...defaultMcpSettings,
          servers: [
            {
              name: settings.name,
              enabled: settings.enabled,
              transport: settings.transport,
              transportLabel: settings.transport === "http" ? "流式 HTTP" : "SSE",
              summary: settings.url,
              url: settings.url,
              headers: settings.headers,
            },
          ],
        };
      },
    );
    vi.mocked(window.desktopApp.removeMcpServer).mockResolvedValue({
      ...defaultMcpSettings,
      servers: [],
    });
    vi.mocked(window.desktopApp.toggleMcpServer).mockImplementation(
      async (settings) => ({
        ...defaultMcpSettings,
        servers: defaultMcpSettings.servers.map((server) =>
          server.name === settings.name
            ? {
                ...server,
                enabled: settings.enabled,
              }
            : server,
        ),
      }),
    );
    vi.mocked(window.desktopApp.openWorktree).mockResolvedValue(defaultSidebarState);
    vi.mocked(window.desktopApp.pickAndOpenWorktree).mockResolvedValue(null);
    vi.mocked(window.desktopApp.selectWorktree).mockResolvedValue(defaultSidebarState);
    vi.mocked(window.desktopApp.removeWorktree).mockResolvedValue(defaultSidebarState);
    vi.mocked(window.desktopApp.prepareSession).mockResolvedValue(defaultSidebarState);
    vi.mocked(window.desktopApp.createSession).mockResolvedValue(defaultSidebarState);
    vi.mocked(window.desktopApp.selectSession).mockResolvedValue(defaultSidebarState);
    vi.mocked(window.desktopApp.removeSession).mockResolvedValue(defaultSidebarState);
    vi.mocked(window.desktopApp.showItemInFolder).mockResolvedValue(undefined);
    AudioContextMock.reset();
  });
}
