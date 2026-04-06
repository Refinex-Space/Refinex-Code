import type {
  AppearanceSettingsData,
  AppearanceSettingsSnapshot,
} from "./appearance-settings";
import type {
  DesktopProviderSettingsSaveInput,
  DesktopProviderSettingsSnapshot,
} from "./provider-settings";
import type {
  DesktopMcpServerSaveInput,
  DesktopMcpServerToggleInput,
  DesktopMcpSettingsSnapshot,
} from "./mcp-settings";
export type {
  AppearanceSettingsData,
  AppearanceSettingsSnapshot,
} from "./appearance-settings";
export type {
  DesktopProviderSettingsSaveInput,
  DesktopProviderSettingsSnapshot,
} from "./provider-settings";
export type {
  DesktopMcpServerSaveInput,
  DesktopMcpServerToggleInput,
  DesktopMcpSettingsSnapshot,
} from "./mcp-settings";

export interface AppInfo {
  appName: string;
  appVersion: string;
  platform: NodeJS.Platform;
  defaultWorkspacePath: string | null;
}

export interface WorktreeSessionRecord {
  id: string;
  worktreeId: string;
  title: string;
  status: "idle";
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  storagePath: string;
}

export interface WorktreeRecord {
  id: string;
  label: string;
  sourcePath: string;
  worktreePath: string;
  gitRoot: string | null;
  branch: string | null;
  isGitRepository: boolean;
  storagePath: string;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  lastSessionId: string | null;
  sessions: WorktreeSessionRecord[];
}

export interface SidebarStateSnapshot {
  worktrees: WorktreeRecord[];
  activeWorktreeId: string | null;
  activeSessionId: string | null;
  storageRoot: string;
}

export interface TerminalCreateInput {
  sessionId: string;
  cwd?: string | null;
}

export interface SessionCreateInput {
  worktreeId: string;
  title?: string | null;
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
  getSidebarState: () => Promise<SidebarStateSnapshot>;
  getAppearanceSettings: () => Promise<AppearanceSettingsSnapshot>;
  saveAppearanceSettings: (
    settings: AppearanceSettingsData,
  ) => Promise<AppearanceSettingsSnapshot>;
  getProviderSettings: () => Promise<DesktopProviderSettingsSnapshot>;
  saveProviderSettings: (
    settings: DesktopProviderSettingsSaveInput,
  ) => Promise<DesktopProviderSettingsSnapshot>;
  getMcpSettings: () => Promise<DesktopMcpSettingsSnapshot>;
  saveMcpServer: (
    settings: DesktopMcpServerSaveInput,
  ) => Promise<DesktopMcpSettingsSnapshot>;
  removeMcpServer: (name: string) => Promise<DesktopMcpSettingsSnapshot>;
  toggleMcpServer: (
    settings: DesktopMcpServerToggleInput,
  ) => Promise<DesktopMcpSettingsSnapshot>;
  openWorktree: (projectPath: string) => Promise<SidebarStateSnapshot>;
  pickAndOpenWorktree: () => Promise<SidebarStateSnapshot | null>;
  selectWorktree: (worktreeId: string) => Promise<SidebarStateSnapshot>;
  removeWorktree: (worktreeId: string) => Promise<SidebarStateSnapshot>;
  prepareSession: (worktreeId: string) => Promise<SidebarStateSnapshot>;
  createSession: (input: SessionCreateInput) => Promise<SidebarStateSnapshot>;
  selectSession: (worktreeId: string, sessionId: string) => Promise<SidebarStateSnapshot>;
  removeSession: (worktreeId: string, sessionId: string) => Promise<SidebarStateSnapshot>;
  revealInFinder: (path: string) => Promise<void>;
  showItemInFolder: (path: string) => Promise<void>;
  createTerminalSession: (input: TerminalCreateInput) => Promise<TerminalSessionInfo>;
  writeTerminal: (sessionId: string, data: string) => Promise<void>;
  closeTerminal: (sessionId: string) => Promise<void>;
  onTerminalData: (listener: (payload: TerminalDataPayload) => void) => () => void;
  onTerminalExit: (listener: (payload: TerminalExitPayload) => void) => () => void;
}
