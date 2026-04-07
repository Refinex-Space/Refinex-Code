import { describe, expect, it } from "vitest";
import { getThreadTuiEnvOverrides } from "./thread-tui-env";

describe("getThreadTuiEnvOverrides", () => {
  it("只覆盖桌面 thread-tui 所需的入口变量", () => {
    expect(getThreadTuiEnvOverrides()).toEqual({
      CLAUDE_CODE_ENTRYPOINT: "desktop-thread-tui",
      CLAUDE_CODE_HIDE_PROMPT_UI: "1",
    });
  });
});
