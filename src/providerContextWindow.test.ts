import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { getAutoCompactThreshold } from './services/compact/autoCompact.js'
import { getContextWindowForModel } from './utils/context.js'
import {
  clearProviderRegistryCache,
  getProviderRegistryPath,
} from './utils/providerRegistry.js'
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

describe('provider context window configuration', () => {
  beforeEach(() => {
    tempConfigDir = mkdtempSync(join(tmpdir(), 'provider-context-window-'))
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

  test('uses Codex-compatible defaults when the configured provider is openai-responses', () => {
    writeJson(getProviderRegistryPath(), {
      defaultProvider: 'codex',
      providers: {
        codex: {
          driver: 'openai-responses',
          baseUrl: 'https://api.openai.com/v1',
          defaultModel: 'gpt-5.4',
        },
      },
    })
    writeJson(join(tempConfigDir, 'settings.json'), {
      modelProvider: 'codex',
    })
    resetCaches()

    expect(getContextWindowForModel('gpt-5.4')).toBe(272_000)
    expect(getAutoCompactThreshold('gpt-5.4')).toBe(244_800)
  })

  test('uses configured provider overrides for context window and auto-compact threshold', () => {
    writeJson(getProviderRegistryPath(), {
      defaultProvider: 'codex',
      providers: {
        codex: {
          driver: 'openai-responses',
          baseUrl: 'https://api.openai.com/v1',
          defaultModel: 'gpt-5.4',
          modelContextWindow: 1_050_000,
          modelAutoCompactTokenLimit: 700_000,
        },
      },
    })
    writeJson(join(tempConfigDir, 'settings.json'), {
      modelProvider: 'codex',
    })
    resetCaches()

    expect(getContextWindowForModel('gpt-5.4')).toBe(1_050_000)
    expect(getAutoCompactThreshold('gpt-5.4')).toBe(700_000)
  })

  test('clamps configured auto-compact threshold to 90 percent of the configured context window', () => {
    writeJson(getProviderRegistryPath(), {
      defaultProvider: 'codex',
      providers: {
        codex: {
          driver: 'openai-responses',
          baseUrl: 'https://api.openai.com/v1',
          defaultModel: 'gpt-5.4',
          modelContextWindow: 1_050_000,
          modelAutoCompactTokenLimit: 2_000_000,
        },
      },
    })
    writeJson(join(tempConfigDir, 'settings.json'), {
      modelProvider: 'codex',
    })
    resetCaches()

    expect(getAutoCompactThreshold('gpt-5.4')).toBe(945_000)
  })
})
