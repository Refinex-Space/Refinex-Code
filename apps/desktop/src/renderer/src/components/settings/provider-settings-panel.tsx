import {
  Bot,
  BrainCircuit,
  KeyRound,
  Link2,
  PlugZap,
  Save,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState, type HTMLAttributes, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@renderer/components/ui/button";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import { cn } from "@renderer/lib/cn";
import type {
  CodexProviderDraft,
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

function supportsProviderSettingsBridge() {
  return (
    typeof window !== "undefined" &&
    typeof window.desktopApp?.getProviderSettings === "function" &&
    typeof window.desktopApp?.saveProviderSettings === "function"
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
      toast.error("供应商设置 bridge 不可用，请重启桌面进程。");
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
          ? "已切换到 Claude 供应商"
          : `已保存 Codex 配置并激活 ${nextSnapshot.codex.defaultModel}`,
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
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-6 pt-4 pb-10">
        <div className="space-y-1">
          <h1 className="text-[length:var(--ui-font-size-xl)] font-semibold tracking-[-0.03em] text-[var(--color-fg)]">
            供应商
          </h1>
          <p className="text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
            将现有 `/provider` 的 Anthropic 与 Codex 配置能力映射到桌面设置面板。
          </p>
        </div>

        <section className="overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-panel)]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-5">
            <div className="space-y-1">
              <div className="text-[length:var(--ui-font-size-md)] font-semibold text-[var(--color-fg)]">
                供应商配置
              </div>
              <div className="text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
                供应商切换会写入与 CLI `/provider` 相同的用户级配置文件。
              </div>
            </div>

            <div
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
              role="group"
              aria-label="供应商切换"
            >
              {[
                { id: "anthropic", label: "Claude", icon: Bot },
                { id: "codex", label: "Codex", icon: PlugZap },
              ].map(({ id, label, icon: Icon }) => {
                const active = selectedProviderId === id;

                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active}
                    aria-label={label}
                    onClick={() => setSelectedProviderId(id as DesktopProviderId)}
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

          {loading ? (
            <div className="px-5 py-8 text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
              正在加载供应商配置…
            </div>
          ) : snapshot ? (
            <>
              {snapshot.warning ? (
                <InlineNotice>
                  当前 `settings.json` 指向了未知 provider，面板已按可支持的
                  Anthropic/Codex 语义进行回退展示。
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
                    ? "保存后会切换到内建 Anthropic provider，并清理 Codex 专属运行时设置。"
                    : "保存后会更新 providers.json、auth.json 与 settings.json，并立即激活 Codex。"}
                </div>
                <Button
                  variant="primary"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="rounded-xl"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {saving
                    ? "保存中…"
                    : selectedProviderId === "anthropic"
                      ? "保存并切换到 Claude"
                      : "保存 Codex 配置"}
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
    <div className="px-5 py-5">
      <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-panel)] text-[var(--color-accent)] shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[length:var(--ui-font-size-lg)] font-semibold text-[var(--color-fg)]">
                Claude
              </div>
              {snapshot.anthropic.isActive ? <ActiveBadge /> : null}
            </div>
            <div className="mt-1 text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
              {snapshot.anthropic.description}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <InfoTile
            icon={PlugZap}
            label="驱动"
            value="Anthropic Messages"
          />
          <InfoTile
            icon={Link2}
            label="基础地址"
            value={snapshot.anthropic.baseUrl}
          />
          <InfoTile
            icon={BrainCircuit}
            label="默认模型"
            value={snapshot.anthropic.defaultModel}
          />
          <InfoTile
            icon={SlidersHorizontal}
            label="默认推理强度"
            value={snapshot.anthropic.defaultReasoningEffort}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
          Anthropic 在当前 `/provider` 语义下没有额外的 provider 文件表单项。
          认证与登录仍沿用现有 CLI 流程或环境变量。
        </div>
      </div>
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

  return (
    <div className="px-5 py-5">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-panel)] text-[var(--color-accent)] shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <PlugZap className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[length:var(--ui-font-size-lg)] font-semibold text-[var(--color-fg)]">
                Codex
              </div>
              {snapshot.codex.isActive ? <ActiveBadge /> : null}
            </div>
            <div className="mt-1 text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
              {snapshot.codex.description}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FieldBlock
            icon={Link2}
            label="Base URL"
            description="OpenAI Responses 兼容网关地址，会写入 providers.json。"
          >
            <TextInput
              ariaLabel="Codex Base URL"
              value={draft.baseUrl}
              onChange={(value) => updateDraft({ baseUrl: value })}
              placeholder="https://api.openai.com/v1"
            />
          </FieldBlock>

          <FieldBlock
            icon={KeyRound}
            label="API Key"
            description={
              draft.hasStoredCredential
                ? "留空则保留现有 auth.json 凭证；填写时会覆盖为新的 API Key。"
                : "首次配置时必填，会写入 auth.json。"
            }
          >
            <TextInput
              ariaLabel="Codex API Key"
              value={draft.apiKey}
              onChange={(value) => updateDraft({ apiKey: value })}
              placeholder={draft.hasStoredCredential ? "保留现有凭证" : "sk-..."}
              type="password"
            />
          </FieldBlock>

          <FieldBlock
            icon={BrainCircuit}
            label="默认模型"
            description="保存后会立即写入 settings.json 并作为当前 Codex 模型激活。"
          >
            <SelectField
              ariaLabel="Codex 默认模型"
              value={draft.defaultModel}
              onChange={handleModelChange}
              options={snapshot.codexModels.map((model) => ({
                value: model.id,
                label: `${model.label} · ${model.description}`,
              }))}
            />
          </FieldBlock>

          <FieldBlock
            icon={SlidersHorizontal}
            label="Verbosity"
            description="仅展示当前模型支持的 verbosity 级别。"
          >
            <SelectField
              ariaLabel="Codex Verbosity"
              value={draft.defaultVerbosity}
              onChange={(value) =>
                updateDraft({ defaultVerbosity: value as ProviderVerbosity })
              }
              options={supportedVerbosityLevels.map((value) => ({
                value,
                label: value,
              }))}
            />
          </FieldBlock>

          <FieldBlock
            icon={SlidersHorizontal}
            label="Reasoning Effort"
            description="会按当前模型支持范围自动收敛到合法值。"
          >
            <SelectField
              ariaLabel="Codex Reasoning Effort"
              value={draft.defaultReasoningEffort}
              onChange={(value) =>
                updateDraft({
                  defaultReasoningEffort: value as ProviderReasoningEffort,
                })
              }
              options={supportedEffortLevels.map((value) => ({
                value,
                label: value,
              }))}
            />
          </FieldBlock>

          <FieldBlock
            icon={BrainCircuit}
            label="Context Window"
            description={`留空时使用模型默认值，当前解析结果为 ${resolvedContextWindow.toLocaleString()}。`}
          >
            <TextInput
              ariaLabel="Codex Context Window"
              value={draft.modelContextWindow}
              onChange={(value) => updateDraft({ modelContextWindow: value })}
              placeholder={resolvedContextWindow.toString()}
              inputMode="numeric"
            />
          </FieldBlock>

          <FieldBlock
            icon={BrainCircuit}
            label="Auto-Compact Trigger"
            description={`留空时采用兼容默认值，运行时会夹紧到 context window 的 90%，当前解析结果为 ${resolvedAutoCompact.toLocaleString()}。`}
          >
            <TextInput
              ariaLabel="Codex Auto Compact Trigger"
              value={draft.modelAutoCompactTokenLimit}
              onChange={(value) =>
                updateDraft({ modelAutoCompactTokenLimit: value })
              }
              placeholder={resolvedAutoCompact.toString()}
              inputMode="numeric"
            />
          </FieldBlock>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
          <div>providers.json: {snapshot.paths.providersPath}</div>
          <div>auth.json: {snapshot.paths.authPath}</div>
          <div>settings.json: {snapshot.paths.settingsPath}</div>
        </div>
      </div>
    </div>
  );
}

function ActiveBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-accent)]/10 px-2.5 py-1 text-[length:var(--ui-font-size-2xs)] font-semibold text-[var(--color-accent)]">
      当前激活
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

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bot;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3">
      <div className="flex items-center gap-2 text-[length:var(--ui-font-size-2xs)] font-semibold tracking-[0.08em] text-[var(--color-muted)] uppercase">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <div className="mt-2 break-all text-[length:var(--ui-font-size-md)] font-medium text-[var(--color-fg)]">
        {value}
      </div>
    </div>
  );
}

function FieldBlock({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: typeof Bot;
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4">
      <div className="flex items-center gap-2 text-[length:var(--ui-font-size-xs)] font-semibold tracking-[0.08em] text-[var(--color-muted)] uppercase">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <div className="mt-2 text-[length:var(--ui-font-size-sm)] text-[var(--color-muted)]">
        {description}
      </div>
      <div className="mt-3">{children}</div>
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
      className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-[length:var(--ui-font-size-md)] text-[var(--color-fg)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)]"
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
      className="h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 text-[length:var(--ui-font-size-md)] text-[var(--color-fg)] outline-none transition-colors duration-150 focus:border-[var(--color-accent)]"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
