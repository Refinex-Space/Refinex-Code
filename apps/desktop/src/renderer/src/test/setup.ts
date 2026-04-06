import "@testing-library/jest-dom/vitest";
import { beforeEach, vi } from "vitest";
import type { DesktopBridge } from "../../../shared/contracts";
import { DEFAULT_APPEARANCE_SETTINGS } from "../../../shared/appearance-settings";
import { useUIStore } from "@renderer/stores/ui";
import { emptySidebarState, useWorktreeStore } from "@renderer/stores/worktree";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof HTMLCanvasElement !== "undefined") {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    writable: true,
    value: vi.fn(() => ({
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    })),
  });
}

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: false,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: ResizeObserverMock,
  });
}

const defaultSidebarState = {
  ...emptySidebarState,
  storageRoot: "/Users/test/Library/Application Support/RWork/sidebar-state",
};

const defaultAppearanceSettings = {
  ...DEFAULT_APPEARANCE_SETTINGS,
  storagePath:
    "/Users/test/Library/Application Support/RWork/appearance-settings.json",
};

const desktopBridgeMock: DesktopBridge = {
  getAppInfo: vi.fn().mockResolvedValue({
    appName: "RWork",
    appVersion: "0.1.0",
    platform: "darwin",
    defaultWorkspacePath: null,
  }),
  getSidebarState: vi.fn().mockResolvedValue(defaultSidebarState),
  getAppearanceSettings: vi.fn().mockResolvedValue(defaultAppearanceSettings),
  saveAppearanceSettings: vi
    .fn()
    .mockImplementation(async (settings) => ({ ...settings, storagePath: defaultAppearanceSettings.storagePath })),
  openWorktree: vi.fn().mockResolvedValue(defaultSidebarState),
  pickAndOpenWorktree: vi.fn().mockResolvedValue(null),
  selectWorktree: vi.fn().mockResolvedValue(defaultSidebarState),
  removeWorktree: vi.fn().mockResolvedValue(defaultSidebarState),
  prepareSession: vi.fn().mockResolvedValue(defaultSidebarState),
  createSession: vi.fn().mockResolvedValue(defaultSidebarState),
  selectSession: vi.fn().mockResolvedValue(defaultSidebarState),
  removeSession: vi.fn().mockResolvedValue(defaultSidebarState),
  revealInFinder: vi.fn().mockResolvedValue(undefined),
  createTerminalSession: vi.fn().mockResolvedValue({
    sessionId: "global-shell",
    cwd: "/tmp",
    shellPath: "/bin/zsh",
    created: true,
    alive: true,
  }),
  writeTerminal: vi.fn().mockResolvedValue(undefined),
  closeTerminal: vi.fn().mockResolvedValue(undefined),
  onTerminalData: vi.fn().mockImplementation(() => () => {}),
  onTerminalExit: vi.fn().mockImplementation(() => () => {}),
};

if (typeof window !== "undefined") {
  Object.defineProperty(window, "desktopApp", {
    writable: true,
    value: desktopBridgeMock,
  });

  beforeEach(() => {
    useUIStore.getState().reset();
    useWorktreeStore.getState().reset();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-pointer-cursor");
    document.documentElement.style.removeProperty("--ui-font-size");
    document.documentElement.style.removeProperty("--code-font-size");
    document.documentElement.style.removeProperty("--color-sidebar");
    document.documentElement.style.removeProperty("--color-bg");
    vi.mocked(window.desktopApp.getSidebarState).mockResolvedValue(defaultSidebarState);
    vi.mocked(window.desktopApp.getAppearanceSettings).mockResolvedValue(
      defaultAppearanceSettings,
    );
    vi.mocked(window.desktopApp.saveAppearanceSettings).mockImplementation(
      async (settings) => ({
        ...settings,
        storagePath: defaultAppearanceSettings.storagePath,
      }),
    );
    vi.mocked(window.desktopApp.openWorktree).mockResolvedValue(defaultSidebarState);
    vi.mocked(window.desktopApp.pickAndOpenWorktree).mockResolvedValue(null);
    vi.mocked(window.desktopApp.selectWorktree).mockResolvedValue(defaultSidebarState);
    vi.mocked(window.desktopApp.removeWorktree).mockResolvedValue(defaultSidebarState);
    vi.mocked(window.desktopApp.prepareSession).mockResolvedValue(defaultSidebarState);
    vi.mocked(window.desktopApp.createSession).mockResolvedValue(defaultSidebarState);
    vi.mocked(window.desktopApp.selectSession).mockResolvedValue(defaultSidebarState);
    vi.mocked(window.desktopApp.removeSession).mockResolvedValue(defaultSidebarState);
  });
}
