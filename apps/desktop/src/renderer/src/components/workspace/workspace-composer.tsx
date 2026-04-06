import { DropdownMenu } from "@radix-ui/themes";
import { ArrowUp, Brain, Check, Mic, MicOff, Plus, Zap } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";
import { useVoiceDictation } from "@renderer/hooks/use-voice-dictation";
import { Tooltip } from "@renderer/components/ui/tooltip";
import { cn } from "@renderer/lib/cn";
import { useUIStore } from "@renderer/stores/ui";
import type {
  DesktopProviderId,
  DesktopProviderSettingsSnapshot,
  ProviderModelCatalogEntry,
  ProviderReasoningEffort,
} from "../../../../shared/provider-settings";
import {
  getProviderCatalogEntry,
  getProviderModelCatalog,
  getSupportedProviderEffortLevels,
  normalizeProviderEffort,
  normalizeProviderModel,
} from "../../../../shared/provider-settings";

const INPUT_MAX_HEIGHT = 152;
const claudeLogoUrl = new URL(
  "../../../../../resources/provider-logos/claude.svg",
  import.meta.url,
).href;
const openAiLogoUrl = new URL(
  "../../../../../resources/provider-logos/open-ai.svg",
  import.meta.url,
).href;

const providerLabels: Record<DesktopProviderId, string> = {
  anthropic: "Claude",
  codex: "Codex",
};

const reasoningLabels: Record<ProviderReasoningEffort, string> = {
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "XHigh",
};

interface WorkspaceComposerProps {
  activeSessionTitle: string | null;
  hasActiveSession: boolean;
  hasWorktree: boolean;
}

function supportsProviderSettingsBridge() {
  return (
    typeof window !== "undefined" &&
    typeof window.desktopApp?.getProviderSettings === "function"
  );
}

function getProviderDefaults(
  snapshot: DesktopProviderSettingsSnapshot,
  providerId: DesktopProviderId,
) {
  if (providerId === "codex") {
    const model = normalizeProviderModel(
      providerId,
      snapshot.codex.defaultModel,
      snapshot.codexModels,
    );
    return {
      providerId,
      model,
      effort: normalizeProviderEffort(
        providerId,
        model,
        snapshot.codex.defaultReasoningEffort,
        snapshot.codexModels,
      ),
    };
  }

  const model = normalizeProviderModel(
    providerId,
    snapshot.anthropic.defaultModel,
    snapshot.codexModels,
  );
  return {
    providerId,
    model,
    effort: normalizeProviderEffort(
      providerId,
      model,
      snapshot.anthropic.defaultReasoningEffort,
      snapshot.codexModels,
    ),
  };
}

export function WorkspaceComposer({
  activeSessionTitle,
  hasActiveSession,
  hasWorktree,
}: WorkspaceComposerProps) {
  const [value, setValue] = useState("");
  const [providerSnapshot, setProviderSnapshot] =
    useState<DesktopProviderSettingsSnapshot | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hasDraft = value.trim().length > 0;
  const canSend = hasActiveSession && hasDraft;
  const canUseDictation = hasActiveSession;

  const composerControlsHydrated = useUIStore(
    (state) => state.composerControlsHydrated,
  );
  const composerProviderId = useUIStore((state) => state.composerProviderId);
  const composerModel = useUIStore((state) => state.composerModel);
  const composerEffort = useUIStore((state) => state.composerEffort);
  const hydrateComposerControls = useUIStore(
    (state) => state.hydrateComposerControls,
  );
  const setComposerProviderSelection = useUIStore(
    (state) => state.setComposerProviderSelection,
  );
  const setComposerModelSelection = useUIStore(
    (state) => state.setComposerModelSelection,
  );
  const setComposerEffortSelection = useUIStore(
    (state) => state.setComposerEffortSelection,
  );

  useEffect(() => {
    if (!supportsProviderSettingsBridge()) {
      return;
    }

    let cancelled = false;

    void window.desktopApp
      .getProviderSettings()
      .then((snapshot) => {
        if (cancelled) {
          return;
        }

        setProviderSnapshot(snapshot);
      })
      .catch(() => {
        if (!cancelled) {
          setProviderSnapshot(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!providerSnapshot || composerControlsHydrated) {
      return;
    }

    hydrateComposerControls(
      getProviderDefaults(providerSnapshot, providerSnapshot.activeProviderId),
    );
  }, [composerControlsHydrated, hydrateComposerControls, providerSnapshot]);

  const providerCatalog = useMemo(
    () =>
      getProviderModelCatalog(
        composerProviderId,
        providerSnapshot?.codexModels,
      ),
    [composerProviderId, providerSnapshot?.codexModels],
  );

  const selectedModelEntry = useMemo(
    () =>
      getProviderCatalogEntry(
        composerProviderId,
        composerModel,
        providerSnapshot?.codexModels,
      ),
    [composerModel, composerProviderId, providerSnapshot?.codexModels],
  );

  const supportedEffortLevels = useMemo(
    () =>
      getSupportedProviderEffortLevels(
        composerProviderId,
        composerModel,
        providerSnapshot?.codexModels,
      ),
    [composerModel, composerProviderId, providerSnapshot?.codexModels],
  );

  const providerButtonLabel = providerLabels[composerProviderId];
  const modelButtonLabel = selectedModelEntry?.label ?? composerModel;
  const effortSupported = supportedEffortLevels.length > 0;
  const effortButtonLabel = effortSupported
    ? reasoningLabels[composerEffort]
    : "N/A";

  const placeholder = !hasWorktree
    ? "先打开一个项目，再从左侧创建或选择线程"
    : !hasActiveSession
      ? "咨询 RWork 任何问题，@ 添加文件，/ 唤出命令，$ 唤出 Skills"
      : "描述下一步要做的事，Enter 发送，Shift+Enter 换行";

  const handleInput = () => {
    const element = textareaRef.current;
    if (!element) {
      return;
    }

    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, INPUT_MAX_HEIGHT)}px`;
  };

  const handleSend = () => {
    if (!canSend) {
      return;
    }

    toast.info("TODO：消息发送能力待接入");
  };

  const applyValue = (nextValue: string) => {
    setValue(nextValue);
    requestAnimationFrame(() => {
      handleInput();
    });
  };

  const {
    isSupported: supportsVoiceDictation,
    isListening,
    isPreparing: isPreparingDictation,
    isTranscribing: isTranscribingDictation,
    progress: dictationProgress,
    lastError: dictationError,
    retry: retryDictation,
    openModelsDirectory,
    toggle: toggleDictation,
  } = useVoiceDictation({
    enabled: canUseDictation,
    value,
    onChange: applyValue,
    onUnsupported: () => {
      toast.error("当前环境不支持本地语音听写。");
    },
    onError: (message) => {
      toast.error(message);
    },
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleProviderSelect = (providerId: DesktopProviderId) => {
    if (providerSnapshot) {
      setComposerProviderSelection(
        getProviderDefaults(providerSnapshot, providerId),
      );
      return;
    }

    const model = normalizeProviderModel(providerId, "");
    setComposerProviderSelection({
      providerId,
      model,
      effort: normalizeProviderEffort(providerId, model, composerEffort),
    });
  };

  const handleModelSelect = (entry: ProviderModelCatalogEntry) => {
    setComposerModelSelection(
      entry.id,
      normalizeProviderEffort(
        composerProviderId,
        entry.id,
        composerEffort,
        providerSnapshot?.codexModels,
      ),
    );
  };

  return (
    <div className="w-full max-w-[920px]">
      <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel)] p-2 backdrop-blur-xl">
        <div className="px-3 pt-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={!hasActiveSession}
            aria-label={activeSessionTitle ?? "Session composer"}
            className="max-h-[152px] min-h-[52px] w-full resize-none overflow-y-auto bg-transparent px-1 py-1 text-[length:var(--ui-font-size-lg)] leading-6 text-[var(--color-fg)] outline-none placeholder:text-[var(--color-muted)] disabled:cursor-not-allowed disabled:placeholder:text-[var(--color-muted)]"
          />
        </div>

        <div className="mt-1.5 flex items-end justify-between gap-3 px-2 pb-1">
          <div className="flex min-w-0 items-center gap-2">
            <Tooltip content="添加文件（TODO）">
              <button
                type="button"
                onClick={() => toast.info("TODO：附件能力待接入")}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted)] transition-colors duration-150 hover:bg-[var(--color-surface)] hover:text-[var(--color-fg)]"
                aria-label="添加文件（TODO）"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>

            <ComposerSelectMenu
              ariaLabel="选择供应商"
              label={providerButtonLabel}
              options={[
                {
                  value: "anthropic",
                  label: "Claude",
                  iconSrc: claudeLogoUrl,
                },
                {
                  value: "codex",
                  label: "Codex",
                  iconSrc: openAiLogoUrl,
                },
              ]}
              selectedValue={composerProviderId}
              triggerIconSrc={
                composerProviderId === "anthropic"
                  ? claudeLogoUrl
                  : openAiLogoUrl
              }
              onSelect={(value) =>
                handleProviderSelect(value as DesktopProviderId)
              }
            />

            <ComposerSelectMenu
              ariaLabel="选择模型"
              label={modelButtonLabel}
              triggerIcon={Zap}
              options={providerCatalog.map((entry) => ({
                value: entry.id,
                label: entry.label,
                description: entry.description,
              }))}
              selectedValue={selectedModelEntry?.id ?? composerModel}
              onSelect={(value) => {
                const entry = providerCatalog.find((item) => item.id === value);
                if (entry) {
                  handleModelSelect(entry);
                }
              }}
            />

            <ComposerSelectMenu
              ariaLabel="选择推理强度"
              label={effortButtonLabel}
              triggerIcon={Brain}
              disabled={!effortSupported}
              options={supportedEffortLevels.map((effort) => ({
                value: effort,
                label: reasoningLabels[effort],
              }))}
              selectedValue={composerEffort}
              onSelect={(value) =>
                setComposerEffortSelection(value as ProviderReasoningEffort)
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <Tooltip
              content={
                !canUseDictation
                  ? "选择线程后可使用语音输入"
                  : !supportsVoiceDictation
                    ? "当前环境不支持本地语音听写"
                    : dictationProgress?.message ??
                      (isListening
                        ? "结束听写（⌥Space）"
                        : "离线语音输入（⌥Space）")
              }
            >
              <button
                type="button"
                onClick={toggleDictation}
                disabled={
                  !canUseDictation ||
                  !supportsVoiceDictation ||
                  isPreparingDictation ||
                  isTranscribingDictation
                }
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-[background-color,color,box-shadow,transform] duration-200",
                  isListening
                    ? "bg-[rgba(239,68,68,0.12)] text-[#dc2626] shadow-[0_10px_22px_rgba(220,38,38,0.12)]"
                    : "bg-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-fg)]",
                  (!canUseDictation ||
                    !supportsVoiceDictation ||
                    isPreparingDictation ||
                    isTranscribingDictation) &&
                    "cursor-not-allowed opacity-60 hover:bg-[var(--color-surface)] hover:text-[var(--color-muted)]",
                )}
                aria-label={
                  isListening
                    ? "结束语音输入"
                    : isPreparingDictation
                      ? "正在准备语音输入"
                      : isTranscribingDictation
                        ? "正在转写语音输入"
                        : "开始语音输入"
                }
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Mic className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </Tooltip>

            <Tooltip
              content={
                canSend ? "发送消息（TODO）" : "输入内容并选择线程后可发送"
              }
            >
              <button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-[background-color,color,box-shadow,transform] duration-200",
                  canSend
                    ? "bg-[var(--color-fg)] text-[var(--color-bg)] shadow-[0_12px_24px_rgba(15,23,42,0.22)] hover:scale-[1.02]"
                    : "bg-[var(--color-surface)] text-[var(--color-muted)] shadow-none",
                )}
                aria-label={canSend ? "发送消息（TODO）" : "发送消息不可用"}
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
            </Tooltip>
          </div>
        </div>
        {dictationProgress && (isPreparingDictation || isTranscribingDictation) ? (
          <div className="px-3 pb-1 pt-1">
            <div className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
              <div className="flex items-center justify-between gap-3 text-[11px] text-[var(--color-muted)]">
                <span className="truncate">{dictationProgress.message}</span>
                {typeof dictationProgress.percent === "number" ? (
                  <span className="tabular-nums text-[var(--color-fg)]/70">
                    {Math.round(dictationProgress.percent)}%
                  </span>
                ) : null}
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]/80">
                <div
                  className="h-full rounded-full bg-[var(--color-fg)]/70 transition-[width] duration-200"
                  style={{
                    width:
                      typeof dictationProgress.percent === "number"
                        ? `${Math.max(6, Math.min(100, dictationProgress.percent))}%`
                        : "20%",
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}
        {dictationError && !isPreparingDictation && !isTranscribingDictation ? (
          <div className="px-3 pb-1 pt-1">
            <div className="flex flex-wrap items-center gap-2 rounded-[14px] border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.08)] px-3 py-2">
              <span className="min-w-0 flex-1 text-[11px] text-[var(--color-fg)]/78">
                {dictationError}
              </span>
              <button
                type="button"
                onClick={retryDictation}
                className="rounded-full bg-[var(--color-panel)] px-2.5 py-1 text-[11px] text-[var(--color-fg)]/85 transition-colors duration-150 hover:bg-[var(--color-surface-strong)]"
              >
                重试
              </button>
              <button
                type="button"
                onClick={() => {
                  void openModelsDirectory();
                }}
                className="rounded-full bg-[var(--color-panel)] px-2.5 py-1 text-[11px] text-[var(--color-fg)]/85 transition-colors duration-150 hover:bg-[var(--color-surface-strong)]"
              >
                打开模型目录
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ComposerSelectMenu({
  ariaLabel,
  label,
  options,
  selectedValue,
  disabled = false,
  triggerIconSrc,
  triggerIcon: TriggerIcon,
  onSelect,
}: {
  ariaLabel: string;
  label: string;
  options: Array<{
    value: string;
    label: string;
    description?: string;
    iconSrc?: string;
  }>;
  selectedValue: string;
  disabled?: boolean;
  triggerIconSrc?: string;
  triggerIcon?: typeof Zap;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasDescriptions = options.some((option) => Boolean(option.description));

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          onClick={(event) => {
            event.preventDefault();
            if (!disabled) {
              setOpen((current) => !current);
            }
          }}
          className={cn(
            "inline-flex h-8 min-w-0 max-w-[15rem] items-center gap-1 rounded-full px-2.5 text-[length:var(--ui-font-size-sm)] font-medium transition-colors duration-150",
            disabled
              ? "cursor-not-allowed text-[var(--color-muted)]"
              : "text-[var(--color-fg)]/80 hover:bg-[rgba(148,163,184,0.1)] hover:text-[var(--color-fg)]",
          )}
        >
          {triggerIconSrc ? (
            <img
              src={triggerIconSrc}
              alt=""
              className="h-4 w-4 shrink-0 rounded-sm object-contain"
              aria-hidden="true"
            />
          ) : null}
          {TriggerIcon ? (
            <TriggerIcon
              className="h-4 w-4 shrink-0 text-[var(--color-muted)]"
              aria-hidden="true"
            />
          ) : null}
          <span className="truncate">{label}</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content
        side="top"
        align="start"
        sideOffset={10}
        className="z-40 min-w-[220px] overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-2 shadow-[var(--shadow-panel)] outline-none"
      >
        <div className={cn(hasDescriptions ? "space-y-2.5" : "space-y-1")}>
          {options.map((option) => {
            const selected = option.value === selectedValue;
            return (
              <DropdownMenu.Item
                key={option.value}
                onSelect={() => {
                  setOpen(false);
                  onSelect(option.value);
                }}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-[12px] px-4 outline-none transition-colors duration-150 data-[highlighted]:!bg-[rgba(148,163,184,0.05)] data-[highlighted]:text-[var(--color-fg)]",
                  option.description ? "py-3.5" : "py-2.5",
                )}
                style={{
                  backgroundColor: selected
                    ? "rgba(148,163,184,0.16)"
                    : undefined,
                }}
              >
                {option.iconSrc ? (
                  <img
                    src={option.iconSrc}
                    alt=""
                    className="mt-1 h-4 w-4 shrink-0 rounded-sm object-contain"
                    aria-hidden="true"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium leading-5 text-[var(--color-fg)]">
                    {option.label}
                  </div>
                  {option.description ? (
                    <div className="pr-6 text-[11px] leading-4 text-[var(--color-muted)]">
                      {option.description}
                    </div>
                  ) : null}
                </div>
                <Check
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 text-[var(--color-fg)]/72",
                    selected ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden="true"
                />
              </DropdownMenu.Item>
            );
          })}
        </div>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
