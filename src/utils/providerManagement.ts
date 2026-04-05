import { existsSync } from 'fs'
import type { EffortLevel } from 'src/entrypoints/sdk/runtimeTypes.js'
import {
  getProviderAuth,
  getProviderAuthFilePath,
  hasProviderAuth,
  saveProviderAuth,
} from './providerAuthStore.js'
import {
  BUILTIN_MODEL_PROVIDER_ID,
  getConfiguredModelProviderInfo,
  getProviderDriverLabel,
  getProviderRegistry,
  getProviderRegistryFileConfig,
  getProviderRegistryPath,
  saveProviderRegistry,
  type ProviderReasoningEffort,
  type ProviderVerbosity,
} from './providerRegistry.js'
import {
  getProviderModelCatalogForDriver,
  getAutoCompactTokenLimitForConfiguredProviderModel,
  getAutoCompactTokenLimitForProvider,
  getDefaultContextWindowForConfiguredProviderModel,
  getDefaultContextWindowForProvider,
  type ProviderModelCatalogEntry,
} from './model/providerCatalog.js'
import {
  getSettingsFilePathForSource,
  getSettingsForSource,
  updateSettingsForSource,
} from './settings/settings.js'
import { getSettingSourceName } from './settings/constants.js'

export const CODEX_PROVIDER_ID = 'codex'
export const DEFAULT_CODEX_BASE_URL = 'https://api.openai.com/v1'
export const DEFAULT_CODEX_MODEL = 'gpt-5.4'
export const DEFAULT_CODEX_VERBOSITY: ProviderVerbosity = 'medium'
export const DEFAULT_CODEX_EFFORT: ProviderReasoningEffort = 'medium'

export type ProviderControlLock = {
  source: 'policySettings' | 'flagSettings'
  providerId: string
}

export type CodexProviderDraft = {
  baseUrl: string
  apiKey: string
  defaultModel: string
  defaultVerbosity: ProviderVerbosity
  defaultReasoningEffort: ProviderReasoningEffort
  modelContextWindow?: number
  modelAutoCompactTokenLimit?: number
}

export type CodexProviderSnapshot = Omit<CodexProviderDraft, 'apiKey'> & {
  hasStoredCredential: boolean
  configuredModelContextWindow?: number
  configuredModelAutoCompactTokenLimit?: number
  resolvedModelContextWindow?: number
  resolvedModelAutoCompactTokenLimit?: number
}

export type ProviderPaths = {
  providersPath: string
  authPath: string
  settingsPath: string
}

export type ProviderActivationResult = {
  ok: boolean
  message: string
  mainLoopModel: string | null
  effortLevel: EffortLevel | undefined
  createdFiles: string[]
}

function getUserSettingsPath(): string {
  return getSettingsFilePathForSource('userSettings')!
}

function getCreatedFiles(paths: ProviderPaths): string[] {
  return Object.values(paths).filter(path => !existsSync(path))
}

function getCodexCatalogEntry(
  model: string,
): ProviderModelCatalogEntry | undefined {
  const normalized = model.trim().toLowerCase()
  return getProviderModelCatalogForDriver('openai-responses').find(
    entry => entry.id.toLowerCase() === normalized,
  )
}

function normalizeCodexModel(model: string): string {
  const trimmed = model.trim()
  return trimmed.length > 0 ? trimmed : DEFAULT_CODEX_MODEL
}

function normalizeCodexVerbosity(
  model: string,
  verbosity: ProviderVerbosity,
): ProviderVerbosity {
  const entry = getCodexCatalogEntry(model)
  if (!entry?.supportedVerbosityLevels?.includes(verbosity)) {
    return entry?.defaultVerbosity ?? DEFAULT_CODEX_VERBOSITY
  }
  return verbosity
}

function normalizeCodexEffort(
  model: string,
  effort: ProviderReasoningEffort,
): ProviderReasoningEffort {
  const entry = getCodexCatalogEntry(model)
  if (!entry?.supportedEffortLevels?.includes(effort)) {
    const fallback =
      entry?.defaultEffortLevel ??
      entry?.supportedEffortLevels?.[entry.supportedEffortLevels.length - 1] ??
      DEFAULT_CODEX_EFFORT
    return fallback === 'max' ? 'xhigh' : fallback
  }
  return effort
}

export function getProviderPaths(): ProviderPaths {
  return {
    providersPath: getProviderRegistryPath(),
    authPath: getProviderAuthFilePath(),
    settingsPath: getUserSettingsPath(),
  }
}

export function getProviderControlLock(): ProviderControlLock | null {
  const policyProvider = getSettingsForSource('policySettings')?.modelProvider
  if (policyProvider) {
    return {
      source: 'policySettings',
      providerId: policyProvider,
    }
  }

  const flagProvider = getSettingsForSource('flagSettings')?.modelProvider
  if (flagProvider) {
    return {
      source: 'flagSettings',
      providerId: flagProvider,
    }
  }

  return null
}

export function getProviderControlLockMessage(): string | null {
  const lock = getProviderControlLock()
  if (!lock) {
    return null
  }
  return `Provider selection is currently controlled by ${getSettingSourceName(lock.source)} settings (${lock.providerId}).`
}

export function getCurrentProviderSummary(): string {
  const info = getConfiguredModelProviderInfo()
  const currentModel =
    getSettingsForSource('userSettings')?.model ??
    info.provider.defaultModel ??
    'default'
  const authStatus =
    info.resolvedId === BUILTIN_MODEL_PROVIDER_ID
      ? 'built-in'
      : hasProviderAuth(info.resolvedId)
        ? 'configured'
        : 'missing'
  const paths = getProviderPaths()

  return [
    `Current provider: ${info.resolvedId} (${getProviderDriverLabel(info.provider.driver)})`,
    `Current model: ${currentModel}`,
    `Provider auth: ${authStatus}`,
    ...(info.provider.driver === 'openai-responses'
      ? [
          `Context window: ${getDefaultContextWindowForConfiguredProviderModel(currentModel) ?? 'default'}`,
          `Auto-compact trigger: ${getAutoCompactTokenLimitForConfiguredProviderModel(currentModel) ?? 'default'}`,
        ]
      : []),
    `Providers file: ${paths.providersPath}`,
    `Auth file: ${paths.authPath}`,
    `User settings: ${paths.settingsPath}`,
  ].join('\n')
}

export function getCodexProviderSnapshot(): CodexProviderSnapshot {
  const provider = getProviderRegistry().providers[CODEX_PROVIDER_ID]
  const auth = getProviderAuth(CODEX_PROVIDER_ID)
  const defaultModel = normalizeCodexModel(
    provider?.defaultModel ?? DEFAULT_CODEX_MODEL,
  )
  const defaultVerbosity = normalizeCodexVerbosity(
    defaultModel,
    provider?.defaultVerbosity ?? DEFAULT_CODEX_VERBOSITY,
  )
  const defaultReasoningEffort = normalizeCodexEffort(
    defaultModel,
    provider?.defaultReasoningEffort ?? DEFAULT_CODEX_EFFORT,
  )

  return {
    baseUrl: provider?.baseUrl ?? DEFAULT_CODEX_BASE_URL,
    defaultModel,
    defaultVerbosity,
    defaultReasoningEffort,
    modelContextWindow: provider?.modelContextWindow,
    modelAutoCompactTokenLimit: provider?.modelAutoCompactTokenLimit,
    configuredModelContextWindow: provider?.modelContextWindow,
    configuredModelAutoCompactTokenLimit: provider?.modelAutoCompactTokenLimit,
    resolvedModelContextWindow: provider
      ? getDefaultContextWindowForProvider(provider, defaultModel)
      : undefined,
    resolvedModelAutoCompactTokenLimit: provider
      ? getAutoCompactTokenLimitForProvider(provider, defaultModel)
      : undefined,
    hasStoredCredential: !!auth?.apiKey || !!auth?.bearerToken,
  }
}

export function isCodexProviderReady(): boolean {
  const registry = getProviderRegistry()
  const provider = registry.providers[CODEX_PROVIDER_ID]
  return (
    provider?.driver === 'openai-responses' &&
    !!provider.baseUrl &&
    hasProviderAuth(CODEX_PROVIDER_ID)
  )
}

export function switchToAnthropicProvider(): ProviderActivationResult {
  const lockMessage = getProviderControlLockMessage()
  if (lockMessage) {
    return {
      ok: false,
      message: lockMessage,
      mainLoopModel: null,
      effortLevel: undefined,
      createdFiles: [],
    }
  }

  const result = updateSettingsForSource('userSettings', {
    modelProvider: BUILTIN_MODEL_PROVIDER_ID,
    model: undefined,
    modelVerbosity: undefined,
    effortLevel: undefined,
  })

  if (result.error) {
    return {
      ok: false,
      message: `Failed to switch provider: ${result.error.message}`,
      mainLoopModel: null,
      effortLevel: undefined,
      createdFiles: [],
    }
  }

  return {
    ok: true,
    message:
      'Switched to Anthropic. Restored provider-sensitive settings to built-in defaults.',
    mainLoopModel: null,
    effortLevel: undefined,
    createdFiles: [],
  }
}

export function switchToConfiguredCodexProvider(): ProviderActivationResult {
  const lockMessage = getProviderControlLockMessage()
  if (lockMessage) {
    return {
      ok: false,
      message: lockMessage,
      mainLoopModel: null,
      effortLevel: undefined,
      createdFiles: [],
    }
  }

  if (!isCodexProviderReady()) {
    return {
      ok: false,
      message:
        'Codex is not configured yet. Run /provider and choose Configure Codex first.',
      mainLoopModel: null,
      effortLevel: undefined,
      createdFiles: [],
    }
  }

  const snapshot = getCodexProviderSnapshot()
  const result = updateSettingsForSource('userSettings', {
    modelProvider: CODEX_PROVIDER_ID,
    model: snapshot.defaultModel,
    modelVerbosity: snapshot.defaultVerbosity,
    effortLevel: snapshot.defaultReasoningEffort as EffortLevel,
  })

  if (result.error) {
    return {
      ok: false,
      message: `Failed to activate Codex: ${result.error.message}`,
      mainLoopModel: null,
      effortLevel: undefined,
      createdFiles: [],
    }
  }

  return {
    ok: true,
    message: `Switched to Codex with ${snapshot.defaultModel}.`,
    mainLoopModel: snapshot.defaultModel,
    effortLevel: snapshot.defaultReasoningEffort as EffortLevel,
    createdFiles: [],
  }
}

export function configureAndActivateCodexProvider(
  draft: CodexProviderDraft,
): ProviderActivationResult {
  const lockMessage = getProviderControlLockMessage()
  if (lockMessage) {
    return {
      ok: false,
      message: lockMessage,
      mainLoopModel: null,
      effortLevel: undefined,
      createdFiles: [],
    }
  }

  const baseUrl = draft.baseUrl.trim()
  const apiKey = draft.apiKey.trim()
  const defaultModel = normalizeCodexModel(draft.defaultModel)
  const hasStoredCredential = hasProviderAuth(CODEX_PROVIDER_ID)
  const existingAuth = getProviderAuth(CODEX_PROVIDER_ID)

  if (!baseUrl) {
    return {
      ok: false,
      message: 'Base URL is required.',
      mainLoopModel: null,
      effortLevel: undefined,
      createdFiles: [],
    }
  }

  try {
    new URL(baseUrl)
  } catch {
    return {
      ok: false,
      message: 'Base URL must be a valid URL.',
      mainLoopModel: null,
      effortLevel: undefined,
      createdFiles: [],
    }
  }

  if (!apiKey && !hasStoredCredential) {
    return {
      ok: false,
      message: 'API key is required.',
      mainLoopModel: null,
      effortLevel: undefined,
      createdFiles: [],
    }
  }

  const defaultVerbosity = normalizeCodexVerbosity(
    defaultModel,
    draft.defaultVerbosity,
  )
  const defaultReasoningEffort = normalizeCodexEffort(
    defaultModel,
    draft.defaultReasoningEffort,
  )
  const modelContextWindow = draft.modelContextWindow
  const modelAutoCompactTokenLimit = draft.modelAutoCompactTokenLimit

  if (
    modelContextWindow !== undefined &&
    (!Number.isInteger(modelContextWindow) || modelContextWindow <= 0)
  ) {
    return {
      ok: false,
      message: 'Context window must be a positive integer.',
      mainLoopModel: null,
      effortLevel: undefined,
      createdFiles: [],
    }
  }

  if (
    modelAutoCompactTokenLimit !== undefined &&
    (!Number.isInteger(modelAutoCompactTokenLimit) ||
      modelAutoCompactTokenLimit <= 0)
  ) {
    return {
      ok: false,
      message: 'Auto-compact token limit must be a positive integer.',
      mainLoopModel: null,
      effortLevel: undefined,
      createdFiles: [],
    }
  }

  const registryFileConfig = getProviderRegistryFileConfig()
  const paths = getProviderPaths()
  const createdFiles = getCreatedFiles(paths)

  saveProviderRegistry({
    ...registryFileConfig,
    authStore: 'file',
    defaultProvider: CODEX_PROVIDER_ID,
    providers: {
      ...(registryFileConfig.providers ?? {}),
      [CODEX_PROVIDER_ID]: {
        name: 'OpenAI Codex',
        driver: 'openai-responses',
        baseUrl,
        defaultModel,
        defaultVerbosity,
        defaultReasoningEffort,
        modelContextWindow,
        modelAutoCompactTokenLimit,
      },
    },
  })

  const authToPersist = apiKey
    ? { apiKey }
    : existingAuth

  if (authToPersist) {
    const authResult = saveProviderAuth(CODEX_PROVIDER_ID, authToPersist)
    if (!authResult.success) {
      return {
        ok: false,
        message:
          authResult.warning ??
          'Failed to save Codex credentials.',
        mainLoopModel: null,
        effortLevel: undefined,
        createdFiles,
      }
    }
  }

  const settingsResult = updateSettingsForSource('userSettings', {
    modelProvider: CODEX_PROVIDER_ID,
    model: defaultModel,
    modelVerbosity: defaultVerbosity,
    effortLevel: defaultReasoningEffort as EffortLevel,
  })

  if (settingsResult.error) {
    return {
      ok: false,
      message: `Failed to update user settings: ${settingsResult.error.message}`,
      mainLoopModel: null,
      effortLevel: undefined,
      createdFiles,
    }
  }

  return {
    ok: true,
    message: `Configured and activated Codex with ${defaultModel}.`,
    mainLoopModel: defaultModel,
    effortLevel: defaultReasoningEffort as EffortLevel,
    createdFiles,
  }
}
