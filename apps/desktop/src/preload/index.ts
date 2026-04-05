import { contextBridge, ipcRenderer } from "electron";
import type {
  AppInfo,
  DesktopBridge,
  TerminalCreateInput,
  TerminalDataPayload,
  TerminalExitPayload,
  TerminalSessionInfo,
} from "../shared/contracts";

const desktopBridge: DesktopBridge = {
  getAppInfo: () => ipcRenderer.invoke("app:info") as Promise<AppInfo>,
  pickWorkspace: () => ipcRenderer.invoke("workspace:pick") as Promise<string | null>,
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
