export type DesktopProviderId = "anthropic" | "codex";
export type ProviderVerbosity = "low" | "medium" | "high";
export type ProviderReasoningEffort =
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export interface ProviderModelCatalogEntry {
  id: string;
  label: string;
  description: string;
  supportedEffortLevels: ProviderReasoningEffort[];
  defaultEffortLevel: ProviderReasoningEffort;
  supportedVerbosityLevels: ProviderVerbosity[];
  defaultVerbosity: ProviderVerbosity;
  defaultContextWindowTokens: number;
}

export interface DesktopProviderPaths {
  providersPath: string;
  authPath: string;
  settingsPath: string;
}

export interface DesktopProviderLock {
  source: string;
  providerId: string;
}

export interface DesktopProviderSaveResult {
  message: string;
  createdFiles: string[];
}

export interface AnthropicProviderSnapshot {
  providerId: "anthropic";
  label: string;
  description: string;
  driver: "anthropic-messages";
  baseUrl: string;
  defaultModel: string;
  defaultReasoningEffort: ProviderReasoningEffort;
  isActive: boolean;
}

export interface CodexProviderDraft {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  defaultVerbosity: ProviderVerbosity;
  defaultReasoningEffort: ProviderReasoningEffort;
  modelContextWindow?: number;
  modelAutoCompactTokenLimit?: number;
}

export interface CodexProviderSnapshot {
  providerId: "codex";
  label: string;
  description: string;
  driver: "openai-responses";
  baseUrl: string;
  defaultModel: string;
  defaultVerbosity: ProviderVerbosity;
  defaultReasoningEffort: ProviderReasoningEffort;
  modelContextWindow?: number;
  modelAutoCompactTokenLimit?: number;
  resolvedModelContextWindow: number;
  resolvedModelAutoCompactTokenLimit: number;
  hasStoredCredential: boolean;
  isActive: boolean;
}

export interface DesktopProviderSettingsSnapshot {
  activeProviderId: DesktopProviderId;
  requestedProviderId: string | null;
  warning: "unknown-provider" | null;
  lock: DesktopProviderLock | null;
  paths: DesktopProviderPaths;
  anthropic: AnthropicProviderSnapshot;
  codex: CodexProviderSnapshot;
  codexModels: ProviderModelCatalogEntry[];
}

export type DesktopProviderSettingsSaveInput =
  | {
      providerId: "anthropic";
    }
  | ({
      providerId: "codex";
    } & CodexProviderDraft);

export const BUILTIN_PROVIDER_ID = "anthropic";
export const CODEX_PROVIDER_ID = "codex";
export const DEFAULT_CLAUDE_BASE_URL = "https://api.anthropic.com";
export const DEFAULT_CLAUDE_MODEL = "claude-sonnet-4-6";
export const DEFAULT_CLAUDE_EFFORT: ProviderReasoningEffort = "high";
export const DEFAULT_CODEX_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_CODEX_MODEL = "gpt-5.4";
export const DEFAULT_CODEX_VERBOSITY: ProviderVerbosity = "medium";
export const DEFAULT_CODEX_EFFORT: ProviderReasoningEffort = "medium";
export const OPENAI_RESPONSES_CONTEXT_WINDOW_DEFAULT = 272_000;
export const OPENAI_RESPONSES_AUTO_COMPACT_CLAMP_PERCENT = 90;

export const CODEX_MODEL_CATALOG: ProviderModelCatalogEntry[] = [
  {
    id: "gpt-5.4",
    label: "GPT-5.4",
    description: "Best default for general coding and planning",
    supportedEffortLevels: ["minimal", "low", "medium", "high", "xhigh"],
    defaultEffortLevel: "medium",
    supportedVerbosityLevels: ["low", "medium", "high"],
    defaultVerbosity: "medium",
    defaultContextWindowTokens: OPENAI_RESPONSES_CONTEXT_WINDOW_DEFAULT,
  },
  {
    id: "gpt-5.3-codex",
    label: "GPT-5.3-Codex",
    description: "Coding-optimized Responses model for agentic work",
    supportedEffortLevels: ["low", "medium", "high", "xhigh"],
    defaultEffortLevel: "medium",
    supportedVerbosityLevels: ["low", "medium", "high"],
    defaultVerbosity: "medium",
    defaultContextWindowTokens: OPENAI_RESPONSES_CONTEXT_WINDOW_DEFAULT,
  },
  {
    id: "gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    description: "Faster and lighter for routine coding tasks",
    supportedEffortLevels: ["minimal", "low", "medium", "high"],
    defaultEffortLevel: "low",
    supportedVerbosityLevels: ["low", "medium", "high"],
    defaultVerbosity: "medium",
    defaultContextWindowTokens: OPENAI_RESPONSES_CONTEXT_WINDOW_DEFAULT,
  },
  {
    id: "gpt-5-pro",
    label: "GPT-5 Pro",
    description: "Highest-end reasoning for the hardest tasks",
    supportedEffortLevels: ["high"],
    defaultEffortLevel: "high",
    supportedVerbosityLevels: ["low", "medium", "high"],
    defaultVerbosity: "medium",
    defaultContextWindowTokens: OPENAI_RESPONSES_CONTEXT_WINDOW_DEFAULT,
  },
];

const verbosityLevels: ProviderVerbosity[] = ["low", "medium", "high"];
const effortLevels: ProviderReasoningEffort[] = [
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
];

export function getCodexCatalogEntry(model: string) {
  const normalized = model.trim().toLowerCase();
  return CODEX_MODEL_CATALOG.find(
    (entry) => entry.id.toLowerCase() === normalized,
  );
}

export function normalizeCodexModel(model: string) {
  const trimmed = model.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_CODEX_MODEL;
}

export function normalizeCodexVerbosity(
  model: string,
  verbosity: ProviderVerbosity,
) {
  const entry = getCodexCatalogEntry(model);
  if (!entry?.supportedVerbosityLevels.includes(verbosity)) {
    return entry?.defaultVerbosity ?? DEFAULT_CODEX_VERBOSITY;
  }

  return verbosity;
}

export function normalizeCodexEffort(
  model: string,
  effort: ProviderReasoningEffort,
) {
  const entry = getCodexCatalogEntry(model);
  if (!entry?.supportedEffortLevels.includes(effort)) {
    return entry?.defaultEffortLevel ?? DEFAULT_CODEX_EFFORT;
  }

  return effort;
}

export function getSupportedCodexVerbosityLevels(model: string) {
  return getCodexCatalogEntry(model)?.supportedVerbosityLevels ?? verbosityLevels;
}

export function getSupportedCodexEffortLevels(model: string) {
  return getCodexCatalogEntry(model)?.supportedEffortLevels ?? effortLevels;
}

export function getResolvedCodexContextWindow(
  model: string,
  configuredValue?: number,
) {
  return (
    configuredValue ??
    getCodexCatalogEntry(model)?.defaultContextWindowTokens ??
    OPENAI_RESPONSES_CONTEXT_WINDOW_DEFAULT
  );
}

export function getResolvedCodexAutoCompactTokenLimit(
  model: string,
  configuredContextWindow?: number,
  configuredAutoCompact?: number,
) {
  const contextWindow = getResolvedCodexContextWindow(model, configuredContextWindow);
  const clampedDefault = Math.floor(
    (contextWindow * OPENAI_RESPONSES_AUTO_COMPACT_CLAMP_PERCENT) / 100,
  );

  if (configuredAutoCompact === undefined) {
    return clampedDefault;
  }

  return Math.min(configuredAutoCompact, clampedDefault);
}
