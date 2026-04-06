import { describe, expect, it } from "vitest";
import {
  clampSidebarWidth,
  MAX_SIDEBAR_WIDTH,
  MIN_MAIN_PANEL_WIDTH,
  MIN_SIDEBAR_WIDTH,
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
});
