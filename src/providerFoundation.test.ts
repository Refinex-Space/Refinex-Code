import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import {
  clearProviderAuthStoreCache,
  deleteProviderAuth,
  getProviderAuth,
  getProviderAuthFilePath,
  getProviderAuthStoreInfo,
  hasProviderAuth,
  saveProviderAuth,
} from './utils/providerAuthStore.js'
import {
  clearProviderRegistryCache,
  getConfiguredModelProviderInfo,
  getProviderRegistry,
  getProviderRegistryPath,
} from './utils/providerRegistry.js'
import { resetSettingsCache } from './utils/settings/settingsCache.js'
import { buildAPIProviderProperties } from './utils/status.tsx'

const originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR

let tempConfigDir = ''

function resetTestCaches(): void {
  clearProviderRegistryCache()
  clearProviderAuthStoreCache()
  resetSettingsCache()
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf8')
}

describe('provider foundation', () => {
  beforeEach(() => {
    tempConfigDir = mkdtempSync(join(tmpdir(), 'provider-foundation-'))
    process.env.CLAUDE_CONFIG_DIR = tempConfigDir
    resetTestCaches()
  })

  afterEach(() => {
    if (originalClaudeConfigDir === undefined) {
      delete process.env.CLAUDE_CONFIG_DIR
    } else {
      process.env.CLAUDE_CONFIG_DIR = originalClaudeConfigDir
    }
    resetTestCaches()
    rmSync(tempConfigDir, { recursive: true, force: true })
  })

  test('falls back to the built-in anthropic provider when providers.json is missing', () => {
    const registry = getProviderRegistry()

    expect(registry.defaultProvider).toBe('anthropic')
    expect(registry.providers.anthropic?.driver).toBe('anthropic-messages')
  })

  test('loads providers.json and resolves the configured model provider from user settings', () => {
    writeJson(getProviderRegistryPath(), {
      defaultProvider: 'anthropic',
      providers: {
        codex: {
          driver: 'openai-responses',
          baseUrl: 'https://api.openai.com/v1',
          defaultModel: 'gpt-5.4',
          defaultReasoningEffort: 'high',
        },
      },
    })
    writeJson(join(tempConfigDir, 'settings.json'), {
      modelProvider: 'codex',
    })

    resetTestCaches()

    const info = getConfiguredModelProviderInfo()

    expect(info.requestedId).toBe('codex')
    expect(info.resolvedId).toBe('codex')
    expect(info.source).toBe('settings')
    expect(info.provider.driver).toBe('openai-responses')
  })

  test('falls back to the registry default when modelProvider points to an unknown provider', () => {
    writeJson(getProviderRegistryPath(), {
      defaultProvider: 'codex',
      providers: {
        codex: {
          driver: 'openai-responses',
          baseUrl: 'https://api.openai.com/v1',
        },
      },
    })
    writeJson(join(tempConfigDir, 'settings.json'), {
      modelProvider: 'missing-provider',
    })

    resetTestCaches()

    const info = getConfiguredModelProviderInfo()

    expect(info.requestedId).toBe('missing-provider')
    expect(info.resolvedId).toBe('codex')
    expect(info.warning).toBe('unknown-provider')
  })

  test('uses auth.json file backend for provider auth roundtrip when authStore=file', () => {
    writeJson(getProviderRegistryPath(), {
      authStore: 'file',
      defaultProvider: 'codex',
      providers: {
        codex: {
          driver: 'openai-responses',
          baseUrl: 'https://api.openai.com/v1',
        },
      },
    })

    resetTestCaches()

    const saveResult = saveProviderAuth('codex', { apiKey: 'sk-test-123' })

    expect(saveResult.success).toBe(true)
    expect(getProviderAuthStoreInfo().resolvedBackend).toBe('file')
    expect(hasProviderAuth('codex')).toBe(true)
    expect(getProviderAuth('codex')?.apiKey).toBe('sk-test-123')

    const authFile = JSON.parse(readFileSync(getProviderAuthFilePath(), 'utf8'))
    expect(authFile.providers.codex.apiKey).toBe('sk-test-123')

    expect(deleteProviderAuth('codex')).toBe(true)
    expect(hasProviderAuth('codex')).toBe(false)
  })

  test('builds status properties for a configured non-anthropic provider without changing runtime provider', () => {
    writeJson(getProviderRegistryPath(), {
      authStore: 'file',
      defaultProvider: 'codex',
      providers: {
        codex: {
          driver: 'openai-responses',
          baseUrl: 'https://api.openai.com/v1',
        },
      },
    })

    resetTestCaches()

    const properties = buildAPIProviderProperties()
    const labels = properties.map(property => property.label)
    const configuredProvider = properties.find(
      property => property.label === 'Configured model provider',
    )
    const runtimeAdapter = properties.find(
      property => property.label === 'Runtime adapter',
    )

    expect(labels).toContain('Configured model provider')
    expect(labels).toContain('Runtime adapter')
    expect(String(configuredProvider?.value)).toContain('codex')
    expect(String(runtimeAdapter?.value)).toContain('openai-responses')
  })
})
