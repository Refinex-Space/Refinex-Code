import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import {
  getRuntimeProviderAdapter,
  getRuntimeProviderAdapterSelection,
} from './services/api/providerAdapter.js'
import { clearProviderRegistryCache, getProviderRegistryPath } from './utils/providerRegistry.js'
import { resetSettingsCache } from './utils/settings/settingsCache.js'

const originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR

let tempConfigDir = ''

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf8')
}

function resetCaches(): void {
  clearProviderRegistryCache()
  resetSettingsCache()
}

describe('provider adapter selection', () => {
  beforeEach(() => {
    tempConfigDir = mkdtempSync(join(tmpdir(), 'provider-adapter-'))
    process.env.CLAUDE_CONFIG_DIR = tempConfigDir
    resetCaches()
  })

  afterEach(() => {
    if (originalClaudeConfigDir === undefined) {
      delete process.env.CLAUDE_CONFIG_DIR
    } else {
      process.env.CLAUDE_CONFIG_DIR = originalClaudeConfigDir
    }
    resetCaches()
    rmSync(tempConfigDir, { recursive: true, force: true })
  })

  test('selects the anthropic adapter directly for the built-in provider', () => {
    const selection = getRuntimeProviderAdapterSelection()

    expect(selection.mode).toBe('direct')
    expect(selection.adapterId).toBe('anthropic')
    expect(selection.adapterDriver).toBe('anthropic-messages')
    expect(getRuntimeProviderAdapter().id).toBe('anthropic')
  })

  test('selects the openai responses adapter when the configured provider driver is supported', () => {
    writeJson(getProviderRegistryPath(), {
      defaultProvider: 'codex',
      providers: {
        codex: {
          driver: 'openai-responses',
          baseUrl: 'https://api.openai.com/v1',
        },
      },
    })

    resetCaches()

    const selection = getRuntimeProviderAdapterSelection()

    expect(selection.mode).toBe('direct')
    expect(selection.configuredProviderId).toBe('codex')
    expect(selection.adapterId).toBe('openai-responses')
    expect(selection.adapterDriver).toBe('openai-responses')
  })
})
