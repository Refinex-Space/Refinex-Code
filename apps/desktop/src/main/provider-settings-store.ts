import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type {
  CodexProviderDraft,
  DesktopProviderId,
  DesktopProviderSettingsSaveInput,
  DesktopProviderSettingsSnapshot,
  ProviderReasoningEffort,
  ProviderVerbosity,
} from "../shared/provider-settings";
import {
  BUILTIN_PROVIDER_ID,
  CODEX_MODEL_CATALOG,
  CODEX_PROVIDER_ID,
  DEFAULT_CLAUDE_BASE_URL,
  DEFAULT_CLAUDE_EFFORT,
  DEFAULT_CLAUDE_MODEL,
  DEFAULT_CODEX_BASE_URL,
  DEFAULT_CODEX_EFFORT,
  DEFAULT_CODEX_MODEL,
  DEFAULT_CODEX_VERBOSITY,
  getResolvedCodexAutoCompactTokenLimit,
  getResolvedCodexContextWindow,
  normalizeCodexEffort,
  normalizeCodexModel,
  normalizeCodexVerbosity,
} from "../shared/provider-settings";

interface ProviderRegistryFile {
  authStore?: "auto" | "keychain" | "file";
  defaultProvider?: string;
  providers?: Record<
    string,
    {
      name?: string;
      driver?: string;
      baseUrl?: string;
      defaultModel?: string;
      defaultReasoningEffort?: ProviderReasoningEffort;
      defaultVerbosity?: ProviderVerbosity;
      modelContextWindow?: number;
      modelAutoCompactTokenLimit?: number;
    }
  >;
}

interface ProviderAuthFile {
  providers?: Record<
    string,
    {
      apiKey?: string;
      bearerToken?: string;
    }
  >;
}

interface UserSettingsFile {
  modelProvider?: string;
  model?: string;
  modelVerbosity?: ProviderVerbosity;
  effortLevel?: ProviderReasoningEffort;
  [key: string]: unknown;
}

interface CreateProviderSettingsStoreOptions {
  claudeConfigDir?: string;
}

function getClaudeConfigDir(override?: string) {
  return (override ?? process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude")).normalize(
    "NFC",
  );
}

function ensureDirectory(pathname: string) {
  mkdirSync(pathname, {
    recursive: true,
  });
}

function safeReadJson<T>(pathname: string, fallback: T): T {
  try {
    if (!existsSync(pathname)) {
      return fallback;
    }

    const content = readFileSync(pathname, "utf8");
    if (!content.trim()) {
      return fallback;
    }

    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

function writeJson(pathname: string, value: unknown) {
  const tempPath = `${pathname}.tmp`;
  ensureDirectory(dirname(pathname));
  writeFileSync(tempPath, JSON.stringify(value, null, 2) + "\n", "utf8");
  renameSync(tempPath, pathname);
}

function parseOptionalPositiveInteger(value: number | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function getCreatedFiles(pathnames: string[]) {
  return pathnames.filter((pathname) => !existsSync(pathname));
}

function getActiveProviderId(
  requestedProviderId: string | undefined,
  registry: ProviderRegistryFile,
): {
  activeProviderId: DesktopProviderId;
  warning: "unknown-provider" | null;
} {
  if (requestedProviderId === BUILTIN_PROVIDER_ID || requestedProviderId === CODEX_PROVIDER_ID) {
    return {
      activeProviderId: requestedProviderId,
      warning: null,
    };
  }

  if (requestedProviderId) {
    return {
      activeProviderId:
        registry.defaultProvider === CODEX_PROVIDER_ID ? CODEX_PROVIDER_ID : BUILTIN_PROVIDER_ID,
      warning: "unknown-provider",
    };
  }

  return {
    activeProviderId:
      registry.defaultProvider === CODEX_PROVIDER_ID ? CODEX_PROVIDER_ID : BUILTIN_PROVIDER_ID,
    warning: null,
  };
}

function buildCodexDraft(
  registry: ProviderRegistryFile,
  authFile: ProviderAuthFile,
): Omit<DesktopProviderSettingsSnapshot["codex"], "isActive"> {
  const codex = registry.providers?.[CODEX_PROVIDER_ID];
  const defaultModel = normalizeCodexModel(codex?.defaultModel ?? DEFAULT_CODEX_MODEL);
  const defaultVerbosity = normalizeCodexVerbosity(
    defaultModel,
    codex?.defaultVerbosity ?? DEFAULT_CODEX_VERBOSITY,
  );
  const defaultReasoningEffort = normalizeCodexEffort(
    defaultModel,
    codex?.defaultReasoningEffort ?? DEFAULT_CODEX_EFFORT,
  );
  const modelContextWindow = parseOptionalPositiveInteger(codex?.modelContextWindow);
  const modelAutoCompactTokenLimit = parseOptionalPositiveInteger(
    codex?.modelAutoCompactTokenLimit,
  );
  const auth = authFile.providers?.[CODEX_PROVIDER_ID];

  return {
    providerId: "codex",
    label: "Codex",
    description: "使用 OpenAI Responses 兼容配置来驱动桌面端与 CLI 的 Codex 供应商。",
    driver: "openai-responses",
    baseUrl: codex?.baseUrl?.trim() || DEFAULT_CODEX_BASE_URL,
    defaultModel,
    defaultVerbosity,
    defaultReasoningEffort,
    modelContextWindow,
    modelAutoCompactTokenLimit,
    resolvedModelContextWindow: getResolvedCodexContextWindow(
      defaultModel,
      modelContextWindow,
    ),
    resolvedModelAutoCompactTokenLimit: getResolvedCodexAutoCompactTokenLimit(
      defaultModel,
      modelContextWindow,
      modelAutoCompactTokenLimit,
    ),
    hasStoredCredential: Boolean(auth?.apiKey || auth?.bearerToken),
  };
}

function validateCodexDraft(
  draft: CodexProviderDraft,
  hasStoredCredential: boolean,
) {
  const baseUrl = draft.baseUrl.trim();
  const apiKey = draft.apiKey.trim();
  const defaultModel = normalizeCodexModel(draft.defaultModel);

  if (!baseUrl) {
    throw new Error("Base URL is required.");
  }

  try {
    new URL(baseUrl);
  } catch {
    throw new Error("Base URL must be a valid URL.");
  }

  if (!apiKey && !hasStoredCredential) {
    throw new Error("API key is required.");
  }

  const modelContextWindow = parseOptionalPositiveInteger(draft.modelContextWindow);
  if (draft.modelContextWindow !== undefined && modelContextWindow === undefined) {
    throw new Error("Context window must be a positive integer.");
  }

  const modelAutoCompactTokenLimit = parseOptionalPositiveInteger(
    draft.modelAutoCompactTokenLimit,
  );
  if (
    draft.modelAutoCompactTokenLimit !== undefined &&
    modelAutoCompactTokenLimit === undefined
  ) {
    throw new Error("Auto-compact token limit must be a positive integer.");
  }

  const defaultVerbosity = normalizeCodexVerbosity(
    defaultModel,
    draft.defaultVerbosity,
  );
  const defaultReasoningEffort = normalizeCodexEffort(
    defaultModel,
    draft.defaultReasoningEffort,
  );

  return {
    baseUrl,
    apiKey,
    defaultModel,
    defaultVerbosity,
    defaultReasoningEffort,
    modelContextWindow,
    modelAutoCompactTokenLimit,
  };
}

export function createProviderSettingsStore({
  claudeConfigDir,
}: CreateProviderSettingsStoreOptions = {}) {
  const configRoot = getClaudeConfigDir(claudeConfigDir);
  const providersPath = join(configRoot, "providers.json");
  const authPath = join(configRoot, "auth.json");
  const settingsPath = join(configRoot, "settings.json");

  function getSnapshot(): DesktopProviderSettingsSnapshot {
    const registry = safeReadJson<ProviderRegistryFile>(providersPath, {});
    const authFile = safeReadJson<ProviderAuthFile>(authPath, {});
    const userSettings = safeReadJson<UserSettingsFile>(settingsPath, {});
    const requestedProviderId =
      typeof userSettings.modelProvider === "string" ? userSettings.modelProvider : null;
    const { activeProviderId, warning } = getActiveProviderId(
      requestedProviderId ?? undefined,
      registry,
    );
    const codex = buildCodexDraft(registry, authFile);

    return {
      activeProviderId,
      requestedProviderId,
      warning,
      lock: null,
      paths: {
        providersPath,
        authPath,
        settingsPath,
      },
      anthropic: {
        providerId: "anthropic",
        label: "Claude",
        description: "内建 Anthropic Messages 供应商，认证与订阅流程仍由 CLI 现有登录链路负责。",
        driver: "anthropic-messages",
        baseUrl: process.env.ANTHROPIC_BASE_URL || DEFAULT_CLAUDE_BASE_URL,
        defaultModel: DEFAULT_CLAUDE_MODEL,
        defaultReasoningEffort: DEFAULT_CLAUDE_EFFORT,
        isActive: activeProviderId === "anthropic",
      },
      codex: {
        ...codex,
        isActive: activeProviderId === "codex",
      },
      codexModels: CODEX_MODEL_CATALOG,
    };
  }

  function save(input: DesktopProviderSettingsSaveInput) {
    if (input.providerId === "anthropic") {
      const createdFiles = getCreatedFiles([settingsPath]);
      const userSettings = safeReadJson<UserSettingsFile>(settingsPath, {});

      delete userSettings.model;
      delete userSettings.modelVerbosity;
      delete userSettings.effortLevel;
      userSettings.modelProvider = BUILTIN_PROVIDER_ID;
      writeJson(settingsPath, userSettings);

      return {
        snapshot: getSnapshot(),
        message:
          "Switched to Anthropic. Restored provider-sensitive settings to built-in defaults.",
        createdFiles,
      };
    }

    const existingSnapshot = getSnapshot();
    const normalized = validateCodexDraft(input, existingSnapshot.codex.hasStoredCredential);
    const createdFiles = getCreatedFiles([providersPath, authPath, settingsPath]);
    const registry = safeReadJson<ProviderRegistryFile>(providersPath, {});
    const authFile = safeReadJson<ProviderAuthFile>(authPath, {});
    const userSettings = safeReadJson<UserSettingsFile>(settingsPath, {});

    writeJson(providersPath, {
      ...registry,
      authStore: "file",
      defaultProvider: CODEX_PROVIDER_ID,
      providers: {
        ...(registry.providers ?? {}),
        [CODEX_PROVIDER_ID]: {
          name: "OpenAI Codex",
          driver: "openai-responses",
          baseUrl: normalized.baseUrl,
          defaultModel: normalized.defaultModel,
          defaultVerbosity: normalized.defaultVerbosity,
          defaultReasoningEffort: normalized.defaultReasoningEffort,
          modelContextWindow: normalized.modelContextWindow,
          modelAutoCompactTokenLimit: normalized.modelAutoCompactTokenLimit,
        },
      },
    } satisfies ProviderRegistryFile);

    if (normalized.apiKey) {
      writeJson(authPath, {
        ...authFile,
        providers: {
          ...(authFile.providers ?? {}),
          [CODEX_PROVIDER_ID]: {
            ...(authFile.providers?.[CODEX_PROVIDER_ID] ?? {}),
            apiKey: normalized.apiKey,
          },
        },
      } satisfies ProviderAuthFile);
    }

    userSettings.modelProvider = CODEX_PROVIDER_ID;
    userSettings.model = normalized.defaultModel;
    userSettings.modelVerbosity = normalized.defaultVerbosity;
    userSettings.effortLevel = normalized.defaultReasoningEffort;
    writeJson(settingsPath, userSettings);

    return {
      snapshot: getSnapshot(),
      message: `Configured and activated Codex with ${normalized.defaultModel}.`,
      createdFiles,
    };
  }

  return {
    getSnapshot,
    save,
  };
}
