import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import {
  clearProviderAuthStoreCache,
  getProviderAuthFilePath,
} from './utils/providerAuthStore.js'
import {
  clearProviderRegistryCache,
  getProviderRegistryPath,
} from './utils/providerRegistry.js'
import {
  CODEX_PROVIDER_ID,
  configureAndActivateCodexProvider,
  getProviderPaths,
  switchToAnthropicProvider,
  switchToConfiguredCodexProvider,
} from './utils/providerManagement.js'
import { getModelOptions } from './utils/model/modelOptions.js'
import { getSettingsFilePathForSource } from './utils/settings/settings.js'
import { resetSettingsCache } from './utils/settings/settingsCache.js'

const originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR
const originalAnthropicApiKey = process.env.ANTHROPIC_API_KEY

let tempConfigDir = ''

function resetCaches(): void {
  clearProviderRegistryCache()
  clearProviderAuthStoreCache()
  resetSettingsCache()
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf8')
}

describe('provider management', () => {
  beforeEach(() => {
    tempConfigDir = mkdtempSync(join(tmpdir(), 'provider-management-'))
    process.env.CLAUDE_CONFIG_DIR = tempConfigDir
    process.env.ANTHROPIC_API_KEY = 'sk-test-anthropic'
    resetCaches()
  })

  afterEach(() => {
    if (originalClaudeConfigDir === undefined) {
      delete process.env.CLAUDE_CONFIG_DIR
    } else {
      process.env.CLAUDE_CONFIG_DIR = originalClaudeConfigDir
    }
    if (originalAnthropicApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY
    } else {
      process.env.ANTHROPIC_API_KEY = originalAnthropicApiKey
    }
    resetCaches()
    rmSync(tempConfigDir, { recursive: true, force: true })
  })

  test('configureAndActivateCodexProvider creates missing user config files and activates GPT models', () => {
    const result = configureAndActivateCodexProvider({
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test-codex',
      defaultModel: 'gpt-5.4',
      defaultVerbosity: 'medium',
      defaultReasoningEffort: 'high',
      modelContextWindow: 1_050_000,
      modelAutoCompactTokenLimit: 700_000,
    })

    expect(result.ok).toBe(true)
    expect(result.mainLoopModel).toBe('gpt-5.4')

    const paths = getProviderPaths()
    const registry = JSON.parse(readFileSync(paths.providersPath, 'utf8'))
    const auth = JSON.parse(readFileSync(paths.authPath, 'utf8'))
    const settings = JSON.parse(readFileSync(paths.settingsPath, 'utf8'))
    const optionValues = getModelOptions().map(option => option.value)

    expect(result.createdFiles).toContain(paths.providersPath)
    expect(result.createdFiles).toContain(paths.authPath)
    expect(result.createdFiles).toContain(paths.settingsPath)
    expect(registry.authStore).toBe('file')
    expect(registry.defaultProvider).toBe(CODEX_PROVIDER_ID)
    expect(registry.providers.codex.driver).toBe('openai-responses')
    expect(registry.providers.codex.modelContextWindow).toBe(1_050_000)
    expect(registry.providers.codex.modelAutoCompactTokenLimit).toBe(700_000)
    expect(auth.providers.codex.apiKey).toBe('sk-test-codex')
    expect(settings.modelProvider).toBe('codex')
    expect(settings.model).toBe('gpt-5.4')
    expect(settings.modelVerbosity).toBe('medium')
    expect(settings.effortLevel).toBe('high')
    expect(optionValues).toContain('gpt-5.4')
    expect(optionValues).not.toContain('sonnet')
  })

  test('switchToConfiguredCodexProvider activates an already configured codex provider', () => {
    writeJson(getProviderRegistryPath(), {
      authStore: 'file',
      defaultProvider: 'codex',
      providers: {
        codex: {
          driver: 'openai-responses',
          baseUrl: 'https://api.openai.com/v1',
          defaultModel: 'gpt-5.3-codex',
          defaultVerbosity: 'high',
          defaultReasoningEffort: 'medium',
        },
      },
    })
    writeJson(getProviderAuthFilePath(), {
      providers: {
        codex: {
          apiKey: 'sk-existing-codex',
        },
      },
    })
    resetCaches()

    const result = switchToConfiguredCodexProvider()
    const settings = JSON.parse(
      readFileSync(getSettingsFilePathForSource('userSettings')!, 'utf8'),
    )

    expect(result.ok).toBe(true)
    expect(result.mainLoopModel).toBe('gpt-5.3-codex')
    expect(settings.modelProvider).toBe('codex')
    expect(settings.model).toBe('gpt-5.3-codex')
    expect(settings.modelVerbosity).toBe('high')
    expect(settings.effortLevel).toBe('medium')
  })

  test('switchToAnthropicProvider clears provider-specific user settings and restores anthropic model options', () => {
    writeJson(getSettingsFilePathForSource('userSettings')!, {
      modelProvider: 'codex',
      model: 'gpt-5.4',
      modelVerbosity: 'medium',
      effortLevel: 'high',
    })
    resetCaches()

    const result = switchToAnthropicProvider()
    const settings = JSON.parse(
      readFileSync(getSettingsFilePathForSource('userSettings')!, 'utf8'),
    )
    const optionValues = getModelOptions().map(option => option.value)

    expect(result.ok).toBe(true)
    expect(settings.modelProvider).toBe('anthropic')
    expect(settings.model).toBeUndefined()
    expect(settings.modelVerbosity).toBeUndefined()
    expect(settings.effortLevel).toBeUndefined()
    expect(optionValues).toContain('haiku')
    expect(optionValues).not.toContain('gpt-5.4')
  })
})
