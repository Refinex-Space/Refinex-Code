import { create } from "zustand";
import type {
  DesktopProviderId,
  ProviderReasoningEffort,
} from "../../../shared/provider-settings";
import type {
  AppearanceColorMode,
  AppearanceColorPalette,
  AppearanceSettingsData,
  ThemeMode,
} from "../../../shared/appearance-settings";
import {
  DEFAULT_CLAUDE_EFFORT,
  DEFAULT_CLAUDE_MODEL,
} from "../../../shared/provider-settings";
import {
  DEFAULT_APPEARANCE_SETTINGS,
  DEFAULT_CODE_FONT_SIZE,
  DEFAULT_UI_FONT_SIZE,
  MAX_CODE_FONT_SIZE,
  MAX_UI_FONT_SIZE,
  MIN_CODE_FONT_SIZE,
  MIN_UI_FONT_SIZE,
  clampCodeFontSize,
  clampUIFontSize,
} from "../../../shared/appearance-settings";

export {
  DEFAULT_CODE_FONT_SIZE,
  DEFAULT_UI_FONT_SIZE,
  MAX_CODE_FONT_SIZE,
  MAX_UI_FONT_SIZE,
  MIN_CODE_FONT_SIZE,
  MIN_UI_FONT_SIZE,
  clampCodeFontSize,
  clampUIFontSize,
} from "../../../shared/appearance-settings";
export type {
  AppearanceColorMode,
  AppearanceColorPalette,
  AppearanceSettingsData,
  ThemeMode,
} from "../../../shared/appearance-settings";
export type ShellView = "workspace" | "skills" | "settings";
export type SettingsSection = "appearance" | "provider" | "mcp";
export type SkillsContentMode = "preview" | "source";

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

export const defaultUIState = {
  shellView: "workspace" as ShellView,
  settingsSection: "appearance" as SettingsSection,
  sidebarOpen: true,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  terminalOpen: false,
  commandPaletteOpen: false,
  terminalHeight: DEFAULT_TERMINAL_HEIGHT,
  theme: "system" as ThemeMode,
  selectedSkillId: null as string | null,
  selectedSkillNodeId: null as string | null,
  skillsContentMode: "preview" as SkillsContentMode,
  composerControlsHydrated: false,
  composerProviderId: "anthropic" as DesktopProviderId,
  composerModel: DEFAULT_CLAUDE_MODEL,
  composerEffort: DEFAULT_CLAUDE_EFFORT as ProviderReasoningEffort,
  pointerCursorEnabled: false,
  uiFontSize: DEFAULT_UI_FONT_SIZE,
  codeFontSize: DEFAULT_CODE_FONT_SIZE,
  colors: DEFAULT_APPEARANCE_SETTINGS.colors,
  appearanceSettingsHydrated: false,
};

interface UIState {
  shellView: ShellView;
  settingsSection: SettingsSection;
  sidebarOpen: boolean;
  sidebarWidth: number;
  terminalOpen: boolean;
  commandPaletteOpen: boolean;
  terminalHeight: number;
  theme: ThemeMode;
  selectedSkillId: string | null;
  selectedSkillNodeId: string | null;
  skillsContentMode: SkillsContentMode;
  composerControlsHydrated: boolean;
  composerProviderId: DesktopProviderId;
  composerModel: string;
  composerEffort: ProviderReasoningEffort;
  pointerCursorEnabled: boolean;
  uiFontSize: number;
  codeFontSize: number;
  colors: Record<AppearanceColorMode, AppearanceColorPalette>;
  appearanceSettingsHydrated: boolean;
  openSettings: (section?: SettingsSection) => void;
  openSkills: () => void;
  closeSkills: () => void;
  closeSettings: () => void;
  setSettingsSection: (section: SettingsSection) => void;
  selectSkillItem: (skillId: string | null, nodeId?: string | null) => void;
  setSkillsContentMode: (mode: SkillsContentMode) => void;
  hydrateComposerControls: (selection: {
    providerId: DesktopProviderId;
    model: string;
    effort: ProviderReasoningEffort;
  }) => void;
  setComposerProviderSelection: (selection: {
    providerId: DesktopProviderId;
    model: string;
    effort: ProviderReasoningEffort;
  }) => void;
  setComposerModelSelection: (model: string, effort: ProviderReasoningEffort) => void;
  setComposerEffortSelection: (effort: ProviderReasoningEffort) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number, viewportWidth?: number) => void;
  toggleTerminal: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setTerminalHeight: (height: number) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setPointerCursorEnabled: (enabled: boolean) => void;
  setUIFontSize: (size: number) => void;
  setCodeFontSize: (size: number) => void;
  setSurfaceColor: (
    mode: AppearanceColorMode,
    surface: keyof AppearanceColorPalette,
    color: string,
  ) => void;
  hydrateAppearanceSettings: (settings: AppearanceSettingsData) => void;
  reset: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  ...defaultUIState,
  openSettings: (section = "appearance") => {
    set({
      shellView: "settings",
      settingsSection: section,
    });
  },
  openSkills: () => {
    set({
      shellView: "skills",
    });
  },
  closeSkills: () => {
    set({
      shellView: "workspace",
    });
  },
  closeSettings: () => {
    set({
      shellView: "workspace",
    });
  },
  setSettingsSection: (section) => {
    set({
      settingsSection: section,
    });
  },
  selectSkillItem: (selectedSkillId, selectedSkillNodeId = null) => {
    set({
      selectedSkillId,
      selectedSkillNodeId,
    });
  },
  setSkillsContentMode: (skillsContentMode) => {
    set({ skillsContentMode });
  },
  hydrateComposerControls: ({ providerId, model, effort }) => {
    set({
      composerControlsHydrated: true,
      composerProviderId: providerId,
      composerModel: model,
      composerEffort: effort,
    });
  },
  setComposerProviderSelection: ({ providerId, model, effort }) => {
    set({
      composerProviderId: providerId,
      composerModel: model,
      composerEffort: effort,
    });
  },
  setComposerModelSelection: (composerModel, composerEffort) => {
    set({
      composerModel,
      composerEffort,
    });
  },
  setComposerEffortSelection: (composerEffort) => {
    set({ composerEffort });
  },
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
  setTheme: (theme) => {
    set({ theme });
  },
  toggleTheme: () => {
    set((state) => {
      const currentIndex = themeOrder.indexOf(state.theme);
      return {
        theme: themeOrder[(currentIndex + 1) % themeOrder.length],
      };
    });
  },
  setPointerCursorEnabled: (enabled) => {
    set({ pointerCursorEnabled: enabled });
  },
  setUIFontSize: (size) => {
    set({
      uiFontSize: clampUIFontSize(size),
    });
  },
  setCodeFontSize: (size) => {
    set({
      codeFontSize: clampCodeFontSize(size),
    });
  },
  setSurfaceColor: (mode, surface, color) => {
    set((state) => ({
      colors: {
        ...state.colors,
        [mode]: {
          ...state.colors[mode],
          [surface]: color,
        },
      },
    }));
  },
  hydrateAppearanceSettings: (settings) => {
    set({
      theme: settings.theme,
      pointerCursorEnabled: settings.pointerCursorEnabled,
      uiFontSize: clampUIFontSize(settings.uiFontSize),
      codeFontSize: clampCodeFontSize(settings.codeFontSize),
      colors: settings.colors,
      appearanceSettingsHydrated: true,
    });
  },
  reset: () => {
    set(defaultUIState);
  },
}));
