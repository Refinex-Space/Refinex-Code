import { contextBridge, ipcRenderer } from "electron";
import type {
  AppInfo,
  AppearanceSettingsData,
  AppearanceSettingsSnapshot,
  DesktopBridge,
  DesktopProviderSettingsSaveInput,
  DesktopProviderSettingsSnapshot,
  SessionCreateInput,
  SidebarStateSnapshot,
  TerminalCreateInput,
  TerminalDataPayload,
  TerminalExitPayload,
  TerminalSessionInfo,
} from "../shared/contracts";

const desktopBridge: DesktopBridge = {
  getAppInfo: () => ipcRenderer.invoke("app:info") as Promise<AppInfo>,
  getSidebarState: () => ipcRenderer.invoke("sidebar:get-state") as Promise<SidebarStateSnapshot>,
  getAppearanceSettings: () =>
    ipcRenderer.invoke("appearance-settings:get") as Promise<AppearanceSettingsSnapshot>,
  saveAppearanceSettings: (settings: AppearanceSettingsData) =>
    ipcRenderer.invoke("appearance-settings:save", settings) as Promise<AppearanceSettingsSnapshot>,
  getProviderSettings: () =>
    ipcRenderer.invoke("provider-settings:get") as Promise<DesktopProviderSettingsSnapshot>,
  saveProviderSettings: (settings: DesktopProviderSettingsSaveInput) =>
    ipcRenderer.invoke("provider-settings:save", settings) as Promise<DesktopProviderSettingsSnapshot>,
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
  revealInFinder: (workspacePath) => ipcRenderer.invoke("workspace:reveal", workspacePath),
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
