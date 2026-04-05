import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import type { DesktopBridge } from "../../../shared/contracts";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

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

const desktopBridgeMock: DesktopBridge = {
  getAppInfo: vi.fn().mockResolvedValue({
    appName: "Refinex Code Desktop",
    appVersion: "0.1.0",
    platform: "darwin",
    defaultWorkspacePath: null,
  }),
  pickWorkspace: vi.fn().mockResolvedValue(null),
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

Object.defineProperty(window, "desktopApp", {
  writable: true,
  value: desktopBridgeMock,
});
