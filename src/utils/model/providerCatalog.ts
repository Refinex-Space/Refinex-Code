import { getInitialSettings } from '../settings/settings.js'
import {
  getConfiguredModelProviderInfo,
  type ProviderDefinition,
  type ProviderVerbosity,
} from '../providerRegistry.js'

export type ProviderEffortLevel =
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'max'
  | 'xhigh'

export type ProviderModelCatalogEntry = {
  id: string
  label: string
  description: string
  supportedEffortLevels?: ProviderEffortLevel[]
  defaultEffortLevel?: ProviderEffortLevel
  supportedVerbosityLevels?: ProviderVerbosity[]
  defaultVerbosity?: ProviderVerbosity
  defaultContextWindowTokens?: number
  supportsFastMode?: boolean
  supportsAutoMode?: boolean
}

export const OPENAI_RESPONSES_CONTEXT_WINDOW_DEFAULT = 272_000
export const OPENAI_RESPONSES_AUTO_COMPACT_CLAMP_PERCENT = 90

const OPENAI_RESPONSES_MODEL_CATALOG: ProviderModelCatalogEntry[] = [
  {
    id: 'gpt-5.4',
    label: 'GPT-5.4',
    description: 'Best default for general coding and planning',
    supportedEffortLevels: ['minimal', 'low', 'medium', 'high', 'xhigh'],
    defaultEffortLevel: 'medium',
    supportedVerbosityLevels: ['low', 'medium', 'high'],
    defaultVerbosity: 'medium',
    defaultContextWindowTokens: 272_000,
    supportsAutoMode: true,
  },
  {
    id: 'gpt-5.3-codex',
    label: 'GPT-5.3-Codex',
    description: 'Coding-optimized Responses model for agentic work',
    supportedEffortLevels: ['low', 'medium', 'high', 'xhigh'],
    defaultEffortLevel: 'medium',
    supportedVerbosityLevels: ['low', 'medium', 'high'],
    defaultVerbosity: 'medium',
    defaultContextWindowTokens: 272_000,
    supportsAutoMode: true,
  },
  {
    id: 'gpt-5.4-mini',
    label: 'GPT-5.4 Mini',
    description: 'Faster and lighter for routine coding tasks',
    supportedEffortLevels: ['minimal', 'low', 'medium', 'high'],
    defaultEffortLevel: 'low',
    supportedVerbosityLevels: ['low', 'medium', 'high'],
    defaultVerbosity: 'medium',
    defaultContextWindowTokens: OPENAI_RESPONSES_CONTEXT_WINDOW_DEFAULT,
    supportsAutoMode: true,
  },
  {
    id: 'gpt-5-pro',
    label: 'GPT-5 Pro',
    description: 'Highest-end reasoning for the hardest tasks',
    supportedEffortLevels: ['high'],
    defaultEffortLevel: 'high',
    supportedVerbosityLevels: ['low', 'medium', 'high'],
    defaultVerbosity: 'medium',
    defaultContextWindowTokens: OPENAI_RESPONSES_CONTEXT_WINDOW_DEFAULT,
    supportsAutoMode: true,
  },
]

function getModelCatalogForProviderDriver(
  driver: string,
): ProviderModelCatalogEntry[] {
  if (driver === 'openai-responses') {
    return OPENAI_RESPONSES_MODEL_CATALOG
  }
  return []
}

function findCatalogEntryById(
  entries: ProviderModelCatalogEntry[],
  model: string,
): ProviderModelCatalogEntry | undefined {
  const normalized = model.toLowerCase()
  return entries.find(entry => entry.id.toLowerCase() === normalized)
}

export function isConfiguredOpenAIResponsesProvider(): boolean {
  return getConfiguredModelProviderInfo().provider.driver === 'openai-responses'
}

export function getConfiguredProviderModelCatalog(): ProviderModelCatalogEntry[] {
  return getModelCatalogForProviderDriver(
    getConfiguredModelProviderInfo().provider.driver,
  )
}

export function getProviderModelCatalogForDriver(
  driver: string,
): ProviderModelCatalogEntry[] {
  return getModelCatalogForProviderDriver(driver)
}

export function getDefaultContextWindowForProviderDriver(
  driver: string,
): number | undefined {
  if (driver === 'openai-responses') {
    return OPENAI_RESPONSES_CONTEXT_WINDOW_DEFAULT
  }
  return undefined
}

export function getConfiguredProviderDefaultModelId(): string | undefined {
  const configured = getConfiguredModelProviderInfo()
  return (
    configured.provider.defaultModel ?? getConfiguredProviderModelCatalog()[0]?.id
  )
}

export function getDefaultContextWindowForConfiguredProviderModel(
  model: string,
): number | undefined {
  const configured = getConfiguredModelProviderInfo()
  return getDefaultContextWindowForProvider(configured.provider, model)
}

export function getDefaultContextWindowForProvider(
  provider: Pick<ProviderDefinition, 'driver' | 'modelContextWindow'>,
  model: string,
): number | undefined {
  const catalog = getModelCatalogForProviderDriver(provider.driver)
  return (
    provider.modelContextWindow ??
    findCatalogEntryById(catalog, model)?.defaultContextWindowTokens ??
    getDefaultContextWindowForProviderDriver(provider.driver)
  )
}

export function getAutoCompactTokenLimitForConfiguredProviderModel(
  model: string,
): number | undefined {
  const configured = getConfiguredModelProviderInfo()
  return getAutoCompactTokenLimitForProvider(configured.provider, model)
}

export function getAutoCompactTokenLimitForProvider(
  provider: Pick<
    ProviderDefinition,
    'driver' | 'modelContextWindow' | 'modelAutoCompactTokenLimit'
  >,
  model: string,
): number | undefined {
  const contextWindow = getDefaultContextWindowForProvider(provider, model)
  const configuredLimit = provider.modelAutoCompactTokenLimit

  if (contextWindow === undefined) {
    return configuredLimit
  }

  const clampedLimit = Math.floor(
    (contextWindow * OPENAI_RESPONSES_AUTO_COMPACT_CLAMP_PERCENT) / 100,
  )

  if (configuredLimit === undefined) {
    return clampedLimit
  }

  return Math.min(configuredLimit, clampedLimit)
}

export function getConfiguredProviderModelCatalogEntry(
  model: string,
): ProviderModelCatalogEntry | undefined {
  return findCatalogEntryById(getConfiguredProviderModelCatalog(), model)
}

export function getSupportedEffortLevelsForConfiguredProviderModel(
  model: string,
): ProviderEffortLevel[] | undefined {
  return getConfiguredProviderModelCatalogEntry(model)?.supportedEffortLevels
}

export function getDefaultEffortLevelForConfiguredProviderModel(
  model: string,
): ProviderEffortLevel | undefined {
  const supported = getSupportedEffortLevelsForConfiguredProviderModel(model)
  const configuredDefault = getConfiguredModelProviderInfo().provider.defaultReasoningEffort

  if (
    configuredDefault &&
    (!supported || supported.includes(configuredDefault as ProviderEffortLevel))
  ) {
    return configuredDefault as ProviderEffortLevel
  }

  return getConfiguredProviderModelCatalogEntry(model)?.defaultEffortLevel
}

export function getSupportedVerbosityLevelsForConfiguredProviderModel(
  model: string,
): ProviderVerbosity[] | undefined {
  return getConfiguredProviderModelCatalogEntry(model)?.supportedVerbosityLevels
}

export function getDefaultVerbosityForConfiguredProviderModel(
  model: string,
): ProviderVerbosity | undefined {
  const configured = getConfiguredModelProviderInfo()
  const settingsVerbosity = getInitialSettings().modelVerbosity
  const supported = getSupportedVerbosityLevelsForConfiguredProviderModel(model)

  if (settingsVerbosity) {
    if (!supported || supported.includes(settingsVerbosity)) {
      return settingsVerbosity
    }
  }

  if (
    configured.provider.defaultVerbosity &&
    (!supported || supported.includes(configured.provider.defaultVerbosity))
  ) {
    return configured.provider.defaultVerbosity
  }

  const catalogDefault = getConfiguredProviderModelCatalogEntry(model)?.defaultVerbosity
  if (catalogDefault && (!supported || supported.includes(catalogDefault))) {
    return catalogDefault
  }

  if (settingsVerbosity) {
    return settingsVerbosity
  }
  return configured.provider.defaultVerbosity
}

export function getOpenAIReasoningEffortForAPI(
  model: string,
  effort: ProviderEffortLevel | undefined,
): 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | undefined {
  if (!effort) return undefined

  const normalizedModel = model.toLowerCase()

  // 官方 GPT-5.4 / GPT-5.2 文档强调 `none`，而 Codex 配置面暴露 `minimal`。
  // 这里将最轻量的用户语义映射到实际 API 兼容值。
  if (effort === 'minimal') {
    if (normalizedModel.includes('gpt-5.4') || normalizedModel.includes('gpt-5.2')) {
      return 'none'
    }
    return 'minimal'
  }

  if (effort === 'max') {
    return 'xhigh'
  }

  return effort
}
