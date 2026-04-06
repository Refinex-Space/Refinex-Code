import { create } from "zustand";

export type ThemeMode = "system" | "dark" | "light";

export const DEFAULT_SIDEBAR_WIDTH = 258;
export const MIN_SIDEBAR_WIDTH = 220;
export const MAX_SIDEBAR_WIDTH = 420;
export const MIN_MAIN_PANEL_WIDTH = 720;

const MIN_TERMINAL_HEIGHT = 220;
const MAX_TERMINAL_HEIGHT = 560;
const DEFAULT_TERMINAL_HEIGHT = 300;

const themeOrder: ThemeMode[] = ["system", "dark", "light"];

export function clampSidebarWidth(
  width: number,
  viewportWidth = Number.POSITIVE_INFINITY,
) {
  const viewportLimitedMaxWidth = Number.isFinite(viewportWidth)
    ? Math.max(
        MIN_SIDEBAR_WIDTH,
        Math.min(MAX_SIDEBAR_WIDTH, viewportWidth - MIN_MAIN_PANEL_WIDTH),
      )
    : MAX_SIDEBAR_WIDTH;

  return Math.max(
    MIN_SIDEBAR_WIDTH,
    Math.min(viewportLimitedMaxWidth, width),
  );
}

export function getNextThemeLabel(theme: ThemeMode) {
  const currentIndex = themeOrder.indexOf(theme);
  const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
  return nextTheme;
}

interface UIState {
  sidebarOpen: boolean;
  sidebarWidth: number;
  terminalOpen: boolean;
  commandPaletteOpen: boolean;
  terminalHeight: number;
  theme: ThemeMode;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number, viewportWidth?: number) => void;
  toggleTerminal: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setTerminalHeight: (height: number) => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  terminalOpen: false,
  commandPaletteOpen: false,
  terminalHeight: DEFAULT_TERMINAL_HEIGHT,
  theme: "system",
  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },
  setSidebarWidth: (width, viewportWidth) => {
    set({
      sidebarWidth: clampSidebarWidth(width, viewportWidth),
    });
  },
  toggleTerminal: () => {
    set((state) => ({ terminalOpen: !state.terminalOpen }));
  },
  setCommandPaletteOpen: (open) => {
    set({ commandPaletteOpen: open });
  },
  setTerminalHeight: (height) => {
    set({
      terminalHeight: Math.max(MIN_TERMINAL_HEIGHT, Math.min(MAX_TERMINAL_HEIGHT, height)),
    });
  },
  toggleTheme: () => {
    set((state) => {
      const currentIndex = themeOrder.indexOf(state.theme);
      return {
        theme: themeOrder[(currentIndex + 1) % themeOrder.length],
      };
    });
  },
}));
