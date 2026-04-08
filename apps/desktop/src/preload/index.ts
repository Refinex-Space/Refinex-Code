import { contextBridge, ipcRenderer } from "electron";
import type {
  AppInfo,
  AppearanceSettingsData,
  AppearanceSettingsSnapshot,
  DesktopBridge,
  SkillDownloadResult,
  DesktopMcpServerSaveInput,
  DesktopMcpServerToggleInput,
  DesktopGuiConversationSendInput,
  DesktopGuiConversationSnapshot,
  SkillMutationResult,
  DesktopMcpSettingsSnapshot,
  DesktopProviderSettingsSaveInput,
  DesktopProviderSettingsSnapshot,
  SessionCreateInput,
  SkillFilePreview,
  RemoteSkillCatalog,
  SkillSnapshot,
  SkillUploadResult,
  SidebarStateSnapshot,
  TerminalCreateInput,
  TerminalDataPayload,
  TerminalExitPayload,
  TerminalSessionInfo,
  VoiceDictationAvailability,
  VoiceDictationProgressPayload,
  VoiceDictationTranscriptionInput,
  VoiceDictationTranscriptionResult,
} from "../shared/contracts";

const desktopBridge: DesktopBridge = {
  getAppInfo: () => ipcRenderer.invoke("app:info") as Promise<AppInfo>,
  getSidebarState: () => ipcRenderer.invoke("sidebar:get-state") as Promise<SidebarStateSnapshot>,
  getSkillsSnapshot: () => ipcRenderer.invoke("skills:get-snapshot") as Promise<SkillSnapshot>,
  readSkillFile: (path: string) =>
    ipcRenderer.invoke("skills:read-file", path) as Promise<SkillFilePreview>,
  replaceSkill: (skillRoot: string) =>
    ipcRenderer.invoke("skills:replace", skillRoot) as Promise<SkillMutationResult>,
  downloadSkill: (skillRoot: string) =>
    ipcRenderer.invoke("skills:download", skillRoot) as Promise<SkillDownloadResult>,
  uninstallSkill: (skillRoot: string) =>
    ipcRenderer.invoke("skills:uninstall", skillRoot) as Promise<SkillMutationResult>,
  uploadSkill: () =>
    ipcRenderer.invoke("skills:upload") as Promise<SkillUploadResult>,
  getRemoteSkillCatalog: () =>
    ipcRenderer.invoke("skills:get-remote-catalog") as Promise<RemoteSkillCatalog>,
  installRemoteSkill: (skillId: string) =>
    ipcRenderer.invoke("skills:install-remote", skillId) as Promise<SkillMutationResult>,
  prepareVoiceDictation: () =>
    ipcRenderer.invoke("voice-dictation:prepare") as Promise<VoiceDictationAvailability>,
  transcribeVoiceDictation: (input: VoiceDictationTranscriptionInput) =>
    ipcRenderer.invoke("voice-dictation:transcribe", input) as Promise<VoiceDictationTranscriptionResult>,
  openVoiceDictationModelsDirectory: () =>
    ipcRenderer.invoke("voice-dictation:open-models-directory") as Promise<void>,
  onVoiceDictationProgress: (listener) => {
    const wrapped = (
      _event: Electron.IpcRendererEvent,
      payload: VoiceDictationProgressPayload,
    ) => {
      listener(payload);
    };

    ipcRenderer.on("voice-dictation:progress", wrapped);
    return () => {
      ipcRenderer.removeListener("voice-dictation:progress", wrapped);
    };
  },
  getAppearanceSettings: () =>
    ipcRenderer.invoke("appearance-settings:get") as Promise<AppearanceSettingsSnapshot>,
  saveAppearanceSettings: (settings: AppearanceSettingsData) =>
    ipcRenderer.invoke("appearance-settings:save", settings) as Promise<AppearanceSettingsSnapshot>,
  getProviderSettings: () =>
    ipcRenderer.invoke("provider-settings:get") as Promise<DesktopProviderSettingsSnapshot>,
  saveProviderSettings: (settings: DesktopProviderSettingsSaveInput) =>
    ipcRenderer.invoke("provider-settings:save", settings) as Promise<DesktopProviderSettingsSnapshot>,
  getMcpSettings: () =>
    ipcRenderer.invoke("mcp-settings:get") as Promise<DesktopMcpSettingsSnapshot>,
  saveMcpServer: (settings: DesktopMcpServerSaveInput) =>
    ipcRenderer.invoke("mcp-settings:save", settings) as Promise<DesktopMcpSettingsSnapshot>,
  removeMcpServer: (name: string) =>
    ipcRenderer.invoke("mcp-settings:remove", name) as Promise<DesktopMcpSettingsSnapshot>,
  toggleMcpServer: (settings: DesktopMcpServerToggleInput) =>
    ipcRenderer.invoke("mcp-settings:toggle", settings) as Promise<DesktopMcpSettingsSnapshot>,
  openWorktree: (projectPath) =>
    ipcRenderer.invoke("sidebar:open-worktree", projectPath) as Promise<SidebarStateSnapshot>,
  pickAndOpenWorktree: () =>
    ipcRenderer.invoke("sidebar:pick-and-open-worktree") as Promise<SidebarStateSnapshot | null>,
  selectWorktree: (worktreeId) =>
    ipcRenderer.invoke("sidebar:select-worktree", worktreeId) as Promise<SidebarStateSnapshot>,
  removeWorktree: (worktreeId) =>
    ipcRenderer.invoke("sidebar:remove-worktree", worktreeId) as Promise<SidebarStateSnapshot>,
  prepareSession: (worktreeId) =>
    ipcRenderer.invoke("sidebar:prepare-session", worktreeId) as Promise<SidebarStateSnapshot>,
  createSession: (input: SessionCreateInput) =>
    ipcRenderer.invoke("sidebar:create-session", input) as Promise<SidebarStateSnapshot>,
  selectSession: (worktreeId, sessionId) =>
    ipcRenderer.invoke("sidebar:select-session", {
      worktreeId,
      sessionId,
    }) as Promise<SidebarStateSnapshot>,
  removeSession: (worktreeId, sessionId) =>
    ipcRenderer.invoke("sidebar:remove-session", {
      worktreeId,
      sessionId,
    }) as Promise<SidebarStateSnapshot>,
  getGuiConversation: (sessionId) =>
    ipcRenderer.invoke("gui-conversation:get", sessionId) as Promise<DesktopGuiConversationSnapshot>,
  sendGuiConversationMessage: (input: DesktopGuiConversationSendInput) =>
    ipcRenderer.invoke("gui-conversation:send", input) as Promise<DesktopGuiConversationSnapshot>,
  revealInFinder: (workspacePath) => ipcRenderer.invoke("workspace:reveal", workspacePath),
  showItemInFolder: (targetPath) => ipcRenderer.invoke("finder:show-item", targetPath),
  createTerminalSession: (input) =>
    ipcRenderer.invoke("terminal:create", input) as Promise<TerminalSessionInfo>,
  writeTerminal: (sessionId, data) =>
    ipcRenderer.invoke("terminal:write", {
      sessionId,
      data,
    }),
  closeTerminal: (sessionId) => ipcRenderer.invoke("terminal:close", sessionId),
  onTerminalData: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: TerminalDataPayload) => {
      listener(payload);
    };

    ipcRenderer.on("terminal:data", wrapped);
    return () => {
      ipcRenderer.removeListener("terminal:data", wrapped);
    };
  },
  onTerminalExit: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: TerminalExitPayload) => {
      listener(payload);
    };

    ipcRenderer.on("terminal:exit", wrapped);
    return () => {
      ipcRenderer.removeListener("terminal:exit", wrapped);
    };
  },
};

contextBridge.exposeInMainWorld("desktopApp", desktopBridge);
