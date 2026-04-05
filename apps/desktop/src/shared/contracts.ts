export interface AppInfo {
  appName: string;
  appVersion: string;
  platform: NodeJS.Platform;
  defaultWorkspacePath: string | null;
}

export interface TerminalCreateInput {
  sessionId: string;
  cwd?: string | null;
}

export interface TerminalSessionInfo {
  sessionId: string;
  cwd: string;
  shellPath: string;
  created: boolean;
  alive: boolean;
}

export interface TerminalDataPayload {
  sessionId: string;
  chunk: string;
}

export interface TerminalExitPayload {
  sessionId: string;
  exitCode: number | null;
}

export interface DesktopBridge {
  getAppInfo: () => Promise<AppInfo>;
  pickWorkspace: () => Promise<string | null>;
  revealInFinder: (workspacePath: string) => Promise<void>;
  createTerminalSession: (input: TerminalCreateInput) => Promise<TerminalSessionInfo>;
  writeTerminal: (sessionId: string, data: string) => Promise<void>;
  closeTerminal: (sessionId: string) => Promise<void>;
  onTerminalData: (listener: (payload: TerminalDataPayload) => void) => () => void;
  onTerminalExit: (listener: (payload: TerminalExitPayload) => void) => () => void;
}
