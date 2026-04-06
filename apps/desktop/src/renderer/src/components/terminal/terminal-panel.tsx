import "@xterm/xterm/css/xterm.css";

import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XTermTerminal, type ITheme } from "@xterm/xterm";
import { TerminalSquare, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button } from "@renderer/components/ui/button";
import { getErrorMessage } from "@renderer/lib/errors";
import { useUIStore } from "@renderer/stores/ui";
import type {
  TerminalDataPayload,
  TerminalExitPayload,
  TerminalSessionInfo,
} from "../../../../shared/contracts";

interface TerminalPanelProps {
  sessionId: string;
  cwd?: string;
}

const terminalThemeVariableMap = {
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

function readCssVariable(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function resolveTerminalTheme() {
  if (typeof document === "undefined") {
    return null;
  }

  return Object.fromEntries(
    Object.entries(terminalThemeVariableMap).map(([key, value]) => [key, readCssVariable(value)]),
  ) as ITheme;
}

export function TerminalPanel({ sessionId, cwd }: TerminalPanelProps) {
  const terminalHeight = useUIStore((state) => state.terminalHeight);
  const setTerminalHeight = useUIStore((state) => state.setTerminalHeight);
  const toggleTerminal = useUIStore((state) => state.toggleTerminal);
  const codeFontSize = useUIStore((state) => state.codeFontSize);
  const [sessionInfo, setSessionInfo] = useState<TerminalSessionInfo | null>(null);
  const [lastExitCode, setLastExitCode] = useState<number | null>(null);
  const [terminalTheme, setTerminalTheme] = useState<ITheme | null>(() => resolveTerminalTheme());
  const hostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<XTermTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
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
      setTerminalTheme(resolveTerminalTheme());
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
  }, []);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const terminal = new XTermTerminal({
      allowTransparency: true,
      cursorBlink: true,
      fontFamily: "'SF Mono', 'JetBrains Mono', ui-monospace, monospace",
      fontSize: codeFontSize,
      lineHeight: 1.35,
      scrollback: 6000,
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(hostRef.current);
    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    if (terminalTheme) {
      terminal.options.theme = terminalTheme;
    }

    const inputDisposable = terminal.onData((data) => {
      void window.desktopApp.writeTerminal(sessionId, data);
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });

    resizeObserver.observe(hostRef.current);
    fitAddon.fit();

    void window.desktopApp
      .createTerminalSession({
        sessionId,
        cwd,
      })
      .then((info) => {
        setSessionInfo(info);
        setLastExitCode(null);
        fitAddon.fit();
      })
      .catch((error) => {
        terminal.writeln(`\r\n[terminal bootstrap failed] ${getErrorMessage(error)}`);
      });

    return () => {
      resizeObserver.disconnect();
      inputDisposable.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      void window.desktopApp.closeTerminal(sessionId);
    };
  }, [cwd, sessionId]);

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
      className="relative z-10 shrink-0 border-t border-[var(--color-border)] bg-[var(--color-terminal-bg)] text-[var(--color-terminal-fg)]"
      style={{ height: terminalHeight }}
    >
      <div
        className="h-1 cursor-row-resize"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent, rgba(96,165,250,0.48), transparent)",
        }}
        onPointerDown={handleResizeStart}
      />

      <div className="flex h-[calc(100%-0.25rem)] flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-terminal-border)] px-3 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/6">
              <TerminalSquare className="h-4 w-4" />
            </div>
            <div>
              <div className="truncate text-sm font-medium">{shellLabel}</div>
              <div className="truncate text-xs text-[var(--color-terminal-muted)]">
                {cwd ?? sessionInfo?.cwd ?? "Home directory"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--color-terminal-muted)]">
            {lastExitCode !== null ? <span>exit {lastExitCode}</span> : null}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-[var(--color-terminal-muted)] hover:bg-white/6 hover:text-[var(--color-terminal-fg)]"
              aria-label="Hide terminal"
              onClick={toggleTerminal}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div ref={hostRef} className="min-h-0 flex-1 px-2 pt-1 pb-2" />
      </div>
    </section>
  );
}
