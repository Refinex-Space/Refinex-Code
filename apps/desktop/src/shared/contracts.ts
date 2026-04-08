import type {
  AppearanceSettingsData,
  AppearanceSettingsSnapshot,
} from "./appearance-settings";
import type {
  DesktopProviderId,
  DesktopProviderSettingsSaveInput,
  DesktopProviderSettingsSnapshot,
  ProviderReasoningEffort,
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
  DesktopProviderId,
  DesktopProviderSettingsSaveInput,
  DesktopProviderSettingsSnapshot,
  ProviderReasoningEffort,
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

export type DesktopGuiConversationRole = "user" | "assistant";

export type DesktopGuiConversationMessageStatus =
  | "completed"
  | "pending"
  | "error";

// ─── GUI Content Block Type System ────────────────────────────────────────────

export type GuiContentBlock =
  | GuiTextBlock
  | GuiThinkingBlock
  | GuiRedactedThinkingBlock
  | GuiToolUseBlock
  | GuiToolResultBlock
  | GuiSystemBlock;

export interface GuiTextBlock {
  type: "text";
  text: string;
}

export interface GuiThinkingBlock {
  type: "thinking";
  thinking: string;
  collapsed?: boolean;
}

export interface GuiRedactedThinkingBlock {
  type: "redacted_thinking";
}

export type GuiToolStatus =
  | "pending"
  | "running"
  | "completed"
  | "error"
  | "cancelled"
  | "rejected";

export interface GuiToolProgress {
  message?: string;
  percent?: number;
  stdout?: string;
  stderr?: string;
}

export interface GuiStructuredPatchHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: string[];
}

export interface GuiGitDiff {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string;
  repository?: string;
}

export interface GuiMcpResultItem {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
  uiResourceUri?: string;
}

export interface GuiToolResultPayload {
  isError: boolean;
  content: string | GuiMcpResultItem[];
  structuredPatch?: GuiStructuredPatchHunk[];
  gitDiff?: GuiGitDiff;
  filePath?: string;
  returnCodeInterpretation?: string;
  interrupted?: boolean;
}

export interface GuiToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
  status: GuiToolStatus;
  isMcp: boolean;
  mcpServer?: string;
  mcpTool?: string;
  progress?: GuiToolProgress;
  result?: GuiToolResultPayload;
}

export interface GuiToolResultBlock {
  type: "tool_result";
  toolUseId: string;
  isError: boolean;
  content: string;
}

export type GuiSystemSubtype =
  | "api_error"
  | "rate_limit"
  | "memory_saved"
  | "agents_killed"
  | "turn_duration"
  | "bridge_status"
  | "skill_loaded"
  | "cost_summary"
  | "informational";

export interface GuiSystemBlock {
  type: "system";
  subtype: GuiSystemSubtype;
  level: "info" | "warning" | "error";
  message: string;
  data?: Record<string, unknown>;
}

export interface GuiMessageUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  costUsd?: number;
}

export interface GuiAgentTask {
  id: string;
  sessionId: string;
  description: string;
  agentType?: string;
  name?: string;
  status: "initializing" | "running" | "completed" | "error" | "killed";
  toolUseCount: number;
  tokens: number | null;
  isAsync: boolean;
  lastToolInfo?: string;
  startedAt: string;
  finishedAt?: string;
  childMessages?: DesktopGuiConversationMessage[];
}

export interface GuiConversationBlockDeltaPayload {
  sessionId: string;
  messageId: string;
  blockIndex: number;
  delta: GuiBlockDelta;
}

export type GuiBlockDelta =
  | { type: "text_delta"; text: string }
  | { type: "thinking_delta"; thinking: string }
  | { type: "tool_status"; status: GuiToolStatus }
  | { type: "tool_progress"; progress: GuiToolProgress }
  | { type: "tool_result"; result: GuiToolResultPayload }
  | { type: "block_added"; block: GuiContentBlock };

// ─── Message & Snapshot ───────────────────────────────────────────────────────

export interface DesktopGuiConversationMessage {
  id: string;
  role: DesktopGuiConversationRole;
  /** Legacy plain-text fallback. Used when blocks is empty/undefined. */
  text: string;
  blocks?: GuiContentBlock[];
  usage?: GuiMessageUsage;
  durationMs?: number;
  createdAt: string;
  status: DesktopGuiConversationMessageStatus;
  providerId: DesktopProviderId;
  model: string;
  effort: ProviderReasoningEffort;
}

export interface DesktopGuiConversationSnapshot {
  sessionId: string;
  messages: DesktopGuiConversationMessage[];
  updatedAt: string;
  agentTasks?: GuiAgentTask[];
  totalUsage?: GuiMessageUsage;
}

export interface DesktopGuiConversationSendInput {
  sessionId: string;
  worktreePath: string;
  prompt: string;
  providerId: DesktopProviderId;
  model: string;
  effort: ProviderReasoningEffort;
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
  selectSession: (
    worktreeId: string,
    sessionId: string,
  ) => Promise<SidebarStateSnapshot>;
  removeSession: (
    worktreeId: string,
    sessionId: string,
  ) => Promise<SidebarStateSnapshot>;
  getGuiConversation: (
    sessionId: string,
  ) => Promise<DesktopGuiConversationSnapshot>;
  sendGuiConversationMessage: (
    input: DesktopGuiConversationSendInput,
  ) => Promise<DesktopGuiConversationSnapshot>;
  onGuiConversationBlockDelta: (
    listener: (payload: GuiConversationBlockDeltaPayload) => void,
  ) => () => void;
  revealInFinder: (path: string) => Promise<void>;
  showItemInFolder: (path: string) => Promise<void>;
  createTerminalSession: (
    input: TerminalCreateInput,
  ) => Promise<TerminalSessionInfo>;
  writeTerminal: (sessionId: string, data: string) => Promise<void>;
  closeTerminal: (sessionId: string) => Promise<void>;
  onTerminalData: (
    listener: (payload: TerminalDataPayload) => void,
  ) => () => void;
  onTerminalExit: (
    listener: (payload: TerminalExitPayload) => void,
  ) => () => void;
}
