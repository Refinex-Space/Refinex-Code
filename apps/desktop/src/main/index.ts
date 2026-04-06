import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import type {
  AppInfo,
  AppearanceSettingsData,
  AppearanceSettingsSnapshot,
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
  TerminalSessionInfo,
  VoiceDictationProgressPayload,
  VoiceDictationTranscriptionInput,
  VoiceDictationTranscriptionResult,
} from "../shared/contracts";
import { createAppearanceSettingsStore } from "./appearance-settings-store";
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
import { createWorktreeStateStore } from "./worktree-state-store";

interface TerminalSession {
  id: string;
  cwd: string;
  shellPath: string;
  process: ChildProcessWithoutNullStreams;
}

const terminalSessions = new Map<string, TerminalSession>();
const appName = "RWork";

let mainWindow: BrowserWindow | null = null;
let worktreeStateStore: ReturnType<typeof createWorktreeStateStore> | null = null;
let appearanceSettingsStore: ReturnType<typeof createAppearanceSettingsStore> | null = null;
let providerSettingsStore: ReturnType<typeof createProviderSettingsStore> | null = null;
let mcpSettingsStore: ReturnType<typeof createMcpSettingsStore> | null = null;

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

function resolveDefaultWorkspacePath(): string | null {
  const candidate = process.env.REFINEX_DESKTOP_DEFAULT_WORKSPACE;
  return candidate && isDirectory(candidate) ? candidate : null;
}

function emitToRenderer(
  channel: "terminal:data" | "terminal:exit" | "voice-dictation:progress",
  payload: TerminalDataPayload | TerminalExitPayload | VoiceDictationProgressPayload,
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
): TerminalSessionInfo {
  return {
    sessionId,
    cwd,
    shellPath,
    created,
    alive: true,
  };
}

function closeTerminalSession(sessionId: string) {
  const session = terminalSessions.get(sessionId);
  if (!session) {
    return;
  }

  session.process.kill("SIGTERM");
  terminalSessions.delete(sessionId);
}

function closeAllTerminalSessions() {
  for (const sessionId of terminalSessions.keys()) {
    closeTerminalSession(sessionId);
  }
}

function spawnShellProcess(shellPath: string, cwd: string) {
  if (process.platform === "darwin") {
    return spawn("script", ["-q", "/dev/null", shellPath, "-i"], {
      cwd,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
      },
    });
  }

  return spawn(shellPath, ["-i"], {
    cwd,
    env: {
      ...process.env,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
    },
  });
}

function createTerminalSession({ sessionId, cwd }: TerminalCreateInput) {
  const existing = terminalSessions.get(sessionId);
  if (existing) {
    return toTerminalSessionInfo(sessionId, existing.cwd, existing.shellPath, false);
  }

  const resolvedCwd = resolveTerminalPath(cwd);
  const shellPath = process.env.SHELL ?? "/bin/zsh";
  const child = spawnShellProcess(shellPath, resolvedCwd);

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  child.stdout.on("data", (chunk: string) => {
    emitToRenderer("terminal:data", {
      sessionId,
      chunk,
    });
  });

  child.stderr.on("data", (chunk: string) => {
    emitToRenderer("terminal:data", {
      sessionId,
      chunk,
    });
  });

  child.once("error", (error) => {
    emitToRenderer("terminal:data", {
      sessionId,
      chunk: `\r\n[terminal bootstrap failed] ${error.message}\r\n`,
    });
  });

  child.once("close", (exitCode) => {
    terminalSessions.delete(sessionId);
    emitToRenderer("terminal:exit", {
      sessionId,
      exitCode,
    });
  });

  terminalSessions.set(sessionId, {
    id: sessionId,
    cwd: resolvedCwd,
    shellPath,
    process: child,
  });

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
      return getWorktreeStateStore().removeSession(payload.worktreeId, payload.sessionId);
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
      return;
    }

    session.process.stdin.write(payload.data);
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
