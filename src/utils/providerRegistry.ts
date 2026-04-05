import { chmodSync } from 'fs'
import memoize from 'lodash-es/memoize.js'
import { dirname, join } from 'path'
import { z } from 'zod/v4'
import { logForDebugging } from './debug.js'
import { getClaudeConfigHomeDir } from './envUtils.js'
import { getErrnoCode } from './errors.js'
import { getFsImplementation } from './fsOperations.js'
import { safeParseJSON } from './json.js'
import { getSettingsForSource } from './settings/settings.js'
import { jsonStringify } from './slowOperations.js'
import { writeFileSyncAndFlush_DEPRECATED } from './file.js'

export const BUILTIN_MODEL_PROVIDER_ID = 'anthropic'

export const ProviderDriverSchema = z.enum([
  'anthropic-messages',
  'openai-responses',
])

export const ProviderReasoningEffortSchema = z.enum([
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
])

export const ProviderVerbositySchema = z.enum(['low', 'medium', 'high'])

export const ProviderAuthStoreModeSchema = z.enum(['auto', 'keychain', 'file'])

export const ProviderDefinitionSchema = z.object({
  name: z.string().optional(),
  driver: ProviderDriverSchema,
  baseUrl: z.string().url().optional(),
  defaultModel: z.string().optional(),
  defaultReasoningEffort: ProviderReasoningEffortSchema.optional(),
  defaultVerbosity: ProviderVerbositySchema.optional(),
  modelContextWindow: z.number().int().positive().optional(),
  modelAutoCompactTokenLimit: z.number().int().positive().optional(),
  queryParams: z.record(z.string(), z.string()).optional(),
  httpHeaders: z.record(z.string(), z.string()).optional(),
})

export const ProviderRegistryFileSchema = z.object({
  $schema: z.string().optional(),
  authStore: ProviderAuthStoreModeSchema.optional(),
  defaultProvider: z.string().optional(),
  providers: z.record(z.string(), ProviderDefinitionSchema).optional(),
})

export type ProviderDriver = z.infer<typeof ProviderDriverSchema>
export type ProviderReasoningEffort = z.infer<
  typeof ProviderReasoningEffortSchema
>
export type ProviderVerbosity = z.infer<typeof ProviderVerbositySchema>
export type ProviderAuthStoreMode = z.infer<typeof ProviderAuthStoreModeSchema>
export type ProviderDefinition = z.infer<typeof ProviderDefinitionSchema>
export type ProviderRegistryFile = z.infer<typeof ProviderRegistryFileSchema>
export type ResolvedProviderRegistry = Omit<
  ProviderRegistryFile,
  'authStore' | 'defaultProvider' | 'providers'
> & {
  authStore: ProviderAuthStoreMode
  defaultProvider: string
  providers: Record<string, ProviderDefinition>
}

export type ConfiguredModelProviderInfo = {
  requestedId?: string
  resolvedId: string
  source: 'settings' | 'registry-default' | 'builtin-default'
  warning?: 'unknown-provider'
  provider: ProviderDefinition
}

function getBuiltInProviders(): Record<string, ProviderDefinition> {
  return {
    [BUILTIN_MODEL_PROVIDER_ID]: {
      name: 'Anthropic',
      driver: 'anthropic-messages',
      baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
      defaultModel: 'claude-sonnet-4-6',
      defaultReasoningEffort: 'high',
    },
  }
}

export function getProviderRegistryPath(): string {
  return join(getClaudeConfigHomeDir(), 'providers.json')
}

function loadProviderRegistryFileUncached(): ProviderRegistryFile {
  const path = getProviderRegistryPath()
  try {
    const content = getFsImplementation().readFileSync(path, {
      encoding: 'utf8',
    })
    if (!content.trim()) {
      return {}
    }

    const parsed = safeParseJSON(content, false)
    const result = ProviderRegistryFileSchema.safeParse(parsed)
    if (result.success) {
      return result.data
    }

    logForDebugging(
      `[providerRegistry] Ignoring invalid providers.json at ${path}`,
      { level: 'warn' },
    )
  } catch (error) {
    const code = getErrnoCode(error)
    if (code !== 'ENOENT') {
      logForDebugging(
        `[providerRegistry] Failed to read providers.json at ${path}: ${String(error)}`,
        { level: 'warn' },
      )
    }
  }

  return {}
}

const loadProviderRegistryFile = memoize(
  (): ProviderRegistryFile => loadProviderRegistryFileUncached(),
)

export function clearProviderRegistryCache(): void {
  loadProviderRegistryFile.cache?.clear?.()
}

export function getProviderRegistryFileConfig(): ProviderRegistryFile {
  return loadProviderRegistryFile()
}

export function getProviderRegistry(): ResolvedProviderRegistry {
  const fileConfig = loadProviderRegistryFile()
  const providers = {
    ...getBuiltInProviders(),
    ...(fileConfig.providers ?? {}),
  }
  const defaultProvider =
    fileConfig.defaultProvider && providers[fileConfig.defaultProvider]
      ? fileConfig.defaultProvider
      : BUILTIN_MODEL_PROVIDER_ID

  return {
    ...fileConfig,
    authStore: fileConfig.authStore ?? 'auto',
    defaultProvider,
    providers,
  }
}

export function saveProviderRegistry(config: ProviderRegistryFile): void {
  const path = getProviderRegistryPath()
  const dir = dirname(path)
  try {
    getFsImplementation().mkdirSync(dir)
  } catch (error) {
    if (getErrnoCode(error) !== 'EEXIST') {
      throw error
    }
  }

  writeFileSyncAndFlush_DEPRECATED(
    path,
    jsonStringify(config, null, 2) + '\n',
    { encoding: 'utf8' },
  )

  try {
    chmodSync(path, 0o600)
  } catch {
    // 忽略非 POSIX 文件系统上的 chmod 失败
  }

  clearProviderRegistryCache()
}

function getTrustedModelProviderSetting(): string | undefined {
  return (
    getSettingsForSource('policySettings')?.modelProvider ??
    getSettingsForSource('flagSettings')?.modelProvider ??
    getSettingsForSource('userSettings')?.modelProvider
  )
}

export function getConfiguredModelProviderInfo(): ConfiguredModelProviderInfo {
  const registry = getProviderRegistry()
  const requestedId = getTrustedModelProviderSetting()

  if (requestedId && registry.providers[requestedId]) {
    return {
      requestedId,
      resolvedId: requestedId,
      source: 'settings',
      provider: registry.providers[requestedId]!,
    }
  }

  const resolvedId = registry.providers[registry.defaultProvider]
    ? registry.defaultProvider
    : BUILTIN_MODEL_PROVIDER_ID

  return {
    requestedId,
    resolvedId,
    source: requestedId ? 'settings' : resolvedId === registry.defaultProvider
      ? 'registry-default'
      : 'builtin-default',
    ...(requestedId ? { warning: 'unknown-provider' as const } : {}),
    provider: registry.providers[resolvedId] ?? getBuiltInProviders()[BUILTIN_MODEL_PROVIDER_ID]!,
  }
}

export function getConfiguredModelProviderId(): string {
  return getConfiguredModelProviderInfo().resolvedId
}

export function getProviderDriverLabel(driver: ProviderDriver): string {
  switch (driver) {
    case 'anthropic-messages':
      return 'Anthropic Messages'
    case 'openai-responses':
      return 'OpenAI Responses'
  }
}
