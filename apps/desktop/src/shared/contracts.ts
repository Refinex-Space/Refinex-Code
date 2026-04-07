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

export type SkillSourceKind = "personal" | "project" | "plugin";

export type SkillTreeNodeType = "directory" | "file";

export interface SkillTreeNode {
  id: string;
  name: string;
  path: string;
  relativePath: string;
  type: SkillTreeNodeType;
  children?: SkillTreeNode[];
}

export interface SkillRecord {
  id: string;
  name: string;
  displayName: string;
  sourceKind: SkillSourceKind;
  sourceLabel: string;
  pluginName?: string;
  skillRoot: string;
  skillMdPath: string;
  description: string;
  whenToUse?: string;
  version?: string;
  userInvocable: boolean;
  disableModelInvocation: boolean;
  invokedBy: string;
  addedBy: string;
  lastUpdated: string;
  tree: SkillTreeNode[];
}

export interface SkillSnapshot {
  skills: SkillRecord[];
  activeWorktreePath: string | null;
  generatedAt: string;
}

export type SkillFilePreviewKind =
  | "markdown"
  | "text"
  | "unsupported"
  | "too_large";

export interface SkillFilePreview {
  path: string;
  kind: SkillFilePreviewKind;
  size: number;
  content?: string;
  language: string | null;
  truncated?: boolean;
}

export interface SkillMutationResult {
  cancelled: boolean;
  snapshot: SkillSnapshot | null;
}

export interface SkillDownloadResult {
  cancelled: boolean;
  targetPath: string | null;
}

export interface SkillUploadResult {
  cancelled: boolean;
  snapshot: SkillSnapshot | null;
}

export interface RemoteSkillRecord {
  id: string;
  name: string;
  description: string;
  sourceLabel: string;
  providerLabel: string;
}

export interface RemoteSkillCatalog {
  skills: RemoteSkillRecord[];
  fetchedAt: string;
}

export interface VoiceDictationAvailability {
  available: boolean;
  provider: "sherpa-onnx";
  modelId: string;
  modelLabel: string;
  downloaded: boolean;
  message: string | null;
}

export interface VoiceDictationTranscriptionInput {
  samples: Float32Array;
  sampleRate: number;
}

export interface VoiceDictationTranscriptionResult {
  text: string;
  modelLabel: string;
  sampleRate: number;
  sampleCount: number;
  durationMs: number;
}

export type TerminalSessionProfile = "shell" | "thread-tui";

export type VoiceDictationProgressStage =
  | "checking"
  | "downloading"
  | "extracting"
  | "loading"
  | "ready"
  | "transcribing"
  | "error";

export interface VoiceDictationProgressPayload {
  stage: VoiceDictationProgressStage;
  message: string;
  percent: number | null;
  bytesReceived?: number;
  bytesTotal?: number | null;
}

export interface TerminalCreateInput {
  sessionId: string;
  cwd?: string | null;
  profile?: TerminalSessionProfile;
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
  backlog?: string;
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
  getSkillsSnapshot: () => Promise<SkillSnapshot>;
  readSkillFile: (path: string) => Promise<SkillFilePreview>;
  replaceSkill: (skillRoot: string) => Promise<SkillMutationResult>;
  downloadSkill: (skillRoot: string) => Promise<SkillDownloadResult>;
  uninstallSkill: (skillRoot: string) => Promise<SkillMutationResult>;
  uploadSkill: () => Promise<SkillUploadResult>;
  getRemoteSkillCatalog: () => Promise<RemoteSkillCatalog>;
  installRemoteSkill: (skillId: string) => Promise<SkillMutationResult>;
  prepareVoiceDictation: () => Promise<VoiceDictationAvailability>;
  transcribeVoiceDictation: (
    input: VoiceDictationTranscriptionInput,
  ) => Promise<VoiceDictationTranscriptionResult>;
  openVoiceDictationModelsDirectory: () => Promise<void>;
  onVoiceDictationProgress: (
    listener: (payload: VoiceDictationProgressPayload) => void,
  ) => () => void;
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
