import "@xterm/xterm/css/xterm.css";

import { FitAddon } from "@xterm/addon-fit";
import * as xtermRuntime from "@xterm/xterm";
import type { ITheme } from "@xterm/xterm";
import { TerminalSquare, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@renderer/components/ui/button";
import { getErrorMessage } from "@renderer/lib/errors";
import { useUIStore } from "@renderer/stores/ui";
import type {
  TerminalDataPayload,
  TerminalExitPayload,
  TerminalSessionProfile,
  TerminalSessionInfo,
} from "../../../../shared/contracts";

function resolveXTermTerminal(): typeof import("@xterm/xterm").Terminal {
  const runtimeExports = xtermRuntime as {
    Terminal?: typeof import("@xterm/xterm").Terminal;
    default?: {
      Terminal?: typeof import("@xterm/xterm").Terminal;
    };
  };
  const candidate =
    runtimeExports.Terminal ??
    runtimeExports.default?.Terminal ??
    null;

  if (!candidate) {
    throw new Error("xterm Terminal 构造器不可用。");
  }

  return candidate;
}

const XTermTerminal = resolveXTermTerminal();

interface TerminalPanelProps {
  sessionId: string;
  cwd?: string;
  profile?: TerminalSessionProfile;
  chrome?: "docked" | "embedded";
  persistOnUnmount?: boolean;
  title?: string | null;
  subtitle?: string | null;
  showCloseButton?: boolean;
}

const dockedTerminalThemeVariableMap = {
  background: "--color-terminal-bg",
  foreground: "--color-terminal-fg",
  cursor: "--color-terminal-cursor",
  cursorAccent: "--color-terminal-bg",
  black: "--color-terminal-ansi-black",
  red: "--color-terminal-ansi-red",
  green: "--color-terminal-ansi-green",
  yellow: "--color-terminal-ansi-yellow",
  blue: "--color-terminal-ansi-blue",
  magenta: "--color-terminal-ansi-magenta",
  cyan: "--color-terminal-ansi-cyan",
  white: "--color-terminal-ansi-white",
  brightBlack: "--color-terminal-ansi-bright-black",
  brightRed: "--color-terminal-ansi-bright-red",
  brightGreen: "--color-terminal-ansi-bright-green",
  brightYellow: "--color-terminal-ansi-bright-yellow",
  brightBlue: "--color-terminal-ansi-bright-blue",
  brightMagenta: "--color-terminal-ansi-bright-magenta",
  brightCyan: "--color-terminal-ansi-bright-cyan",
  brightWhite: "--color-terminal-ansi-bright-white",
} as const;

const embeddedTerminalThemeVariableMap = {
  background: "--color-terminal-embedded-bg",
  foreground: "--color-terminal-embedded-fg",
  cursor: "--color-terminal-embedded-cursor",
  cursorAccent: "--color-terminal-embedded-cursor-accent",
  selectionBackground: "--color-terminal-embedded-selection",
  selectionInactiveBackground: "--color-terminal-embedded-selection-inactive",
  black: "--color-terminal-embedded-ansi-black",
  red: "--color-terminal-embedded-ansi-red",
  green: "--color-terminal-embedded-ansi-green",
  yellow: "--color-terminal-embedded-ansi-yellow",
  blue: "--color-terminal-embedded-ansi-blue",
  magenta: "--color-terminal-embedded-ansi-magenta",
  cyan: "--color-terminal-embedded-ansi-cyan",
  white: "--color-terminal-embedded-ansi-white",
  brightBlack: "--color-terminal-embedded-ansi-bright-black",
  brightRed: "--color-terminal-embedded-ansi-bright-red",
  brightGreen: "--color-terminal-embedded-ansi-bright-green",
  brightYellow: "--color-terminal-embedded-ansi-bright-yellow",
  brightBlue: "--color-terminal-embedded-ansi-bright-blue",
  brightMagenta: "--color-terminal-embedded-ansi-bright-magenta",
  brightCyan: "--color-terminal-embedded-ansi-bright-cyan",
  brightWhite: "--color-terminal-embedded-ansi-bright-white",
} as const;

function readCssVariable(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function parseHexColor(color: string) {
  const normalized = color.trim().replace("#", "");

  if (!/^[\da-f]{6}$/i.test(normalized)) {
    return null;
  }

  return [0, 2, 4].map((offset) =>
    Number.parseInt(normalized.slice(offset, offset + 2), 16),
  ) as [number, number, number];
}

function formatHexColor([red, green, blue]: [number, number, number]) {
  return `#${[red, green, blue]
    .map((value) =>
      Math.round(Math.max(0, Math.min(255, value)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function srgbChannelToLinear(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(color: string) {
  const rgb = parseHexColor(color);

  if (!rgb) {
    return null;
  }

  const [red, green, blue] = rgb.map(srgbChannelToLinear);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function blendHexColors(baseColor: string, mixColor: string, factor: number) {
  const base = parseHexColor(baseColor);
  const mix = parseHexColor(mixColor);

  if (!base || !mix) {
    return baseColor;
  }

  return formatHexColor(
    base.map((value, index) => value * (1 - factor) + mix[index] * factor) as [
      number,
      number,
      number,
    ],
  );
}

function buildDefaultExtendedAnsiPalette() {
  const cubeSteps = [0, 95, 135, 175, 215, 255];
  const palette: string[] = [];

  for (let index = 16; index <= 231; index += 1) {
    const cubeIndex = index - 16;
    const red = cubeSteps[Math.floor(cubeIndex / 36) % 6] ?? 0;
    const green = cubeSteps[Math.floor(cubeIndex / 6) % 6] ?? 0;
    const blue = cubeSteps[cubeIndex % 6] ?? 0;
    palette.push(formatHexColor([red, green, blue]));
  }

  for (let index = 232; index <= 255; index += 1) {
    const gray = 8 + (index - 232) * 10;
    palette.push(formatHexColor([gray, gray, gray]));
  }

  return palette;
}

function buildReadableLightExtendedAnsiPalette(foreground: string) {
  const maxLuminance = 0.2;

  return buildDefaultExtendedAnsiPalette().map((color) => {
    const luminance = getRelativeLuminance(color);

    if (luminance === null || luminance <= maxLuminance) {
      return color;
    }

    let lowerBound = 0;
    let upperBound = 1;

    for (let iteration = 0; iteration < 24; iteration += 1) {
      const factor = (lowerBound + upperBound) / 2;
      const candidate = blendHexColors(color, foreground, factor);
      const candidateLuminance = getRelativeLuminance(candidate);

      if (candidateLuminance === null) {
        return color;
      }

      if (candidateLuminance > maxLuminance) {
        lowerBound = factor;
      } else {
        upperBound = factor;
      }
    }

    return blendHexColors(color, foreground, upperBound);
  });
}

function isDarkThemeActive() {
  if (typeof document === "undefined") {
    return false;
  }

  const explicitTheme = document.documentElement.getAttribute("data-theme");

  if (explicitTheme === "dark") {
    return true;
  }

  if (explicitTheme === "light") {
    return false;
  }

  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function resolveTerminalTheme(chrome: "docked" | "embedded") {
  if (typeof document === "undefined") {
    return null;
  }

  const themeVariableMap =
    chrome === "embedded"
      ? embeddedTerminalThemeVariableMap
      : dockedTerminalThemeVariableMap;

  const theme = Object.fromEntries(
    Object.entries(themeVariableMap).map(([key, value]) => [key, readCssVariable(value)]),
  ) as ITheme;

  if (chrome === "embedded" && !isDarkThemeActive()) {
    theme.extendedAnsi = buildReadableLightExtendedAnsiPalette(
      theme.foreground ?? readCssVariable("--color-terminal-embedded-fg"),
    );
  }

  return theme;
}

export function TerminalPanel({
  sessionId,
  cwd,
  profile = "shell",
  chrome = "docked",
  persistOnUnmount = false,
  title = null,
  subtitle = null,
  showCloseButton = chrome === "docked",
}: TerminalPanelProps) {
  const terminalHeight = useUIStore((state) => state.terminalHeight);
  const setTerminalHeight = useUIStore((state) => state.setTerminalHeight);
  const toggleTerminal = useUIStore((state) => state.toggleTerminal);
  const codeFontSize = useUIStore((state) => state.codeFontSize);
  const [sessionInfo, setSessionInfo] = useState<TerminalSessionInfo | null>(null);
  const [lastExitCode, setLastExitCode] = useState<number | null>(null);
  const [terminalTheme, setTerminalTheme] = useState<ITheme | null>(() => resolveTerminalTheme(chrome));
  const hostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<InstanceType<typeof XTermTerminal> | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalThemeRef = useRef<ITheme | null>(terminalTheme);
  const codeFontSizeRef = useRef(codeFontSize);
  const backendInputEnabled = profile === "shell" || profile === "thread-tui";
  const autoFocusEnabled = profile === "shell";
  const focusTimeoutRef = useRef<number | null>(null);
  const focusTerminal = useEffectEvent(() => {
    if (!autoFocusEnabled) {
      return;
    }

    terminalRef.current?.focus();
  });
  const onTerminalData = useEffectEvent((payload: TerminalDataPayload) => {
    if (payload.sessionId !== sessionId) {
      return;
    }

    terminalRef.current?.write(payload.chunk);
  });
  const onTerminalExit = useEffectEvent((payload: TerminalExitPayload) => {
    if (payload.sessionId !== sessionId) {
      return;
    }

    setLastExitCode(payload.exitCode);
    terminalRef.current?.writeln(
      `\r\n[shell exited${payload.exitCode === null ? "" : `, code ${payload.exitCode}`}]`,
    );
  });

  useEffect(() => {
    return window.desktopApp.onTerminalData(onTerminalData);
  }, [onTerminalData]);

  useEffect(() => {
    return window.desktopApp.onTerminalExit(onTerminalExit);
  }, [onTerminalExit]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleThemeChange = () => {
      setTerminalTheme(resolveTerminalTheme(chrome));
    };
    const observer = new MutationObserver(() => {
      handleThemeChange();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    media.addEventListener("change", handleThemeChange);

    return () => {
      observer.disconnect();
      media.removeEventListener("change", handleThemeChange);
    };
  }, [chrome]);

  useEffect(() => {
    terminalThemeRef.current = terminalTheme;
  }, [terminalTheme]);

  useEffect(() => {
    codeFontSizeRef.current = codeFontSize;
  }, [codeFontSize]);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const terminal = new XTermTerminal({
      allowTransparency: true,
      cursorBlink: true,
      disableStdin: !backendInputEnabled,
      fontFamily: "'SF Mono', 'JetBrains Mono', ui-monospace, monospace",
      fontSize: codeFontSizeRef.current,
      lineHeight: 1.35,
      scrollback: 6000,
      theme: terminalThemeRef.current ?? undefined,
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(hostRef.current);
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    if (terminalThemeRef.current) {
      terminal.options.theme = terminalThemeRef.current;
    }

    const inputDisposable = backendInputEnabled
      ? terminal.onData((data) => {
          void window.desktopApp.writeTerminal(sessionId, data);
        })
      : {
          dispose() {},
        };

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });

    resizeObserver.observe(hostRef.current);
    fitAddon.fit();
    focusTerminal();

    void window.desktopApp
      .createTerminalSession({
        sessionId,
        cwd,
        profile,
      })
      .then((info) => {
        setSessionInfo(info);
        setLastExitCode(null);
        if (!info.created && info.backlog) {
          terminal.write(info.backlog);
        }
        fitAddon.fit();
        focusTerminal();
        focusTimeoutRef.current = window.setTimeout(() => {
          fitAddon.fit();
          focusTerminal();
          focusTimeoutRef.current = null;
        }, 60);
      })
      .catch((error) => {
        terminal.writeln(`\r\n[terminal bootstrap failed] ${getErrorMessage(error)}`);
      });

    return () => {
      resizeObserver.disconnect();
      if (focusTimeoutRef.current !== null) {
        window.clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
      inputDisposable.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      if (!persistOnUnmount) {
        void window.desktopApp.closeTerminal(sessionId);
      }
    };
  }, [autoFocusEnabled, backendInputEnabled, cwd, persistOnUnmount, profile, sessionId, terminalThemeRef, codeFontSizeRef]);

  useEffect(() => {
    if (!terminalRef.current || !terminalTheme) {
      return;
    }

    terminalRef.current.options.theme = terminalTheme;
  }, [terminalTheme]);

  useEffect(() => {
    if (!terminalRef.current) {
      return;
    }

    terminalRef.current.options.fontSize = codeFontSize;
    fitAddonRef.current?.fit();
  }, [codeFontSize]);

  const shellLabel =
    sessionInfo?.shellPath.split("/").filter(Boolean).at(-1) ?? "shell";
  const resolvedTitle = title ?? shellLabel;
  const resolvedSubtitle =
    subtitle ?? cwd ?? sessionInfo?.cwd ?? "Home directory";
  const embedded = chrome === "embedded";

  const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();

    const startY = event.clientY;
    const startHeight = terminalHeight;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = startY - moveEvent.clientY;
      setTerminalHeight(startHeight + delta);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <section
      className={
        embedded
          ? "relative flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent text-[var(--color-fg)]"
          : "relative z-10 shrink-0 border-t border-[var(--color-border)] bg-[var(--color-terminal-bg)] text-[var(--color-terminal-fg)]"
      }
      style={embedded ? undefined : { height: terminalHeight }}
      data-terminal-chrome={chrome}
    >
      {embedded ? null : (
        <div
          className="h-1 cursor-row-resize"
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent, rgba(96,165,250,0.48), transparent)",
          }}
          onPointerDown={handleResizeStart}
        />
      )}

      <div
        className={
          embedded
            ? "flex min-h-0 flex-1 flex-col"
            : "flex h-[calc(100%-0.25rem)] flex-col"
        }
      >
        {embedded ? null : (
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-terminal-border)] px-3 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/6">
                <TerminalSquare className="h-4 w-4" />
              </div>
              <div>
                <div className="truncate text-sm font-medium">{resolvedTitle}</div>
                <div className="truncate text-xs text-[var(--color-terminal-muted)]">
                  {resolvedSubtitle}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--color-terminal-muted)]">
              {lastExitCode !== null ? <span>exit {lastExitCode}</span> : null}
              {showCloseButton ? (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-[var(--color-terminal-muted)] hover:bg-white/6 hover:text-[var(--color-terminal-fg)]"
                  aria-label="Hide terminal"
                  onClick={toggleTerminal}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        )}

        <div
          ref={hostRef}
          data-no-drag
          className={
            embedded
              ? "min-h-[320px] flex-1 px-0 py-0"
              : "min-h-0 flex-1 px-2 pt-1 pb-2"
          }
          onPointerDown={() => {
            focusTerminal();
          }}
        />
      </div>
    </section>
  );
}
