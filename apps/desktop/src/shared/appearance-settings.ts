export type ThemeMode = "system" | "dark" | "light";
export type AppearanceColorMode = "light" | "dark";

export interface AppearanceColorPalette {
  sidebarBackground: string;
  panelBackground: string;
}

export interface AppearanceSettingsData {
  theme: ThemeMode;
  pointerCursorEnabled: boolean;
  uiFontSize: number;
  codeFontSize: number;
  colors: Record<AppearanceColorMode, AppearanceColorPalette>;
}

export interface AppearanceSettingsSnapshot extends AppearanceSettingsData {
  storagePath: string;
}

type AppearanceSettingsInput = Partial<
  Omit<AppearanceSettingsData, "colors">
> & {
  colors?: Partial<Record<AppearanceColorMode, Partial<AppearanceColorPalette>>>;
};

export const DEFAULT_UI_FONT_SIZE = 13;
export const DEFAULT_CODE_FONT_SIZE = 12;
export const MIN_UI_FONT_SIZE = 11;
export const MAX_UI_FONT_SIZE = 17;
export const MIN_CODE_FONT_SIZE = 10;
export const MAX_CODE_FONT_SIZE = 16;

const themeModes = new Set<ThemeMode>(["system", "dark", "light"]);
const colorModes: AppearanceColorMode[] = ["light", "dark"];
const hexColorPattern = /^#[0-9a-f]{6}$/i;

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettingsData = {
  theme: "system",
  pointerCursorEnabled: false,
  uiFontSize: DEFAULT_UI_FONT_SIZE,
  codeFontSize: DEFAULT_CODE_FONT_SIZE,
  colors: {
    light: {
      sidebarBackground: "#f3f4f6",
      panelBackground: "#ffffff",
    },
    dark: {
      sidebarBackground: "#0f1012",
      panelBackground: "#000000",
    },
  },
};

export function clampUIFontSize(size: number) {
  return Math.max(
    MIN_UI_FONT_SIZE,
    Math.min(MAX_UI_FONT_SIZE, Math.round(size)),
  );
}

export function clampCodeFontSize(size: number) {
  return Math.max(
    MIN_CODE_FONT_SIZE,
    Math.min(MAX_CODE_FONT_SIZE, Math.round(size)),
  );
}

function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return hexColorPattern.test(trimmed) ? trimmed.toLowerCase() : fallback;
}

export function sanitizeAppearanceSettings(
  value?: AppearanceSettingsInput | null,
): AppearanceSettingsData {
  const input = value ?? {};

  return {
    theme:
      typeof input.theme === "string" && themeModes.has(input.theme as ThemeMode)
        ? (input.theme as ThemeMode)
        : DEFAULT_APPEARANCE_SETTINGS.theme,
    pointerCursorEnabled:
      typeof input.pointerCursorEnabled === "boolean"
        ? input.pointerCursorEnabled
        : DEFAULT_APPEARANCE_SETTINGS.pointerCursorEnabled,
    uiFontSize: clampUIFontSize(
      typeof input.uiFontSize === "number"
        ? input.uiFontSize
        : DEFAULT_APPEARANCE_SETTINGS.uiFontSize,
    ),
    codeFontSize: clampCodeFontSize(
      typeof input.codeFontSize === "number"
        ? input.codeFontSize
        : DEFAULT_APPEARANCE_SETTINGS.codeFontSize,
    ),
    colors: Object.fromEntries(
      colorModes.map((mode) => {
        const nextPalette = input.colors?.[mode];
        const fallbackPalette = DEFAULT_APPEARANCE_SETTINGS.colors[mode];

        return [
          mode,
          {
            sidebarBackground: normalizeHexColor(
              nextPalette?.sidebarBackground,
              fallbackPalette.sidebarBackground,
            ),
            panelBackground: normalizeHexColor(
              nextPalette?.panelBackground,
              fallbackPalette.panelBackground,
            ),
          },
        ];
      }),
    ) as Record<AppearanceColorMode, AppearanceColorPalette>,
  };
}
