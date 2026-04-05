import { create } from "zustand";

export type ThemeMode = "system" | "dark" | "light";

const MIN_TERMINAL_HEIGHT = 220;
const MAX_TERMINAL_HEIGHT = 560;
const DEFAULT_TERMINAL_HEIGHT = 300;

const themeOrder: ThemeMode[] = ["system", "dark", "light"];

export function getNextThemeLabel(theme: ThemeMode) {
  const currentIndex = themeOrder.indexOf(theme);
  const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
  return nextTheme;
}

interface UIState {
  sidebarOpen: boolean;
  terminalOpen: boolean;
  commandPaletteOpen: boolean;
  terminalHeight: number;
  theme: ThemeMode;
  toggleSidebar: () => void;
  toggleTerminal: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setTerminalHeight: (height: number) => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  terminalOpen: false,
  commandPaletteOpen: false,
  terminalHeight: DEFAULT_TERMINAL_HEIGHT,
  theme: "system",
  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
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
