import {
  Bot,
  BrainCircuit,
  ChevronDown,
  KeyRound,
  Link2,
  Save,
  ScanText,
  SlidersHorizontal,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Button } from "@renderer/components/ui/button";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { cn } from "@renderer/lib/cn";
import type {
  DesktopProviderId,
  DesktopProviderSettingsSnapshot,
  ProviderReasoningEffort,
  ProviderVerbosity,
} from "../../../../shared/provider-settings";
import {
  getResolvedCodexAutoCompactTokenLimit,
  getResolvedCodexContextWindow,
  getSupportedCodexEffortLevels,
  getSupportedCodexVerbosityLevels,
  normalizeCodexEffort,
  normalizeCodexVerbosity,
} from "../../../../shared/provider-settings";

const claudeLogoUrl = new URL(
  "../../../../../resources/provider-logos/claude.svg",
  import.meta.url,
).href;

const openAiLogoUrl = new URL(
  "../../../../../resources/provider-logos/open-ai.svg",
  import.meta.url,
).href;

const verbosityLabels: Record<ProviderVerbosity, string> = {
  low: "精简",
  medium: "标准",
  high: "详细",
};

const reasoningLabels: Record<ProviderReasoningEffort, string> = {
  minimal: "最轻",
  low: "较低",
  medium: "标准",
  high: "高",
  xhigh: "最高",
};

interface CodexDraftForm {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  defaultVerbosity: ProviderVerbosity;
  defaultReasoningEffort: ProviderReasoningEffort;
  modelContextWindow: string;
  modelAutoCompactTokenLimit: string;
  hasStoredCredential: boolean;
}

interface ProviderFileEntry {
  id: string;
  label: string;
  path: string;
}

function supportsProviderSettingsBridge() {
  return (
    typeof window !== "undefined" &&
    typeof window.desktopApp?.getProviderSettings === "function" &&
    typeof window.desktopApp?.saveProviderSettings === "function"
  );
}

function supportsFinderBridge() {
  return (
    typeof window !== "undefined" &&
    typeof window.desktopApp?.showItemInFolder === "function"
  );
}

function toCodexDraft(snapshot: DesktopProviderSettingsSnapshot): CodexDraftForm {
  return {
    baseUrl: snapshot.codex.baseUrl,
    apiKey: "",
    defaultModel: snapshot.codex.defaultModel,
    defaultVerbosity: snapshot.codex.defaultVerbosity,
    defaultReasoningEffort: snapshot.codex.defaultReasoningEffort,
    modelContextWindow: snapshot.codex.modelContextWindow?.toString() ?? "",
    modelAutoCompactTokenLimit:
      snapshot.codex.modelAutoCompactTokenLimit?.toString() ?? "",
    hasStoredCredential: snapshot.codex.hasStoredCredential,
  };
}

function parseOptionalPositiveInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function getModelDescription(modelId: string) {
  switch (modelId) {
    case "gpt-5.4":
      return "通用默认选择";
    case "gpt-5.3-codex":
      return "更偏代码任务";
    case "gpt-5.4-mini":
      return "更快、更轻量";
    case "gpt-5-pro":
      return "面向最复杂问题";
    default:
      return "可用于 Codex";
  }
}

export function ProviderSettingsPanel() {
  const [snapshot, setSnapshot] = useState<DesktopProviderSettingsSnapshot | null>(
    null,
  );
  const [selectedProviderId, setSelectedProviderId] =
    useState<DesktopProviderId>("anthropic");
  const [codexDraft, setCodexDraft] = useState<CodexDraftForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supportsProviderSettingsBridge()) {
      setError("当前桌面桥接尚未暴露供应商设置接口，请重启桌面开发进程后再试。");
      setLoading(false);
      return;
    }

    let cancelled = false;

    void window.desktopApp
      .getProviderSettings()
      .then((nextSnapshot) => {
        if (cancelled) {
          return;
        }

        setSnapshot(nextSnapshot);
        setSelectedProviderId(nextSnapshot.activeProviderId);
        setCodexDraft(toCodexDraft(nextSnapshot));
        setError(null);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "加载供应商配置失败。");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (!supportsProviderSettingsBridge()) {
      toast.error("供应商设置接口不可用，请重启桌面进程。");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const nextSnapshot =
        selectedProviderId === "anthropic"
          ? await window.desktopApp.saveProviderSettings({
              providerId: "anthropic",
            })
          : await window.desktopApp.saveProviderSettings({
              providerId: "codex",
              baseUrl: codexDraft?.baseUrl ?? "",
              apiKey: codexDraft?.apiKey ?? "",
              defaultModel: codexDraft?.defaultModel ?? "",
              defaultVerbosity: codexDraft?.defaultVerbosity ?? "medium",
              defaultReasoningEffort:
                codexDraft?.defaultReasoningEffort ?? "medium",
              modelContextWindow: parseOptionalPositiveInteger(
                codexDraft?.modelContextWindow ?? "",
              ),
              modelAutoCompactTokenLimit: parseOptionalPositiveInteger(
                codexDraft?.modelAutoCompactTokenLimit ?? "",
              ),
            });

      setSnapshot(nextSnapshot);
      setSelectedProviderId(nextSnapshot.activeProviderId);
      setCodexDraft(toCodexDraft(nextSnapshot));
      toast.success(
        selectedProviderId === "anthropic"
          ? "已切换到 Claude"
          : `已保存并启用 ${nextSnapshot.codex.defaultModel}`,
      );
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "保存供应商配置失败。";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollArea className="h-[calc(100vh-var(--titlebar-height))]">
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-6 pt-4 pb-10">
        <div className="space-y-1">
          <h1 className="text-[length:var(--ui-font-size-xl)] font-semibold tracking-[-0.03em] text-[var(--color-fg)]">
            供应商
          </h1>
          <p className="text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
            管理 Claude 与 Codex 的使用方式、连接信息和默认模型。
          </p>
        </div>

        <section className="overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel)]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5">
            <div className="space-y-1">
              <div className="text-[length:var(--ui-font-size-md)] font-semibold text-[var(--color-fg)]">
                供应商配置
              </div>
              <div className="text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
                选择当前使用的服务商，并保存对应的模型与连接设置。
              </div>
            </div>

            <div
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
              role="group"
              aria-label="供应商切换"
            >
              {[
                {
                  id: "anthropic",
                  label: "Claude",
                  logoUrl: claudeLogoUrl,
                },
                {
                  id: "codex",
                  label: "Codex",
                  logoUrl: openAiLogoUrl,
                },
              ].map(({ id, label, logoUrl }) => {
                const active = selectedProviderId === id;

                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    aria-label={label}
                    onClick={() => setSelectedProviderId(id as DesktopProviderId)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[length:var(--ui-font-size-sm)] font-medium transition-colors duration-150",
                      active
                        ? "border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-fg)]"
                        : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-fg)]",
                    )}
                  >
                    <img
                      src={logoUrl}
                      alt=""
                      className="h-4 w-4 shrink-0 object-contain"
                      aria-hidden="true"
                    />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-8 text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
              正在加载供应商配置…
            </div>
          ) : snapshot ? (
            <>
              {snapshot.warning ? (
                <InlineNotice>
                  当前配置指向了暂不支持在桌面端编辑的供应商，面板已按 Claude /
                  Codex 的可用内容展示。
                </InlineNotice>
              ) : null}

              {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}

              {selectedProviderId === "anthropic" ? (
                <AnthropicProviderView snapshot={snapshot} />
              ) : codexDraft ? (
                <CodexProviderView
                  snapshot={snapshot}
                  draft={codexDraft}
                  onDraftChange={setCodexDraft}
                />
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-4">
                <div className="text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
                  {selectedProviderId === "anthropic"
                    ? "保存后将切换回 Claude，并恢复内建供应商设置。"
                    : "保存后将立即启用 Codex，并使用这里填写的连接与模型设置。"}
                </div>
                <Button
                  variant="primary"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="rounded-xl shadow-none"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {saving ? "保存中…" : "保存"}
                </Button>
              </div>
            </>
          ) : (
            <div className="px-5 py-8 text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
              暂时无法读取供应商配置。
            </div>
          )}
        </section>
      </div>
    </ScrollArea>
  );
}

function AnthropicProviderView({
  snapshot,
}: {
  snapshot: DesktopProviderSettingsSnapshot;
}) {
  return (
    <div>
      <ProviderOverviewRow
        logoUrl={claudeLogoUrl}
        title="Claude"
        description="使用 Claude 内建服务与现有登录状态，无需单独填写接口地址或 API 密钥。"
        active={snapshot.anthropic.isActive}
      />

      <SettingRow
        icon={Bot}
        label="连接方式"
        description="沿用应用内建的 Claude 服务与认证流程。"
        control={<StaticValue>使用当前 Claude 登录状态</StaticValue>}
      />

      <SettingRow
        icon={BrainCircuit}
        label="默认模型"
        description="切换回 Claude 后，应用会恢复使用内建默认模型。"
        control={<StaticValue>{snapshot.anthropic.defaultModel}</StaticValue>}
      />
    </div>
  );
}

function CodexProviderView({
  snapshot,
  draft,
  onDraftChange,
}: {
  snapshot: DesktopProviderSettingsSnapshot;
  draft: CodexDraftForm;
  onDraftChange: (draft: CodexDraftForm) => void;
}) {
  const supportedVerbosityLevels = getSupportedCodexVerbosityLevels(
    draft.defaultModel,
  );
  const supportedEffortLevels = getSupportedCodexEffortLevels(
    draft.defaultModel,
  );
  const resolvedContextWindow = getResolvedCodexContextWindow(
    draft.defaultModel,
    parseOptionalPositiveInteger(draft.modelContextWindow),
  );
  const resolvedAutoCompact = getResolvedCodexAutoCompactTokenLimit(
    draft.defaultModel,
    parseOptionalPositiveInteger(draft.modelContextWindow),
    parseOptionalPositiveInteger(draft.modelAutoCompactTokenLimit),
  );

  const updateDraft = (patch: Partial<CodexDraftForm>) => {
    onDraftChange({
      ...draft,
      ...patch,
    });
  };

  const handleModelChange = (nextModel: string) => {
    updateDraft({
      defaultModel: nextModel,
      defaultVerbosity: normalizeCodexVerbosity(nextModel, draft.defaultVerbosity),
      defaultReasoningEffort: normalizeCodexEffort(
        nextModel,
        draft.defaultReasoningEffort,
      ),
    });
  };

  const configFiles: ProviderFileEntry[] = [
    {
      id: "providers",
      label: "providers.json",
      path: snapshot.paths.providersPath,
    },
    {
      id: "auth",
      label: "auth.json",
      path: snapshot.paths.authPath,
    },
    {
      id: "settings",
      label: "settings.json",
      path: snapshot.paths.settingsPath,
    },
  ];

  return (
    <div>
      <ProviderOverviewRow
        logoUrl={openAiLogoUrl}
        title="Codex"
        description="通过 OpenAI 兼容接口接入 Codex。你可以在这里设置接口地址、密钥和默认模型。"
        active={snapshot.codex.isActive}
        action={<ConfigFilesMenu files={configFiles} />}
      />

      <SettingRow
        icon={Link2}
        label="接口地址"
        description="Codex 使用的 OpenAI 兼容接口地址。"
        control={
          <TextInput
            ariaLabel="Codex 接口地址"
            value={draft.baseUrl}
            onChange={(value) => updateDraft({ baseUrl: value })}
            placeholder="https://api.openai.com/v1"
          />
        }
      />

      <SettingRow
        icon={KeyRound}
        label="API 密钥"
        description={
          draft.hasStoredCredential
            ? "留空会继续使用当前已保存的密钥；重新填写会覆盖原有值。"
            : "首次启用 Codex 时需要填写 API 密钥。"
        }
        control={
          <TextInput
            ariaLabel="Codex API 密钥"
            value={draft.apiKey}
            onChange={(value) => updateDraft({ apiKey: value })}
            placeholder={draft.hasStoredCredential ? "保留当前密钥" : "sk-..."}
            type="password"
          />
        }
      />

      <SettingRow
        icon={BrainCircuit}
        label="默认模型"
        description="保存后，Codex 会优先使用这里选择的模型。"
        control={
          <SelectField
            ariaLabel="Codex 默认模型"
            value={draft.defaultModel}
            onChange={handleModelChange}
            options={snapshot.codexModels.map((model) => ({
              value: model.id,
              label: `${model.label} · ${getModelDescription(model.id)}`,
            }))}
          />
        }
      />

      <SettingRow
        icon={SlidersHorizontal}
        label="输出详细程度"
        description="控制 Codex 输出内容的简洁或详细程度。"
        control={
          <SelectField
            ariaLabel="Codex 输出详细程度"
            value={draft.defaultVerbosity}
            onChange={(value) =>
              updateDraft({ defaultVerbosity: value as ProviderVerbosity })
            }
            options={supportedVerbosityLevels.map((value) => ({
              value,
              label: verbosityLabels[value],
            }))}
          />
        }
      />

      <SettingRow
        icon={BrainCircuit}
        label="推理强度"
        description="控制 Codex 在回答前投入多少推理深度。"
        control={
          <SelectField
            ariaLabel="Codex 推理强度"
            value={draft.defaultReasoningEffort}
            onChange={(value) =>
              updateDraft({
                defaultReasoningEffort: value as ProviderReasoningEffort,
              })
            }
            options={supportedEffortLevels.map((value) => ({
              value,
              label: reasoningLabels[value],
            }))}
          />
        }
      />

      <SettingRow
        icon={ScanText}
        label="上下文窗口"
        description={`控制单次对话可用的上下文上限。留空时使用模型默认值，当前为 ${resolvedContextWindow.toLocaleString()}。`}
        control={
          <NumberTextInput
            ariaLabel="Codex 上下文窗口"
            value={draft.modelContextWindow}
            onChange={(value) => updateDraft({ modelContextWindow: value })}
            placeholder={resolvedContextWindow.toString()}
          />
        }
      />

      <SettingRow
        icon={ScanText}
        label="自动压缩阈值"
        description={`到达该 token 数后自动压缩上下文。留空时按上下文窗口的 90% 计算，当前为 ${resolvedAutoCompact.toLocaleString()}。`}
        control={
          <NumberTextInput
            ariaLabel="Codex 自动压缩阈值"
            value={draft.modelAutoCompactTokenLimit}
            onChange={(value) =>
              updateDraft({ modelAutoCompactTokenLimit: value })
            }
            placeholder={resolvedAutoCompact.toString()}
          />
        }
      />
    </div>
  );
}

function ProviderOverviewRow({
  logoUrl,
  title,
  description,
  active,
  action,
}: {
  logoUrl: string;
  title: string;
  description: string;
  active: boolean;
  action?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 border-b border-[var(--color-border)] px-5 py-5 sm:grid-cols-[minmax(0,1fr)_320px] sm:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface)]">
          <img
            src={logoUrl}
            alt=""
            className="h-5 w-5 object-contain"
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[length:var(--ui-font-size-md)] font-medium text-[var(--color-fg)]">
              {title}
            </div>
            {active ? <ActiveBadge /> : null}
          </div>
          <div className="mt-1 text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
            {description}
          </div>
        </div>
      </div>

      {action ? <div className="w-full shrink-0">{action}</div> : null}
    </div>
  );
}

function ConfigFilesMenu({ files }: { files: ProviderFileEntry[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  const handleSelect = async (entry: ProviderFileEntry) => {
    setOpen(false);

    if (!supportsFinderBridge()) {
      toast.error("当前桌面桥接未提供文件定位能力。");
      return;
    }

    try {
      await window.desktopApp.showItemInFolder(entry.path);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "打开配置位置失败。");
    }
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        className="inline-flex h-11 w-full items-center justify-between gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[length:var(--ui-font-size-sm)] font-medium text-[var(--color-fg)] transition-colors duration-150 hover:bg-[var(--color-surface-strong)]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="打开配置"
        onClick={() => setOpen((current) => !current)}
      >
        <span>打开配置</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform duration-150",
            open ? "rotate-180" : "rotate-0",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute top-[calc(100%+8px)] right-0 z-30 w-full overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-[var(--color-panel)] p-1 shadow-[var(--shadow-panel)]"
        >
          {files.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="menuitem"
              onClick={() => {
                void handleSelect(entry);
              }}
              className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-left text-[length:var(--ui-font-size-sm)] text-[var(--color-fg)] transition-colors duration-150 hover:bg-[var(--color-surface)]"
            >
              <span>{entry.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ActiveBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-accent)]/10 px-2.5 py-1 text-[length:var(--ui-font-size-2xs)] font-semibold text-[var(--color-accent)]">
      当前使用中
    </span>
  );
}

function InlineNotice({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <div
      className={cn(
        "border-b px-5 py-3 text-[length:var(--ui-font-size-sm)]",
        tone === "danger"
          ? "border-[rgba(239,68,68,0.12)] bg-[rgba(239,68,68,0.06)] text-[#b42318]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]",
      )}
    >
      {children}
    </div>
  );
}

function SettingRow({
  icon: Icon,
  label,
  description,
  control,
}: {
  icon: typeof Bot;
  label: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 border-b border-[var(--color-border)] px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_320px] sm:items-center">
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

      <div className="w-full shrink-0">{control}</div>
    </div>
  );
}

function StaticValue({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-11 w-full items-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[length:var(--ui-font-size-sm)] text-[var(--color-fg)]">
      {children}
    </div>
  );
}

function TextInput({
  ariaLabel,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "password";
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <input
      type={type}
      aria-label={ariaLabel}
      value={value}
      inputMode={inputMode}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[length:var(--ui-font-size-md)] text-[var(--color-fg)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
    />
  );
}

function NumberTextInput({
  ariaLabel,
  value,
  onChange,
  placeholder,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      ariaLabel={ariaLabel}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      inputMode="numeric"
    />
  );
}

function SelectField({
  ariaLabel,
  value,
  onChange,
  options,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[length:var(--ui-font-size-md)] text-[var(--color-fg)] outline-none transition-colors duration-150 focus:border-[var(--color-accent)]"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
