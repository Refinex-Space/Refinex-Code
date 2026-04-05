import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { getSupportedEffortLevelsForModel } from './utils/effort.js'
import { getDefaultMainLoopModelSetting } from './utils/model/model.js'
import {
  getModelOptions,
  type ModelOption,
} from './utils/model/modelOptions.js'
import {
  getOpenAIReasoningEffortForAPI,
} from './utils/model/providerCatalog.js'
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

function getOptionValues(options: ModelOption[]): Array<string | null> {
  return options.map(option => option.value)
}

describe('provider-aware model catalog', () => {
  beforeEach(() => {
    tempConfigDir = mkdtempSync(join(tmpdir(), 'provider-model-catalog-'))
    process.env.CLAUDE_CONFIG_DIR = tempConfigDir

    writeJson(getProviderRegistryPath(), {
      defaultProvider: 'codex',
      providers: {
        codex: {
          driver: 'openai-responses',
          baseUrl: 'https://api.openai.com/v1',
          defaultModel: 'gpt-5.4',
          defaultReasoningEffort: 'high',
          defaultVerbosity: 'low',
        },
      },
    })
    writeJson(join(tempConfigDir, 'settings.json'), {
      modelProvider: 'codex',
    })

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

  test('uses the configured provider default model for the main loop', () => {
    expect(getDefaultMainLoopModelSetting()).toBe('gpt-5.4')
  })

  test('returns GPT model picker options for the configured provider', () => {
    const options = getModelOptions()
    const values = getOptionValues(options)

    expect(values).toContain(null)
    expect(values).toContain('gpt-5.4')
    expect(values).toContain('gpt-5.3-codex')
    expect(values).not.toContain('sonnet')
    expect(values).not.toContain('opus')
  })

  test('exposes provider-aware effort levels for GPT models', () => {
    expect(getSupportedEffortLevelsForModel('gpt-5.4')).toContain('xhigh')
    expect(getSupportedEffortLevelsForModel('gpt-5.4')).toContain('minimal')
  })

  test('maps minimal reasoning to the OpenAI none API value for GPT-5.4', () => {
    expect(getOpenAIReasoningEffortForAPI('gpt-5.4', 'minimal')).toBe('none')
  })
})
