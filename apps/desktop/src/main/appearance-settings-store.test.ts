// @vitest-environment node

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { createAppearanceSettingsStore } from "./appearance-settings-store";

const testRoots: string[] = [];

afterEach(() => {
  for (const root of testRoots.splice(0)) {
    rmSync(root, {
      force: true,
      recursive: true,
    });
  }
});

describe("createAppearanceSettingsStore", () => {
  it("persists sanitized appearance settings under the app data directory", () => {
    const root = mkdtempSync(join(tmpdir(), "rwork-appearance-"));
    testRoots.push(root);

    const store = createAppearanceSettingsStore({
      userDataPath: root,
    });

    const savedSnapshot = store.save({
      theme: "dark",
      pointerCursorEnabled: true,
      uiFontSize: 15,
      codeFontSize: 14,
      colors: {
        light: {
          sidebarBackground: "#abcdef",
          panelBackground: "#fedcba",
        },
        dark: {
          sidebarBackground: "#101112",
          panelBackground: "#131415",
        },
      },
    });

    expect(savedSnapshot.theme).toBe("dark");
    expect(savedSnapshot.pointerCursorEnabled).toBe(true);
    expect(savedSnapshot.colors.light.sidebarBackground).toBe("#abcdef");
    expect(existsSync(savedSnapshot.storagePath)).toBe(true);

    const rawContent = JSON.parse(readFileSync(savedSnapshot.storagePath, "utf8")) as {
      colors: { dark: { panelBackground: string } };
    };
    expect(rawContent.colors.dark.panelBackground).toBe("#131415");

    const reloadedStore = createAppearanceSettingsStore({
      userDataPath: root,
    });
    const reloadedSnapshot = reloadedStore.getSnapshot();

    expect(reloadedSnapshot.colors.light.panelBackground).toBe("#fedcba");
    expect(reloadedSnapshot.codeFontSize).toBe(14);
  });

  it("falls back to defaults when stored values are invalid", () => {
    const root = mkdtempSync(join(tmpdir(), "rwork-appearance-"));
    testRoots.push(root);

    const store = createAppearanceSettingsStore({
      userDataPath: root,
    });

    const snapshot = store.save({
      theme: "system",
      pointerCursorEnabled: false,
      uiFontSize: 999,
      codeFontSize: 1,
      colors: {
        light: {
          sidebarBackground: "bad-value",
          panelBackground: "#123456",
        },
        dark: {
          sidebarBackground: "#654321",
          panelBackground: "oops",
        },
      },
    });

    expect(snapshot.uiFontSize).toBe(17);
    expect(snapshot.codeFontSize).toBe(10);
    expect(snapshot.colors.light.sidebarBackground).toBe("#f3f4f6");
    expect(snapshot.colors.dark.panelBackground).toBe("#000000");
  });
});
