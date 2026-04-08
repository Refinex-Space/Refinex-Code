import { appendFileSync, chmodSync, existsSync, statSync } from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { spawn as spawnPty, type IPty } from "node-pty";
import type {
  AppInfo,
  AppearanceSettingsData,
  AppearanceSettingsSnapshot,
  DesktopGuiConversationSendInput,
  DesktopGuiConversationSnapshot,
  DesktopMcpServerSaveInput,
  DesktopMcpServerToggleInput,
  DesktopMcpSettingsSnapshot,
  DesktopProviderSettingsSaveInput,
  DesktopProviderSettingsSnapshot,
  SessionCreateInput,
  RemoteSkillCatalog,
  SkillDownloadResult,
  SkillFilePreview,
  SkillMutationResult,
  SkillRecord,
  SkillSnapshot,
  SkillUploadResult,
  SidebarStateSnapshot,
  TerminalCreateInput,
  TerminalDataPayload,
  TerminalExitPayload,
  TerminalSessionProfile,
  TerminalSessionInfo,
  VoiceDictationProgressPayload,
  VoiceDictationTranscriptionInput,
  VoiceDictationTranscriptionResult,
} from "../shared/contracts";
import { createAppearanceSettingsStore } from "./appearance-settings-store";
import { createGuiConversationStore } from "./gui-conversation-store";
import { createMcpSettingsStore } from "./mcp-settings-store";
import { createProviderSettingsStore } from "./provider-settings-store";
import {
  loadDesktopSkillSnapshot,
  readSkillFilePreview,
  getDefaultPersonalSkillRoots,
} from "./skills-snapshot";
import { getRemoteSkillCatalog, installRemoteSkill } from "./remote-skills";
import {
  createSkillArchive,
  getSkillDirectoryName,
  inspectUploadedSkillArchive,
  installSkillFromArchive,
  replaceSkillFromArchive,
  uninstallSkillDirectory,
} from "./skills-actions";
import {
  getVoiceDictationModelsRoot,
  prepareVoiceDictation,
  transcribeVoiceDictation,
} from "./voice-dictation";
import { getThreadTuiEnvOverrides } from "./thread-tui-env";
import { createWorktreeStateStore } from "./worktree-state-store";

interface TerminalSession {
  id: string;
  cwd: string;
  shellPath: string;
  profile: TerminalSessionProfile;
  process: IPty;
  backlog: string;
}

const terminalSessions = new Map<string, TerminalSession>();
const appName = "RWork";
const require = createRequire(import.meta.url);
const TERMINAL_BACKLOG_LIMIT = 512_000;
const GUI_CONVERSATION_TIMEOUT_MS = 60_000;
const desktopTerminalDebugTarget = process.env.REFINEX_DESKTOP_TERMINAL_DEBUG;

let mainWindow: BrowserWindow | null = null;
let worktreeStateStore: ReturnType<typeof createWorktreeStateStore> | null = null;
let appearanceSettingsStore: ReturnType<typeof createAppearanceSettingsStore> | null = null;
let providerSettingsStore: ReturnType<typeof createProviderSettingsStore> | null = null;
let mcpSettingsStore: ReturnType<typeof createMcpSettingsStore> | null = null;
let guiConversationStore: ReturnType<typeof createGuiConversationStore> | null = null;

function writeDesktopTerminalDebug(scope: string, message: string) {
  if (!desktopTerminalDebugTarget) {
    return;
  }

  const outputPath =
    desktopTerminalDebugTarget === "1"
      ? "/tmp/refinex-desktop-terminal-debug.log"
      : desktopTerminalDebugTarget;

  try {
    appendFileSync(
      outputPath,
      `[desktop-main ${new Date().toISOString()} pid=${process.pid} ${scope}] ${message}\n`,
    );
  } catch {
    // 调试日志失败时不能影响终端会话生命周期。
  }
}

function resolveAppIconPath() {
  const candidates = [
    join(__dirname, "../../resources/icons/icon.png"),
    join(process.resourcesPath, "icons/icon.png"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function resolvePreloadEntryPath() {
  const candidates = [
    join(__dirname, "../preload/index.mjs"),
    join(__dirname, "../preload/index.js"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

function isDirectory(pathname: string | null | undefined) {
  if (!pathname) {
    return false;
  }

  try {
    return existsSync(pathname) && statSync(pathname).isDirectory();
  } catch {
    return false;
  }
}

function resolveTerminalPath(pathname: string | null | undefined): string {
  return pathname && isDirectory(pathname) ? pathname : app.getPath("home");
}

function resolveDesktopRepoRoot(): string | null {
  const candidates = [
    join(__dirname, "../../../.."),
    join(__dirname, "../../../../../"),
    process.cwd(),
  ];

  return (
    candidates.find((candidate) => existsSync(join(candidate, "bin/rcode"))) ??
    null
  );
}

function resolveNodePtySpawnHelperPath() {
  if (process.platform === "win32") {
    return null;
  }

  try {
    const packageRoot = dirname(require.resolve("node-pty/package.json"));
    const helperPath = join(
      packageRoot,
      `prebuilds/${process.platform}-${process.arch}/spawn-helper`,
    )
      .replace("app.asar", "app.asar.unpacked")
      .replace("node_modules.asar", "node_modules.asar.unpacked");

    return existsSync(helperPath) ? helperPath : null;
  } catch {
    return null;
  }
}

function ensureNodePtySpawnHelperExecutable() {
  const helperPath = resolveNodePtySpawnHelperPath();
  if (!helperPath) {
    return;
  }

  try {
    const mode = statSync(helperPath).mode;
    if ((mode & 0o111) !== 0) {
      return;
    }

    // node-pty 的 spawn-helper 如果丢失执行位，forkpty 会直接报 posix_spawnp failed。
    chmodSync(helperPath, 0o755);
  } catch (error) {
    console.warn(
      `[terminal] failed to prepare node-pty spawn-helper: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function resolveThreadTuiLaunchSpec() {
  const repoRoot = resolveDesktopRepoRoot();
  if (!repoRoot) {
    return {
      command: "bun",
      args: ["run", "dev"],
    };
  }

  const launcherPath = join(repoRoot, "bin/rcode");
  if (existsSync(launcherPath)) {
    return {
      command: launcherPath,
      args: [] as string[],
    };
  }

  const entryPath = join(repoRoot, "src/dev-entry.ts");
  if (existsSync(entryPath)) {
    return {
      command: "bun",
      args: [entryPath],
    };
  }

  return {
    command: "bun",
    args: ["run", "dev"],
  };
}

function resolveDesktopCliLaunchSpec() {
  const repoRoot = resolveDesktopRepoRoot();
  if (!repoRoot) {
    return {
      command: "bun",
      args: ["run", "dev"],
    };
  }

  const launcherPath = join(repoRoot, "bin/rcode");
  if (existsSync(launcherPath)) {
    return {
      command: launcherPath,
      args: [] as string[],
    };
  }

  const entryPath = join(repoRoot, "src/dev-entry.ts");
  if (existsSync(entryPath)) {
    return {
      command: "bun",
      args: [entryPath],
    };
  }

  return {
    command: "bun",
    args: ["run", "dev"],
  };
}

function resolveDefaultWorkspacePath(): string | null {
  const candidate = process.env.REFINEX_DESKTOP_DEFAULT_WORKSPACE;
  return candidate && isDirectory(candidate) ? candidate : null;
}

function emitToRenderer(
  channel:
    | "terminal:data"
    | "terminal:exit"
    | "voice-dictation:progress",
  payload:
    | TerminalDataPayload
    | TerminalExitPayload
    | VoiceDictationProgressPayload,
) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(channel, payload);
}

function toTerminalSessionInfo(
  sessionId: string,
  cwd: string,
  shellPath: string,
  created: boolean,
  backlog?: string,
): TerminalSessionInfo {
  return {
    sessionId,
    cwd,
    shellPath,
    created,
    alive: true,
    backlog,
  };
}

function closeTerminalSession(sessionId: string) {
  const session = terminalSessions.get(sessionId);
  if (!session) {
    return;
  }

  session.process.kill();
  terminalSessions.delete(sessionId);
}

function closeAllTerminalSessions() {
  for (const sessionId of terminalSessions.keys()) {
    closeTerminalSession(sessionId);
  }
}

function emitTerminalChunk(sessionId: string, chunk: string) {
  emitToRenderer("terminal:data", {
    sessionId,
    chunk,
  });
}

function appendTerminalBacklog(session: TerminalSession, chunk: string) {
  const nextBacklog = session.backlog + chunk;
  session.backlog =
    nextBacklog.length > TERMINAL_BACKLOG_LIMIT
      ? nextBacklog.slice(-TERMINAL_BACKLOG_LIMIT)
      : nextBacklog;
}

function createPtySession(
  sessionId: string,
  command: string,
  args: string[],
  cwd: string,
  envOverrides: Record<string, string> = {},
  onChunk?: (chunk: string) => void,
) {
  ensureNodePtySpawnHelperExecutable();
  writeDesktopTerminalDebug(
    "create-pty",
    `session=${sessionId} command=${command} args=${JSON.stringify(args)} cwd=${cwd}`,
  );

  const ptyProcess = spawnPty(command, args, {
    name: "xterm-256color",
    cols: 120,
    rows: 40,
    cwd,
    env: {
      ...process.env,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      TERM_PROGRAM: appName,
      ...envOverrides,
    },
  });

  ptyProcess.onData((chunk) => {
    writeDesktopTerminalDebug(
      "pty-data",
      `session=${sessionId} bytes=${chunk.length} preview=${JSON.stringify(chunk.slice(0, 160))}`,
    );
    onChunk?.(chunk);
    emitTerminalChunk(sessionId, chunk);
  });

  ptyProcess.onExit(({ exitCode }) => {
    writeDesktopTerminalDebug(
      "pty-exit",
      `session=${sessionId} exitCode=${exitCode}`,
    );
    terminalSessions.delete(sessionId);
    emitToRenderer("terminal:exit", {
      sessionId,
      exitCode,
    });
  });

  return ptyProcess;
}

function createTerminalSession({
  sessionId,
  cwd,
  profile = "shell",
}: TerminalCreateInput) {
  writeDesktopTerminalDebug(
    "create-session",
    `session=${sessionId} profile=${profile} cwd=${cwd ?? ""}`,
  );
  const existing = terminalSessions.get(sessionId);
  if (existing) {
    writeDesktopTerminalDebug(
      "create-session",
      `session=${sessionId} reused backlog=${existing.backlog.length}`,
    );
    return toTerminalSessionInfo(
      sessionId,
      existing.cwd,
      existing.shellPath,
      false,
      existing.backlog,
    );
  }

  const resolvedCwd = resolveTerminalPath(cwd);
  const shellPath = process.env.SHELL ?? "/bin/zsh";
  if (profile === "thread-tui") {
    const launchSpec = resolveThreadTuiLaunchSpec();
    const session: TerminalSession = {
      id: sessionId,
      cwd: resolvedCwd,
      shellPath: launchSpec.command,
      profile,
      process: null as unknown as IPty,
      backlog: "",
    };
    const ptyProcess = createPtySession(
      sessionId,
      launchSpec.command,
      launchSpec.args,
      resolvedCwd,
      getThreadTuiEnvOverrides(),
      (chunk) => {
        appendTerminalBacklog(session, chunk);
      },
    );
    session.process = ptyProcess;

    terminalSessions.set(sessionId, session);

    return toTerminalSessionInfo(sessionId, resolvedCwd, launchSpec.command, true);
  }

  const session: TerminalSession = {
    id: sessionId,
    cwd: resolvedCwd,
    shellPath,
    profile,
    process: null as unknown as IPty,
    backlog: "",
  };
  const ptyProcess = createPtySession(
    sessionId,
    shellPath,
    ["-i"],
    resolvedCwd,
    {},
    (chunk) => {
      appendTerminalBacklog(session, chunk);
    },
  );
  session.process = ptyProcess;

  terminalSessions.set(sessionId, session);

  return toTerminalSessionInfo(sessionId, resolvedCwd, shellPath, true);
}

function buildAppInfo(): AppInfo {
  return {
    appName,
    appVersion: app.getVersion(),
    platform: process.platform,
    defaultWorkspacePath: resolveDefaultWorkspacePath(),
  };
}

function getWorktreeStateStore() {
  worktreeStateStore ??= createWorktreeStateStore({
    userDataPath: app.getPath("userData"),
    appName,
  });

  return worktreeStateStore;
}

function getAppearanceSettingsStore() {
  appearanceSettingsStore ??= createAppearanceSettingsStore({
    userDataPath: app.getPath("userData"),
  });

  return appearanceSettingsStore;
}

function getProviderSettingsStore() {
  providerSettingsStore ??= createProviderSettingsStore();

  return providerSettingsStore;
}

function getMcpSettingsStore() {
  mcpSettingsStore ??= createMcpSettingsStore();

  return mcpSettingsStore;
}

function getGuiConversationStore() {
  guiConversationStore ??= createGuiConversationStore({
    userDataPath: app.getPath("userData"),
    runConversation: async ({
      cliSessionId,
      resume,
      worktreePath,
      prompt,
      providerId,
      model,
      effort,
    }) => {
      const launchSpec = resolveDesktopCliLaunchSpec();
      const settingsOverride = JSON.stringify({
        modelProvider: providerId,
        model,
        effortLevel: effort,
      });
      const args = [
        ...launchSpec.args,
        "-p",
        "--bare",
        "--output-format",
        "json",
        "--max-turns",
        "1",
        "--tools",
        "",
        "--settings",
        settingsOverride,
        ...(resume
          ? ["--resume", cliSessionId]
          : ["--session-id", cliSessionId]),
        prompt,
      ];
      const childEnv: NodeJS.ProcessEnv = {
        ...process.env,
        FORCE_COLOR: "0",
        NO_COLOR: "1",
        NODE_ENV: "production",
      };
      delete childEnv.DEV;

      return await new Promise((resolve, reject) => {
        let settled = false;
        const settleOnce = (
          callback: () => void,
        ) => {
          if (settled) {
            return;
          }

          settled = true;
          clearTimeout(timeoutTimer);
          callback();
        };
        const child = spawn(launchSpec.command, args, {
          cwd: resolveTerminalPath(worktreePath),
          env: childEnv,
          stdio: ["ignore", "pipe", "pipe"],
        });
        const timeoutTimer = setTimeout(() => {
          child.kill("SIGTERM");
          setTimeout(() => {
            if (!child.killed) {
              child.kill("SIGKILL");
            }
          }, 2_000);
          settleOnce(() => {
            reject(new Error("GUI 对话请求超时，请稍后重试。"));
          });
        }, GUI_CONVERSATION_TIMEOUT_MS);

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (chunk) => {
          stdout += chunk.toString();
        });
        child.stderr.on("data", (chunk) => {
          stderr += chunk.toString();
        });
        child.on("error", (error) => {
          settleOnce(() => {
            reject(error);
          });
        });
        child.on("close", (exitCode) => {
          settleOnce(() => {
            const trimmedStdout = stdout.trim();
            const trimmedStderr = stderr.trim();

            if (!trimmedStdout) {
              reject(
                new Error(
                  trimmedStderr || `GUI 对话进程未返回结果（exit ${String(exitCode)}）。`,
                ),
              );
              return;
            }

            try {
              const payload = JSON.parse(trimmedStdout) as {
                result?: string;
                errors?: string[];
                is_error?: boolean;
              };
              const errors = payload.errors?.filter(Boolean) ?? [];
              const outputText =
                payload.result?.trim() ||
                errors.join("\n") ||
                trimmedStderr ||
                "模型没有返回可展示的内容。";
              resolve({
                outputText,
                isError: Boolean(payload.is_error),
              });
            } catch (error) {
              reject(
                new Error(
                  trimmedStderr ||
                    (error instanceof Error
                      ? error.message
                      : "GUI 对话结果解析失败。"),
                ),
              );
            }
          });
        });
      });
    },
  });

  return guiConversationStore;
}

async function loadCurrentSkillSnapshot() {
  const activeWorktree = getWorktreeStateStore().getActiveWorktreePath();
  return loadDesktopSkillSnapshot(activeWorktree);
}

async function requireSkillRecord(skillRoot: string): Promise<SkillRecord> {
  const snapshot = await loadCurrentSkillSnapshot();
  const skill = snapshot.skills.find((candidate) => candidate.skillRoot === skillRoot);
  if (!skill) {
    throw new Error("未找到目标 Skill，列表可能已过期，请刷新后重试。");
  }

  return skill;
}

function getPreferredPersonalSkillRoot() {
  return getDefaultPersonalSkillRoots()[0] ?? join(app.getPath("home"), ".agents", "skills");
}

function registerIpcHandlers() {
  ipcMain.handle("app:info", () => buildAppInfo());
  ipcMain.handle("appearance-settings:get", (): AppearanceSettingsSnapshot => {
    return getAppearanceSettingsStore().getSnapshot();
  });
  ipcMain.handle(
    "appearance-settings:save",
    (_event, settings: AppearanceSettingsData): AppearanceSettingsSnapshot => {
      return getAppearanceSettingsStore().save(settings);
    },
  );
  ipcMain.handle("provider-settings:get", (): DesktopProviderSettingsSnapshot => {
    return getProviderSettingsStore().getSnapshot();
  });
  ipcMain.handle(
    "provider-settings:save",
    (_event, settings: DesktopProviderSettingsSaveInput): DesktopProviderSettingsSnapshot => {
      return getProviderSettingsStore().save(settings).snapshot;
    },
  );
  ipcMain.handle("mcp-settings:get", (): DesktopMcpSettingsSnapshot => {
    return getMcpSettingsStore().getSnapshot();
  });
  ipcMain.handle(
    "mcp-settings:save",
    (_event, settings: DesktopMcpServerSaveInput): DesktopMcpSettingsSnapshot => {
      return getMcpSettingsStore().save(settings);
    },
  );
  ipcMain.handle("mcp-settings:remove", (_event, name: string): DesktopMcpSettingsSnapshot => {
    return getMcpSettingsStore().remove(name);
  });
  ipcMain.handle(
    "mcp-settings:toggle",
    (_event, settings: DesktopMcpServerToggleInput): DesktopMcpSettingsSnapshot => {
      return getMcpSettingsStore().toggle(settings);
    },
  );

  ipcMain.handle("sidebar:get-state", (): SidebarStateSnapshot => {
    return getWorktreeStateStore().getSnapshot();
  });
  ipcMain.handle("skills:get-snapshot", async (): Promise<SkillSnapshot> => {
    return loadCurrentSkillSnapshot();
  });
  ipcMain.handle(
    "skills:read-file",
    async (_event, path: string): Promise<SkillFilePreview> => {
      return readSkillFilePreview(path);
    },
  );
  ipcMain.handle(
    "skills:replace",
    async (_event, skillRoot: string): Promise<SkillMutationResult> => {
      if (!mainWindow) {
        throw new Error("主窗口不可用。");
      }

      const skill = await requireSkillRecord(skillRoot);
      const skillDirectoryName = getSkillDirectoryName(skill.skillRoot);
      const result = await dialog.showOpenDialog(mainWindow, {
        title: `替换 ${skill.displayName}`,
        properties: ["openFile"],
        filters: [
          {
            name: "ZIP archive",
            extensions: ["zip"],
          },
        ],
      });

      if (result.canceled || !result.filePaths[0]) {
        return {
          cancelled: true,
          snapshot: null,
        };
      }

      await replaceSkillFromArchive(skill.skillRoot, result.filePaths[0]);
      return {
        cancelled: false,
        snapshot: await loadCurrentSkillSnapshot(),
      };
    },
  );
  ipcMain.handle(
    "skills:download",
    async (_event, skillRoot: string): Promise<SkillDownloadResult> => {
      if (!mainWindow) {
        throw new Error("主窗口不可用。");
      }

      const skill = await requireSkillRecord(skillRoot);
      const skillDirectoryName = getSkillDirectoryName(skill.skillRoot);
      const result = await dialog.showSaveDialog(mainWindow, {
        title: `下载 ${skill.displayName}`,
        defaultPath: join(app.getPath("downloads"), `${skillDirectoryName}.zip`),
        filters: [
          {
            name: "ZIP archive",
            extensions: ["zip"],
          },
        ],
      });

      if (result.canceled || !result.filePath) {
        return {
          cancelled: true,
          targetPath: null,
        };
      }

      await createSkillArchive(skill.skillRoot, result.filePath);
      return {
        cancelled: false,
        targetPath: result.filePath,
      };
    },
  );
  ipcMain.handle(
    "skills:uninstall",
    async (_event, skillRoot: string): Promise<SkillMutationResult> => {
      if (!mainWindow) {
        throw new Error("主窗口不可用。");
      }

      const skill = await requireSkillRecord(skillRoot);
      const confirmation = await dialog.showMessageBox(mainWindow, {
        type: "warning",
        buttons: ["取消", "卸载"],
        defaultId: 0,
        cancelId: 0,
        title: `卸载 ${skill.displayName}`,
        message: `确认卸载 ${skill.displayName} 吗？`,
        detail: `该操作会从 ${skill.sourceLabel} 的磁盘位置永久移除 ${getSkillDirectoryName(skill.skillRoot)}。`,
      });

      if (confirmation.response !== 1) {
        return {
          cancelled: true,
          snapshot: null,
        };
      }

      await uninstallSkillDirectory(skill.skillRoot);
      return {
        cancelled: false,
        snapshot: await loadCurrentSkillSnapshot(),
      };
    },
  );
  ipcMain.handle(
    "skills:upload",
    async (): Promise<SkillUploadResult> => {
      if (!mainWindow) {
        throw new Error("主窗口不可用。");
      }

      const result = await dialog.showOpenDialog(mainWindow, {
        title: "上传 Skill",
        properties: ["openFile"],
        filters: [
          {
            name: "ZIP archive",
            extensions: ["zip"],
          },
        ],
      });

      if (result.canceled || !result.filePaths[0]) {
        return {
          cancelled: true,
          snapshot: null,
        };
      }

      const { skillDirectoryName } = await inspectUploadedSkillArchive(result.filePaths[0]);
      const existingSnapshot = await loadCurrentSkillSnapshot();
      const existingSkill = existingSnapshot.skills.find(
        (skill) =>
          skill.sourceKind === "personal" &&
          getSkillDirectoryName(skill.skillRoot) === skillDirectoryName,
      );
      const destinationRoot = existingSkill
        ? dirname(existingSkill.skillRoot)
        : getPreferredPersonalSkillRoot();

      let overwrite = false;
      if (existingSkill) {
        const confirmation = await dialog.showMessageBox(mainWindow, {
          type: "warning",
          buttons: ["取消", "覆盖"],
          defaultId: 0,
          cancelId: 0,
          title: `覆盖 ${skillDirectoryName}`,
          message: `已存在同名 Skill：${skillDirectoryName}`,
          detail: "继续后会使用上传的压缩包覆盖现有 Skill。",
        });

        if (confirmation.response !== 1) {
          return {
            cancelled: true,
            snapshot: null,
          };
        }

        overwrite = true;
      }

      await installSkillFromArchive(destinationRoot, result.filePaths[0], overwrite);

      return {
        cancelled: false,
        snapshot: await loadCurrentSkillSnapshot(),
      };
    },
  );
  ipcMain.handle(
    "skills:get-remote-catalog",
    async (): Promise<RemoteSkillCatalog> => {
      return getRemoteSkillCatalog();
    },
  );
  ipcMain.handle(
    "skills:install-remote",
    async (_event, skillId: string): Promise<SkillMutationResult> => {
      if (!mainWindow) {
        throw new Error("主窗口不可用。");
      }

      const existingSnapshot = await loadCurrentSkillSnapshot();
      const existingSkill = existingSnapshot.skills.find(
        (skill) =>
          skill.sourceKind === "personal" &&
          getSkillDirectoryName(skill.skillRoot) === skillId,
      );
      const destinationRoot = existingSkill
        ? dirname(existingSkill.skillRoot)
        : getPreferredPersonalSkillRoot();

      let overwrite = false;
      if (existingSkill) {
        const confirmation = await dialog.showMessageBox(mainWindow, {
          type: "warning",
          buttons: ["取消", "覆盖"],
          defaultId: 0,
          cancelId: 0,
          title: `覆盖 ${skillId}`,
          message: `已存在同名 Skill：${skillId}`,
          detail: "继续后会从 GitHub 下载并覆盖现有 Skill。",
        });

        if (confirmation.response !== 1) {
          return {
            cancelled: true,
            snapshot: null,
          };
        }

        overwrite = true;
      }

      await installRemoteSkill(skillId, destinationRoot, overwrite);

      return {
        cancelled: false,
        snapshot: await loadCurrentSkillSnapshot(),
      };
    },
  );
  ipcMain.handle("voice-dictation:prepare", async () => {
    try {
      return await prepareVoiceDictation(app.getPath("userData"), (payload) => {
        emitToRenderer("voice-dictation:progress", payload);
      });
    } catch (error) {
      emitToRenderer("voice-dictation:progress", {
        stage: "error",
        message: error instanceof Error ? error.message : "准备离线语音模型失败。",
        percent: null,
      });
      throw error;
    }
  });
  ipcMain.handle(
    "voice-dictation:transcribe",
    async (
      _event,
      input: VoiceDictationTranscriptionInput,
    ): Promise<VoiceDictationTranscriptionResult> => {
      try {
        return await transcribeVoiceDictation(app.getPath("userData"), input, (payload) => {
          emitToRenderer("voice-dictation:progress", payload);
        });
      } catch (error) {
        emitToRenderer("voice-dictation:progress", {
          stage: "error",
          message: error instanceof Error ? error.message : "离线语音转写失败。",
          percent: null,
        });
        throw error;
      }
    },
  );
  ipcMain.handle("voice-dictation:open-models-directory", async () => {
    const modelsDirectory = getVoiceDictationModelsRoot(app.getPath("userData"));
    if (!existsSync(modelsDirectory)) {
      await dialog.showMessageBox({
        type: "info",
        buttons: ["知道了"],
        defaultId: 0,
        message: "模型目录尚未创建",
        detail: modelsDirectory,
      });
      return;
    }
    const error = await shell.openPath(modelsDirectory);
    if (error) {
      throw new Error(error);
    }
  });

  ipcMain.handle("sidebar:open-worktree", (_event, projectPath: string): SidebarStateSnapshot => {
    return getWorktreeStateStore().openWorktree(projectPath);
  });

  ipcMain.handle("sidebar:pick-and-open-worktree", async (): Promise<SidebarStateSnapshot | null> => {
    if (!mainWindow) {
      return null;
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory", "createDirectory"],
    });

    if (result.canceled || !result.filePaths[0]) {
      return null;
    }

    return getWorktreeStateStore().openWorktree(result.filePaths[0]);
  });

  ipcMain.handle("sidebar:select-worktree", (_event, worktreeId: string): SidebarStateSnapshot => {
    return getWorktreeStateStore().selectWorktree(worktreeId);
  });

  ipcMain.handle("sidebar:remove-worktree", (_event, worktreeId: string): SidebarStateSnapshot => {
    const snapshot = getWorktreeStateStore().getSnapshot();
    const worktree = snapshot.worktrees.find((entry) => entry.id === worktreeId) ?? null;
    if (worktree) {
      for (const session of worktree.sessions) {
        getGuiConversationStore().deleteConversation(session.id);
      }
    }
    return getWorktreeStateStore().removeWorktree(worktreeId);
  });

  ipcMain.handle("sidebar:prepare-session", (_event, worktreeId: string): SidebarStateSnapshot => {
    return getWorktreeStateStore().prepareSession(worktreeId);
  });

  ipcMain.handle("sidebar:create-session", (_event, input: SessionCreateInput): SidebarStateSnapshot => {
    return getWorktreeStateStore().createSession(input.worktreeId, input.title ?? null);
  });

  ipcMain.handle(
    "sidebar:select-session",
    (_event, payload: { worktreeId: string; sessionId: string }): SidebarStateSnapshot => {
      return getWorktreeStateStore().selectSession(payload.worktreeId, payload.sessionId);
    },
  );

  ipcMain.handle(
    "sidebar:remove-session",
    (_event, payload: { worktreeId: string; sessionId: string }): SidebarStateSnapshot => {
      getGuiConversationStore().deleteConversation(payload.sessionId);
      return getWorktreeStateStore().removeSession(payload.worktreeId, payload.sessionId);
    },
  );
  ipcMain.handle(
    "gui-conversation:get",
    (_event, sessionId: string): DesktopGuiConversationSnapshot => {
      return getGuiConversationStore().getSnapshot(sessionId);
    },
  );
  ipcMain.handle(
    "gui-conversation:send",
    async (_event, input: DesktopGuiConversationSendInput): Promise<DesktopGuiConversationSnapshot> => {
      return await getGuiConversationStore().submitMessage(input);
    },
  );

  ipcMain.handle("workspace:reveal", async (_event, workspacePath: string) => {
    const error = await shell.openPath(workspacePath);
    if (error) {
      throw new Error(error);
    }
  });
  ipcMain.handle("finder:show-item", async (_event, targetPath: string) => {
    if (!targetPath.trim()) {
      throw new Error("Target path is required.");
    }

    if (existsSync(targetPath)) {
      shell.showItemInFolder(targetPath);
      return;
    }

    const parentDirectory = dirname(targetPath);
    const error = await shell.openPath(parentDirectory);
    if (error) {
      throw new Error(error);
    }
  });

  ipcMain.handle("terminal:create", (_event, input: TerminalCreateInput) => {
    return createTerminalSession(input);
  });

  ipcMain.handle("terminal:write", (_event, payload: { sessionId: string; data: string }) => {
    const session = terminalSessions.get(payload.sessionId);
    if (!session) {
      writeDesktopTerminalDebug(
        "terminal-write",
        `session=${payload.sessionId} dropped bytes=${payload.data.length}`,
      );
      return;
    }

    writeDesktopTerminalDebug(
      "terminal-write",
      `session=${payload.sessionId} bytes=${payload.data.length} preview=${JSON.stringify(payload.data.slice(0, 160))}`,
    );
    session.process.write(payload.data);
  });

  ipcMain.handle("terminal:close", (_event, sessionId: string) => {
    closeTerminalSession(sessionId);
  });
}

async function createMainWindow() {
  const iconPath = resolveAppIconPath();
  const preloadPath = resolvePreloadEntryPath();
  mainWindow = new BrowserWindow({
    title: appName,
    width: 1480,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: "#0b1018",
    icon: iconPath ?? undefined,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: process.platform === "darwin" ? { x: 18, y: 16 } : undefined,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.setName(appName);

app.whenReady().then(async () => {
  const iconPath = resolveAppIconPath();
  if (process.platform === "darwin" && iconPath) {
    app.dock?.setIcon(iconPath);
  }

  registerIpcHandlers();
  await createMainWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  closeAllTerminalSessions();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  closeAllTerminalSessions();
});
