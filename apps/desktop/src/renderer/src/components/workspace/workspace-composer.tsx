import { DropdownMenu } from "@radix-ui/themes";
import {
  ArrowUp,
  Brain,
  Check,
  Mic,
  MicOff,
  Package,
  Plus,
  Zap,
} from "lucide-react";
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
import { getErrorMessage } from "@renderer/lib/errors";
import { type ThreadConversationMode, useUIStore } from "@renderer/stores/ui";
import type { SkillRecord, SkillSnapshot } from "../../../../shared/contracts";
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
const SKILL_SUGGESTIONS_LIST_ID = "workspace-composer-skill-suggestions";
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
  activeSessionId: string | null;
  activeWorktreePath: string | null;
  conversationMode: ThreadConversationMode;
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

interface SlashSkillSuggestion {
  id: string;
  label: string;
  description: string;
  commandName: string;
  insertValue: string;
}

function shouldShowSlashSkillSuggestions(value: string) {
  return value.startsWith("/") && !value.includes(" ");
}

function formatSkillSuggestionLabel(skill: SkillRecord) {
  const rawLabel =
    skill.displayName || skill.name.split(":").at(-1) || skill.name;

  return rawLabel
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildSlashSkillSuggestions(
  value: string,
  snapshot: SkillSnapshot | null,
): SlashSkillSuggestion[] {
  if (!snapshot || !shouldShowSlashSkillSuggestions(value)) {
    return [];
  }

  const query = value.slice(1).trim().toLowerCase();
  const invocableSkills = snapshot.skills.filter((skill) => skill.userInvocable);

  if (query.length === 0) {
    return invocableSkills.map((skill) => ({
      id: skill.id,
      label: formatSkillSuggestionLabel(skill),
      description: skill.description.replace(/\s+/g, " ").trim(),
      commandName: skill.name,
      insertValue: `/${skill.name} `,
    }));
  }

  return invocableSkills
    .map((skill, index) => {
      const displayName = (skill.displayName || skill.name).toLowerCase();
      const normalizedName = skill.name.toLowerCase();
      const description = skill.description.toLowerCase().replace(/\s+/g, " ");
      const parts = [...new Set([
        ...normalizedName.split(/[:_-]/g),
        ...displayName.split(/[:_-]/g),
      ])].filter(Boolean);

      let score = Number.POSITIVE_INFINITY;

      if (normalizedName === query || displayName === query) {
        score = 0;
      } else if (normalizedName.startsWith(query)) {
        score = 1;
      } else if (displayName.startsWith(query)) {
        score = 2;
      } else if (parts.some((part) => part.startsWith(query))) {
        score = 3;
      } else if (
        normalizedName.includes(query) ||
        displayName.includes(query)
      ) {
        score = 4;
      } else if (description.includes(query)) {
        score = 5;
      }

      if (!Number.isFinite(score)) {
        return null;
      }

      return {
        index,
        score,
        suggestion: {
          id: skill.id,
          label: formatSkillSuggestionLabel(skill),
          description: skill.description.replace(/\s+/g, " ").trim(),
          commandName: skill.name,
          insertValue: `/${skill.name} `,
        },
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        index: number;
        score: number;
        suggestion: SlashSkillSuggestion;
      } => entry !== null,
    )
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      return left.index - right.index;
    })
    .map((entry) => entry.suggestion);
}

export function WorkspaceComposer({
  activeSessionTitle,
  activeSessionId,
  activeWorktreePath,
  conversationMode,
  hasActiveSession,
  hasWorktree,
}: WorkspaceComposerProps) {
  const [value, setValue] = useState("");
  const [providerSnapshot, setProviderSnapshot] =
    useState<DesktopProviderSettingsSnapshot | null>(null);
  const [skillSnapshot, setSkillSnapshot] = useState<SkillSnapshot | null>(null);
  const [selectedSkillPills, setSelectedSkillPills] = useState<
    SlashSkillSuggestion[]
  >([]);
  const [selectedSkillSuggestionIndex, setSelectedSkillSuggestionIndex] =
    useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const skillSuggestionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const composerValue = `${selectedSkillPills.map((skill) => skill.insertValue).join("")}${value}`;
  const hasDraft = composerValue.trim().length > 0;
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
    let cancelled = false;

    void window.desktopApp
      .getSkillsSnapshot()
      .then((snapshot) => {
        if (!cancelled) {
          setSkillSnapshot(snapshot);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSkillSnapshot(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeWorktreePath]);

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
  const skillSuggestions = useMemo(
    () => buildSlashSkillSuggestions(value, skillSnapshot),
    [skillSnapshot, value],
  );
  const showSkillSuggestions = hasActiveSession && skillSuggestions.length > 0;

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

  const handleSend = async () => {
    if (!canSend) {
      return;
    }

    if (conversationMode === "gui") {
      toast.info("GUI 模式敬请期待，先使用 TUI 专注模式。");
      return;
    }

    if (!activeSessionId) {
      return;
    }

    const terminalSessionId = `thread-tui:${activeSessionId}`;
    const normalizedInput = `${composerValue.replace(/\r?\n/g, "\r")}\r`;

    try {
      await window.desktopApp.createTerminalSession({
        sessionId: terminalSessionId,
        cwd: activeWorktreePath ?? undefined,
        profile: "thread-tui",
      });
      await window.desktopApp.writeTerminal(terminalSessionId, normalizedInput);
      setSelectedSkillPills([]);
      applyValue("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const applyValue = (nextValue: string) => {
    setValue(nextValue);
    requestAnimationFrame(() => {
      handleInput();
    });
  };

  const applySkillSuggestion = (suggestion: SlashSkillSuggestion) => {
    setSelectedSkillPills((current) => [...current, suggestion]);
    setSelectedSkillSuggestionIndex(0);
    applyValue("");
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(0, 0);
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

  useEffect(() => {
    if (!showSkillSuggestions) {
      setSelectedSkillSuggestionIndex(0);
      return;
    }

    setSelectedSkillSuggestionIndex((current) => {
      if (current >= skillSuggestions.length) {
        return 0;
      }

      return current;
    });
  }, [showSkillSuggestions, skillSuggestions.length, value]);

  useEffect(() => {
    if (!showSkillSuggestions) {
      skillSuggestionRefs.current = [];
      return;
    }

    const activeSuggestion = skillSuggestionRefs.current[selectedSkillSuggestionIndex];
    if (typeof activeSuggestion?.scrollIntoView === "function") {
      activeSuggestion.scrollIntoView({
        block: "nearest",
      });
    }
  }, [selectedSkillSuggestionIndex, showSkillSuggestions]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      selectedSkillPills.length > 0 &&
      value.length === 0 &&
      (event.key === "Backspace" || event.key === "Delete")
    ) {
      event.preventDefault();
      setSelectedSkillPills((current) => current.slice(0, -1));
      return;
    }

    if (showSkillSuggestions && event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedSkillSuggestionIndex((current) =>
        current >= skillSuggestions.length - 1 ? 0 : current + 1,
      );
      return;
    }

    if (showSkillSuggestions && event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedSkillSuggestionIndex((current) =>
        current <= 0 ? skillSuggestions.length - 1 : current - 1,
      );
      return;
    }

    if (showSkillSuggestions && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      const selectedSkill = skillSuggestions[selectedSkillSuggestionIndex];
      if (selectedSkill) {
        applySkillSuggestion(selectedSkill);
      }
      return;
    }

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
    <div
      className="mx-auto w-full max-w-[920px]"
      data-thread-composer="surface"
    >
      <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-panel)] p-2 backdrop-blur-xl">
        <div className="relative px-3 pt-1">
          {showSkillSuggestions ? (
            <div
              id={SKILL_SUGGESTIONS_LIST_ID}
              role="listbox"
              aria-label="Skill suggestions"
              className="absolute inset-x-3 bottom-full z-20 mb-2 max-h-56 overflow-y-auto rounded-[18px] border border-[var(--color-border)] bg-[var(--color-panel)] p-2 shadow-[var(--shadow-panel)] backdrop-blur-xl"
            >
              <div className="px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">
                技能
              </div>
              <div className="space-y-1">
                {skillSuggestions.map((suggestion, index) => {
                  const selected = index === selectedSkillSuggestionIndex;
                  return (
                    <button
                      key={suggestion.id}
                      id={`${SKILL_SUGGESTIONS_LIST_ID}-${suggestion.id}`}
                      ref={(node) => {
                        skillSuggestionRefs.current[index] = node;
                      }}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onMouseDown={(event) => {
                        event.preventDefault();
                      }}
                      onMouseEnter={() => {
                        setSelectedSkillSuggestionIndex(index);
                      }}
                      onClick={() => {
                        applySkillSuggestion(suggestion);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left transition-colors duration-150",
                        selected
                          ? "bg-[rgba(148,163,184,0.14)]"
                          : "hover:bg-[rgba(148,163,184,0.06)]",
                      )}
                    >
                      <span className="flex min-w-0 max-w-[44%] shrink items-center gap-2">
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                            selected
                              ? "bg-[rgba(99,102,241,0.18)] text-[rgb(79,70,229)]"
                              : "bg-[rgba(148,163,184,0.12)] text-[var(--color-muted)]",
                          )}
                        >
                          <Package className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span className="truncate text-[13px] font-medium text-[var(--color-fg)]">
                          {suggestion.label}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[11px] leading-5 text-[var(--color-muted)]">
                        {suggestion.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div
            className="flex min-h-[52px] flex-wrap items-start gap-2 px-1 py-1"
            onClick={() => {
              textareaRef.current?.focus();
            }}
          >
            {selectedSkillPills.map((skill, index) => (
              <div
                key={`${skill.id}-${index}`}
                className="inline-flex h-6 shrink-0 items-center gap-1 self-start rounded-full bg-[linear-gradient(180deg,rgba(232,224,255,0.92)_0%,rgba(236,232,255,0.72)_100%)] px-2.5 py-0 text-[length:var(--ui-font-size-lg)] leading-6 text-[rgba(109,40,217,0.96)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:bg-[linear-gradient(180deg,rgba(55,48,163,0.24)_0%,rgba(49,46,129,0.28)_100%)] dark:text-[rgb(196,181,253)]"
                data-selected-skill-pill={skill.commandName}
                aria-label={`已选择技能 ${skill.label}`}
              >
                <Package className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate font-medium">{skill.label}</span>
              </div>
            ))}
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
              aria-controls={
                showSkillSuggestions ? SKILL_SUGGESTIONS_LIST_ID : undefined
              }
              aria-expanded={showSkillSuggestions}
              aria-activedescendant={
                showSkillSuggestions
                  ? `${SKILL_SUGGESTIONS_LIST_ID}-${skillSuggestions[selectedSkillSuggestionIndex]?.id ?? ""}`
                  : undefined
              }
              className={cn(
                "max-h-[152px] resize-none overflow-y-auto bg-transparent text-[length:var(--ui-font-size-lg)] leading-6 text-[var(--color-fg)] outline-none placeholder:text-[var(--color-muted)] disabled:cursor-not-allowed disabled:placeholder:text-[var(--color-muted)]",
                selectedSkillPills.length > 0
                  ? "min-h-[44px] min-w-[180px] flex-1 px-0 py-0"
                  : "min-h-[52px] w-full px-1 py-1",
              )}
            />
          </div>
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
                !canSend
                  ? "输入内容并选择线程后可发送"
                  : conversationMode === "gui"
                    ? "GUI 模式敬请期待"
                    : "发送到当前线程 TUI"
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
                aria-label={
                  !canSend
                    ? "发送消息不可用"
                    : conversationMode === "gui"
                      ? "发送到 GUI 模式"
                      : "发送到当前线程 TUI"
                }
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
