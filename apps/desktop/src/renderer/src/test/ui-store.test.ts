import { describe, expect, it } from "vitest";
import {
  clampCodeFontSize,
  clampSidebarWidth,
  clampUIFontSize,
  MAX_SIDEBAR_WIDTH,
  MAX_CODE_FONT_SIZE,
  MAX_UI_FONT_SIZE,
  MIN_MAIN_PANEL_WIDTH,
  MIN_CODE_FONT_SIZE,
  MIN_SIDEBAR_WIDTH,
  MIN_UI_FONT_SIZE,
} from "@renderer/stores/ui";

describe("sidebar width constraints", () => {
  it("limits the sidebar width to the configured hard cap", () => {
    expect(clampSidebarWidth(MAX_SIDEBAR_WIDTH + 120, 1600)).toBe(
      MAX_SIDEBAR_WIDTH,
    );
  });

  it("shrinks the effective maximum when the viewport is narrow", () => {
    expect(clampSidebarWidth(MAX_SIDEBAR_WIDTH, MIN_MAIN_PANEL_WIDTH + 320)).toBe(
      320,
    );
  });

  it("never lets the sidebar shrink below the minimum width", () => {
    expect(clampSidebarWidth(MIN_SIDEBAR_WIDTH - 80, 1600)).toBe(
      MIN_SIDEBAR_WIDTH,
    );
  });

  it("clamps the UI font size into the supported range", () => {
    expect(clampUIFontSize(MIN_UI_FONT_SIZE - 5)).toBe(MIN_UI_FONT_SIZE);
    expect(clampUIFontSize(MAX_UI_FONT_SIZE + 5)).toBe(MAX_UI_FONT_SIZE);
  });

  it("clamps the code font size into the supported range", () => {
    expect(clampCodeFontSize(MIN_CODE_FONT_SIZE - 5)).toBe(MIN_CODE_FONT_SIZE);
    expect(clampCodeFontSize(MAX_CODE_FONT_SIZE + 5)).toBe(MAX_CODE_FONT_SIZE);
  });
});
