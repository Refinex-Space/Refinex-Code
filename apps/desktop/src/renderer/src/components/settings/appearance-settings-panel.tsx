import {
  Code2,
  LayoutPanelLeft,
  Monitor,
  Moon,
  MousePointer2,
  PanelsTopLeft,
  SunMedium,
  Type,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { cn } from "@renderer/lib/cn";
import type {
  AppearanceColorMode,
  AppearanceColorPalette,
  ThemeMode,
} from "@renderer/stores/ui";
import { useUIStore } from "@renderer/stores/ui";

type ResolvedAppearance = "light" | "dark";

const themeOptions: Array<{
  value: ThemeMode;
  label: string;
  icon: typeof SunMedium;
}> = [
  { value: "light", label: "浅色", icon: SunMedium },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "系统", icon: Monitor },
];

function resolveSystemAppearance() {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return "dark" as ResolvedAppearance;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function AppearanceSettingsPanel() {
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const pointerCursorEnabled = useUIStore(
    (state) => state.pointerCursorEnabled,
  );
  const setPointerCursorEnabled = useUIStore(
    (state) => state.setPointerCursorEnabled,
  );
  const uiFontSize = useUIStore((state) => state.uiFontSize);
  const setUIFontSize = useUIStore((state) => state.setUIFontSize);
  const codeFontSize = useUIStore((state) => state.codeFontSize);
  const setCodeFontSize = useUIStore((state) => state.setCodeFontSize);
  const colors = useUIStore((state) => state.colors);
  const setSurfaceColor = useUIStore((state) => state.setSurfaceColor);
  const [systemAppearance, setSystemAppearance] = useState<ResolvedAppearance>(
    resolveSystemAppearance,
  );

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      setSystemAppearance(media.matches ? "dark" : "light");
    };

    handleChange();
    media.addEventListener("change", handleChange);
    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, []);

  const previewAppearance = theme === "system" ? systemAppearance : theme;

  return (
    <ScrollArea className="h-[calc(100vh-var(--titlebar-height))]">
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-6 pt-4 pb-10">
        <div className="space-y-1">
          <h1 className="text-[length:var(--ui-font-size-xl)] font-semibold tracking-[-0.03em] text-[var(--color-fg)]">
            Appearance
          </h1>
          <p className="text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
            控制主题、指针反馈与应用内的基础字号。
          </p>
        </div>

        <section className="overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel)]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5">
            <div className="space-y-1">
              <div className="text-[length:var(--ui-font-size-md)] font-semibold text-[var(--color-fg)]">
                主题
              </div>
              <div className="text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
                使用浅色、深色，或跟随系统设置。
              </div>
            </div>

            <div
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
              role="group"
              aria-label="主题切换"
            >
              {themeOptions.map(({ value, label, icon: Icon }) => {
                const active = theme === value;

                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    aria-label={label}
                    onClick={() => setTheme(value)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-2 text-[length:var(--ui-font-size-sm)] font-medium transition-colors duration-150",
                      active
                        ? "bg-[var(--color-panel)] text-[var(--color-fg)] shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                        : "text-[var(--color-muted)] hover:text-[var(--color-fg)]",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-0 py-0">
            <ThemePreviewCard
              theme={theme}
              previewAppearance={previewAppearance}
            />
          </div>

          <SettingRow
            icon={LayoutPanelLeft}
            label="侧边栏背景色"
            description="分别设置浅色和深色模式下的侧边栏背景色。"
            control={
              <ColorControlGroup
                label="侧边栏背景色"
                surface="sidebarBackground"
                colors={colors}
                onChange={(mode, color) =>
                  setSurfaceColor(mode, "sidebarBackground", color)
                }
              />
            }
          />

          <SettingRow
            icon={PanelsTopLeft}
            label="右侧主面板背景色"
            description="分别设置浅色和深色模式下主工作区的背景色。"
            control={
              <ColorControlGroup
                label="右侧主面板背景色"
                surface="panelBackground"
                colors={colors}
                onChange={(mode, color) =>
                  setSurfaceColor(mode, "panelBackground", color)
                }
              />
            }
          />

          <SettingRow
            icon={MousePointer2}
            label="使用指针光标"
            description="悬停交互元素时切换为指针光标。"
            control={
              <SwitchControl
                label="使用指针光标"
                checked={pointerCursorEnabled}
                onCheckedChange={setPointerCursorEnabled}
              />
            }
          />

          <SettingRow
            icon={Type}
            label="UI 字体大小"
            description="调整 RWork UI 使用的基准尺寸。"
            control={
              <NumberControl
                label="UI 字体大小"
                value={uiFontSize}
                min={11}
                max={17}
                onChange={setUIFontSize}
              />
            }
          />

          <SettingRow
            icon={Code2}
            label="代码字体大小"
            description="调整聊天记录和差异分析中代码使用的基本大小。"
            control={
              <NumberControl
                label="代码字体大小"
                value={codeFontSize}
                min={10}
                max={16}
                onChange={setCodeFontSize}
              />
            }
          />
        </section>
      </div>
    </ScrollArea>
  );
}

interface ThemePreviewCardProps {
  theme: ThemeMode;
  previewAppearance: ResolvedAppearance;
}

function ThemePreviewCard({ theme, previewAppearance }: ThemePreviewCardProps) {
  const palette =
    previewAppearance === "dark"
      ? {
          shell: "bg-[#0d0f14] text-[#f8fafc] border-[#2a2f39]",
          surface: "bg-[#000000]",
          code: "bg-[#000000]",
          deleted: "bg-[rgba(255,109,109,0.16)] text-[#fca5a5]",
          added: "bg-[rgba(34,197,94,0.16)] text-[#86efac]",
          chromeBorder: "border-[#2a2f39]",
          paneBorder: "border-[#313744]",
          dividerBorder: "border-[#232833]",
          line: "text-[#8b93a7]",
          key: "text-[#c084fc]",
          value: "text-[#38bdf8]",
          string: "text-[#4ade80]",
          accent: "#0ea5e9",
          contrast: 68,
          surfaceLabel: "sidebar-elevated",
        }
      : {
          shell: "bg-[#fbfbfc] text-[#0f172a] border-[#d8dee8]",
          surface: "bg-[#ffffff]",
          code: "bg-[#ffffff]",
          deleted: "bg-[rgba(239,68,68,0.12)] text-[#dc2626]",
          added: "bg-[rgba(34,197,94,0.12)] text-[#16a34a]",
          chromeBorder: "border-[#d8dee8]",
          paneBorder: "border-[#e6eaf0]",
          dividerBorder: "border-[#e7ebf1]",
          line: "text-[#7c8597]",
          key: "text-[#7c3aed]",
          value: "text-[#2563eb]",
          string: "text-[#16a34a]",
          accent: "#2563eb",
          contrast: 42,
          surfaceLabel: "sidebar",
        };

  return (
    <div
      className={cn(
        "overflow-hidden transition-colors duration-200",
        palette.shell,
      )}
    >
      <div className={cn("overflow-hidden p-3", palette.surface)}>
        <div
          className={cn(
            "overflow-hidden rounded-[12px] border p-3",
            palette.code,
            palette.chromeBorder,
          )}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--code-font-size-md)",
          }}
        >
          <div
            className={cn(
              "flex items-center justify-between gap-4 border-b pb-3 text-[length:var(--ui-font-size-sm)] font-sans text-current/60",
              palette.dividerBorder,
            )}
          >
            <div>const themePreview: ThemeConfig</div>
            <div>
              {theme === "system" ? "系统" : theme === "dark" ? "深色" : "浅色"}
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <CodePane
              title="before"
              borderClassName={palette.paneBorder}
              dividerClassName={palette.dividerBorder}
              lineColor={palette.line}
              highlightClass={palette.deleted}
              keyColor={palette.key}
              valueColor={palette.value}
              stringColor={palette.string}
              surfaceLabel="sidebar"
              accent="#2563eb"
              contrast={42}
            />
            <CodePane
              title="after"
              borderClassName={palette.paneBorder}
              dividerClassName={palette.dividerBorder}
              lineColor={palette.line}
              highlightClass={palette.added}
              keyColor={palette.key}
              valueColor={palette.value}
              stringColor={palette.string}
              surfaceLabel={palette.surfaceLabel}
              accent={palette.accent}
              contrast={palette.contrast}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface CodePaneProps {
  borderClassName: string;
  dividerClassName: string;
  title: string;
  lineColor: string;
  highlightClass: string;
  keyColor: string;
  valueColor: string;
  stringColor: string;
  surfaceLabel: string;
  accent: string;
  contrast: number;
}

function CodePane({
  borderClassName,
  dividerClassName,
  title,
  lineColor,
  highlightClass,
  keyColor,
  valueColor,
  stringColor,
  surfaceLabel,
  accent,
  contrast,
}: CodePaneProps) {
  const previewRows: Array<[line: string, content: ReactNode]> = [
    [
      "1",
      <>
        <span className={keyColor}>const</span>{" "}
        <span className="text-[#f97316]">themePreview</span>:{" "}
        <span className={valueColor}>ThemeConfig</span> = {"{"}
      </>,
    ],
    [
      "2",
      <>
        <span className="pl-5 text-[#f97316]">surface</span>:{" "}
        <span className={stringColor}>"{surfaceLabel}"</span>,
      </>,
    ],
    [
      "3",
      <>
        <span className="pl-5 text-[#f97316]">accent</span>:{" "}
        <span className={stringColor}>"{accent}"</span>,
      </>,
    ],
    [
      "4",
      <>
        <span className="pl-5 text-[#f97316]">contrast</span>:{" "}
        <span className={valueColor}>{contrast}</span>,
      </>,
    ],
    ["5", <>{"};"}</>],
  ];

  return (
    <div
      className={cn("overflow-hidden rounded-[18px] border", borderClassName)}
    >
      <div
        className={cn(
          "border-b px-3 py-2 text-[length:var(--ui-font-size-2xs)] font-sans uppercase tracking-[0.14em] text-current/50",
          dividerClassName,
        )}
      >
        {title}
      </div>

      {previewRows.map(([line, content]) => (
        <div
          key={line}
          className={cn(
            "grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 px-3 py-1.5",
            line === "5" ? "bg-transparent" : highlightClass,
          )}
        >
          <span
            className={cn(
              "text-right text-[length:var(--code-font-size-xs)]",
              lineColor,
            )}
          >
            {line}
          </span>
          <span className="truncate">{content}</span>
        </div>
      ))}
    </div>
  );
}

interface SettingRowProps {
  icon: typeof MousePointer2;
  label: string;
  description: string;
  control: ReactNode;
}

function SettingRow({
  icon: Icon,
  label,
  description,
  control,
}: SettingRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4 last:border-b-0">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface)] text-[var(--color-muted)]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="text-[length:var(--ui-font-size-md)] font-medium text-[var(--color-fg)]">
            {label}
          </div>
          <div className="mt-1 text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
            {description}
          </div>
        </div>
      </div>

      <div className="ml-auto shrink-0">{control}</div>
    </div>
  );
}

interface SwitchControlProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function SwitchControl({
  label,
  checked,
  onCheckedChange,
}: SwitchControlProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-8 w-14 items-center rounded-full border transition-colors duration-150",
        checked
          ? "border-[var(--color-accent)] bg-[var(--color-accent)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)]",
      )}
    >
      <span
        className={cn(
          "inline-block h-6 w-6 rounded-full bg-white shadow-[0_4px_14px_rgba(15,23,42,0.22)] transition-transform duration-150",
          checked ? "translate-x-7" : "translate-x-1",
        )}
      />
    </button>
  );
}

interface NumberControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function NumberControl({
  label,
  value,
  min,
  max,
  onChange,
}: NumberControlProps) {
  return (
    <label className="inline-flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
      <input
        type="number"
        min={min}
        max={max}
        step={1}
        value={value}
        aria-label={label}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          if (Number.isNaN(nextValue)) {
            return;
          }

          onChange(nextValue);
        }}
        className="w-14 border-0 bg-transparent text-right text-[length:var(--ui-font-size-md)] font-semibold text-[var(--color-fg)] outline-none"
      />
      <span className="text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
        px
      </span>
    </label>
  );
}

interface ColorControlGroupProps {
  label: string;
  surface: keyof AppearanceColorPalette;
  colors: Record<AppearanceColorMode, AppearanceColorPalette>;
  onChange: (mode: AppearanceColorMode, color: string) => void;
}

function ColorControlGroup({
  label,
  surface,
  colors,
  onChange,
}: ColorControlGroupProps) {
  return (
    <div className="flex items-center gap-2">
      <ColorPickerControl
        label={`${label}（浅色）`}
        modeLabel="浅色"
        value={colors.light[surface]}
        onChange={(color) => onChange("light", color)}
      />
      <ColorPickerControl
        label={`${label}（深色）`}
        modeLabel="深色"
        value={colors.dark[surface]}
        onChange={(color) => onChange("dark", color)}
      />
    </div>
  );
}

interface ColorPickerControlProps {
  label: string;
  modeLabel: string;
  value: string;
  onChange: (color: string) => void;
}

function ColorPickerControl({
  label,
  modeLabel,
  value,
  onChange,
}: ColorPickerControlProps) {
  return (
    <label className="relative inline-flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2">
      <input
        type="color"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-8 cursor-pointer appearance-none overflow-hidden rounded-xl border border-[var(--color-border)] bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-[11px] [&::-webkit-color-swatch]:border-0"
      />
      <span className="flex flex-col text-left">
        <span className="text-[length:var(--ui-font-size-2xs)] font-medium text-[var(--color-muted)]">
          {modeLabel}
        </span>
        <span className="font-mono text-[length:var(--code-font-size-xs)] text-[var(--color-fg)]">
          {value.toUpperCase()}
        </span>
      </span>
    </label>
  );
}
