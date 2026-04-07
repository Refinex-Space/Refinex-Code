export function getThreadTuiEnvOverrides() {
  return {
    CLAUDE_CODE_ENTRYPOINT: "desktop-thread-tui",
    CLAUDE_CODE_HIDE_PROMPT_UI: "1",
  } as const;
}
