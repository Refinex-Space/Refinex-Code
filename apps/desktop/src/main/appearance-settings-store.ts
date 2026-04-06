import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  AppearanceSettingsData,
  AppearanceSettingsSnapshot,
} from "../shared/appearance-settings";
import {
  DEFAULT_APPEARANCE_SETTINGS,
  sanitizeAppearanceSettings,
} from "../shared/appearance-settings";

interface CreateAppearanceSettingsStoreOptions {
  userDataPath: string;
}

function ensureDirectory(pathname: string) {
  mkdirSync(pathname, {
    recursive: true,
  });
}

function safeReadJson<T>(pathname: string, fallback: T): T {
  try {
    if (!existsSync(pathname)) {
      return fallback;
    }

    return JSON.parse(readFileSync(pathname, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(pathname: string, value: unknown) {
  const tempPath = `${pathname}.tmp`;
  ensureDirectory(dirname(pathname));
  writeFileSync(tempPath, JSON.stringify(value, null, 2), "utf8");
  renameSync(tempPath, pathname);
}

export function createAppearanceSettingsStore({
  userDataPath,
}: CreateAppearanceSettingsStoreOptions) {
  const storagePath = join(userDataPath, "appearance-settings.json");

  function getSnapshot(): AppearanceSettingsSnapshot {
    const storedValue = safeReadJson<Partial<AppearanceSettingsData>>(
      storagePath,
      DEFAULT_APPEARANCE_SETTINGS,
    );

    return {
      ...sanitizeAppearanceSettings(storedValue),
      storagePath,
    };
  }

  function save(settings: AppearanceSettingsData): AppearanceSettingsSnapshot {
    const sanitizedSettings = sanitizeAppearanceSettings(settings);
    writeJson(storagePath, sanitizedSettings);

    return {
      ...sanitizedSettings,
      storagePath,
    };
  }

  return {
    getSnapshot,
    save,
    getStoragePath: () => storagePath,
  };
}
