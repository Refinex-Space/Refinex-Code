import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import type {
  AppInfo,
  TerminalCreateInput,
  TerminalDataPayload,
  TerminalExitPayload,
  TerminalSessionInfo,
} from "../shared/contracts";

interface TerminalSession {
  id: string;
  cwd: string;
  shellPath: string;
  process: ChildProcessWithoutNullStreams;
}

const terminalSessions = new Map<string, TerminalSession>();
const appName = "RWork";

let mainWindow: BrowserWindow | null = null;

function resolveAppIconPath() {
  const candidates = [
    join(__dirname, "../../resources/icons/icon.png"),
    join(process.resourcesPath, "icons/icon.png"),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
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

function resolveWorkspacePath(pathname: string | null | undefined): string {
  return pathname && isDirectory(pathname) ? pathname : app.getPath("home");
}

function resolveDefaultWorkspacePath(): string | null {
  const candidate = process.env.REFINEX_DESKTOP_DEFAULT_WORKSPACE;
  return candidate && isDirectory(candidate) ? candidate : null;
}

function emitToRenderer(channel: "terminal:data" | "terminal:exit", payload: TerminalDataPayload | TerminalExitPayload) {
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

  const resolvedCwd = resolveWorkspacePath(cwd);
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

function registerIpcHandlers() {
  ipcMain.handle("app:info", () => buildAppInfo());

  ipcMain.handle("workspace:pick", async () => {
    if (!mainWindow) {
      return null;
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory", "createDirectory"],
    });

    return result.canceled ? null : (result.filePaths[0] ?? null);
  });

  ipcMain.handle("workspace:reveal", async (_event, workspacePath: string) => {
    const error = await shell.openPath(workspacePath);
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
      preload: join(__dirname, "../preload/index.js"),
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
