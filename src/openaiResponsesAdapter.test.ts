import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import {
  queryModelWithoutStreaming,
  queryWithModel,
} from './services/api/providerAdapter.js'
import { BashTool } from './tools/BashTool/BashTool.js'
import { createUserMessage } from './utils/messages.js'
import { sideQuery } from './utils/sideQuery.js'
import {
  clearProviderAuthStoreCache,
  getProviderAuthFilePath,
} from './utils/providerAuthStore.js'
import {
  clearProviderRegistryCache,
  getProviderRegistryPath,
} from './utils/providerRegistry.js'
import { resetSettingsCache } from './utils/settings/settingsCache.js'
import { asSystemPrompt } from './utils/systemPromptType.js'

const originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR
const originalFetch = globalThis.fetch
const originalMacro = (globalThis as { MACRO?: { VERSION?: string } }).MACRO

let tempConfigDir = ''

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf8')
}

function setupOpenAIProvider(): void {
  writeJson(getProviderRegistryPath(), {
    authStore: 'file',
    defaultProvider: 'codex',
    providers: {
      codex: {
        driver: 'openai-responses',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-5.4',
        defaultReasoningEffort: 'high',
      },
    },
  })
  writeJson(getProviderAuthFilePath(), {
    providers: {
      codex: {
        apiKey: 'sk-test-openai',
      },
    },
  })
  writeJson(join(tempConfigDir, 'settings.json'), {
    modelProvider: 'codex',
  })
  clearProviderRegistryCache()
  clearProviderAuthStoreCache()
  resetSettingsCache()
}

describe('openai responses adapter', () => {
  beforeEach(() => {
    tempConfigDir = mkdtempSync(join(tmpdir(), 'openai-adapter-'))
    process.env.CLAUDE_CONFIG_DIR = tempConfigDir
    ;(globalThis as { MACRO?: { VERSION?: string } }).MACRO = {
      VERSION: 'test',
    }
    setupOpenAIProvider()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    if (originalMacro === undefined) {
      delete (globalThis as { MACRO?: { VERSION?: string } }).MACRO
    } else {
      ;(globalThis as { MACRO?: { VERSION?: string } }).MACRO = originalMacro
    }
    if (originalClaudeConfigDir === undefined) {
      delete process.env.CLAUDE_CONFIG_DIR
    } else {
      process.env.CLAUDE_CONFIG_DIR = originalClaudeConfigDir
    }
    clearProviderRegistryCache()
    clearProviderAuthStoreCache()
    resetSettingsCache()
    rmSync(tempConfigDir, { recursive: true, force: true })
  })

  test('maps a text response into an assistant message and sends provider auth', async () => {
    let capturedInput: RequestInfo | URL | undefined
    let capturedInit: RequestInit | undefined
    const fetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedInput = input
      capturedInit = init
      return new Response(
        JSON.stringify({
          id: 'resp_123',
          model: 'gpt-5.4',
          output: [
            {
              id: 'msg_123',
              type: 'message',
              role: 'assistant',
              content: [
                {
                  type: 'output_text',
                  text: 'hello from openai',
                },
              ],
            },
          ],
          usage: {
            input_tokens: 10,
            output_tokens: 5,
            output_tokens_details: {
              reasoning_tokens: 0,
            },
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    })

    globalThis.fetch = fetchMock as typeof fetch

    const result = await queryWithModel({
      systemPrompt: asSystemPrompt(['system prompt']),
      userPrompt: 'hi',
      signal: new AbortController().signal,
      options: {
        model: 'gpt-5.4',
        isNonInteractiveSession: true,
        hasAppendSystemPrompt: false,
        querySource: 'sdk',
        agents: [],
        mcpTools: [],
        async getToolPermissionContext() {
          return {
            mode: 'default',
            additionalWorkingDirectories: new Map(),
            alwaysAllowRules: {},
            alwaysDenyRules: {},
            alwaysAskRules: {},
            isBypassPermissionsModeAvailable: false,
          }
        },
      },
    })

    expect(result.requestId).toBe('resp_123')
    expect(result.message.model).toBe('gpt-5.4')
    expect(result.message.content[0]).toMatchObject({
      type: 'text',
      text: 'hello from openai',
    })
    expect(String(capturedInput)).toBe('https://api.openai.com/v1/responses')
    expect(new Headers(capturedInit?.headers).get('Authorization')).toBe(
      'Bearer sk-test-openai',
    )
    const body = JSON.parse(String(capturedInit?.body))
    expect(body.model).toBe('gpt-5.4')
    expect(body.instructions).toContain('system prompt')
    expect(body.input[0].role).toBe('user')
    expect(body.reasoning).toEqual({
      effort: 'high',
    })
    expect(body.text).toEqual({
      verbosity: 'medium',
    })
  })

  test('maps minimal effort to the OpenAI none value and uses configured verbosity overrides', async () => {
    writeJson(getProviderRegistryPath(), {
      authStore: 'file',
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
      modelVerbosity: 'high',
    })
    clearProviderRegistryCache()
    clearProviderAuthStoreCache()
    resetSettingsCache()

    let capturedInit: RequestInit | undefined
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init
      return new Response(
        JSON.stringify({
          id: 'resp_effort',
          model: 'gpt-5.4',
          output: [
            {
              id: 'msg_effort',
              type: 'message',
              role: 'assistant',
              content: [
                {
                  type: 'output_text',
                  text: 'effort response',
                },
              ],
            },
          ],
          usage: {
            input_tokens: 4,
            output_tokens: 2,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }) as typeof fetch

    await queryWithModel({
      systemPrompt: asSystemPrompt(['system prompt']),
      userPrompt: 'hi',
      signal: new AbortController().signal,
      options: {
        model: 'gpt-5.4',
        effortValue: 'minimal',
        isNonInteractiveSession: true,
        hasAppendSystemPrompt: false,
        querySource: 'sdk',
        agents: [],
        mcpTools: [],
        async getToolPermissionContext() {
          return {
            mode: 'default',
            additionalWorkingDirectories: new Map(),
            alwaysAllowRules: {},
            alwaysDenyRules: {},
            alwaysAskRules: {},
            isBypassPermissionsModeAvailable: false,
          }
        },
      },
    })

    const body = JSON.parse(String(capturedInit?.body))
    expect(body.reasoning).toEqual({
      effort: 'none',
    })
    expect(body.text).toEqual({
      verbosity: 'high',
    })
  })

  test('maps function_call output items into tool_use blocks', async () => {
    const fetchMock = mock(async () => {
      return new Response(
        JSON.stringify({
          id: 'resp_456',
          model: 'gpt-5.4',
          output: [
            {
              type: 'function_call',
              id: 'fc_1',
              call_id: 'call_1',
              name: 'read_file',
              arguments: '{"file_path":"README.md"}',
            },
          ],
          usage: {
            input_tokens: 12,
            output_tokens: 7,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    })

    globalThis.fetch = fetchMock as typeof fetch

    const result = await queryModelWithoutStreaming({
      messages: [createUserMessage({ content: 'read the file' })],
      systemPrompt: asSystemPrompt(['system prompt']),
      thinkingConfig: { type: 'disabled' },
      tools: [],
      signal: new AbortController().signal,
      options: {
        model: 'gpt-5.4',
        isNonInteractiveSession: true,
        hasAppendSystemPrompt: false,
        querySource: 'sdk',
        agents: [],
        mcpTools: [],
        extraToolSchemas: [
          {
            type: 'custom',
            name: 'read_file',
            description: 'Read a file',
            input_schema: {
              type: 'object',
              properties: {
                file_path: { type: 'string' },
              },
              required: ['file_path'],
            },
          } as never,
        ],
        async getToolPermissionContext() {
          return {
            mode: 'default',
            additionalWorkingDirectories: new Map(),
            alwaysAllowRules: {},
            alwaysDenyRules: {},
            alwaysAskRules: {},
            isBypassPermissionsModeAvailable: false,
          }
        },
      },
    })

    expect(result.message.stop_reason).toBe('tool_use')
    expect(result.message.content[0]).toMatchObject({
      type: 'tool_use',
      id: 'call_1',
      name: 'read_file',
      input: {
        file_path: 'README.md',
      },
    })
  })

  test('normalizes strict built-in tool schemas for OpenAI function calling', async () => {
    let capturedInit: RequestInit | undefined
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init
      return new Response(
        JSON.stringify({
          id: 'resp_schema',
          model: 'gpt-5.4',
          output: [
            {
              id: 'msg_schema',
              type: 'message',
              role: 'assistant',
              content: [
                {
                  type: 'output_text',
                  text: 'schema ok',
                },
              ],
            },
          ],
          usage: {
            input_tokens: 3,
            output_tokens: 1,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }) as typeof fetch

    await queryModelWithoutStreaming({
      messages: [createUserMessage({ content: 'echo hello' })],
      systemPrompt: asSystemPrompt(['system prompt']),
      thinkingConfig: { type: 'disabled' },
      tools: [BashTool],
      signal: new AbortController().signal,
      options: {
        model: 'gpt-5.4',
        isNonInteractiveSession: true,
        hasAppendSystemPrompt: false,
        querySource: 'sdk',
        agents: [],
        mcpTools: [],
        async getToolPermissionContext() {
          return {
            mode: 'default',
            additionalWorkingDirectories: new Map(),
            alwaysAllowRules: {},
            alwaysDenyRules: {},
            alwaysAskRules: {},
            isBypassPermissionsModeAvailable: false,
          }
        },
      },
    })

    const body = JSON.parse(String(capturedInit?.body))
    const bashTool = body.tools.find(
      (tool: { name?: string }) => tool.name === 'Bash',
    )

    expect(bashTool.strict).toBe(true)
    expect(bashTool.parameters.additionalProperties).toBe(false)
    expect(bashTool.parameters.required).toContain('command')
    expect(bashTool.parameters.required).toContain('dangerouslyDisableSandbox')
    expect(bashTool.parameters.properties.command.type).toBe('string')
    expect(bashTool.parameters.properties.dangerouslyDisableSandbox.type).toEqual([
      'boolean',
      'null',
    ])
  })

  test('normalizes non-strict object schemas to include empty properties', async () => {
    let capturedInit: RequestInit | undefined
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init
      return new Response(
        JSON.stringify({
          id: 'resp_non_strict_schema',
          model: 'gpt-5.4',
          output: [
            {
              id: 'msg_non_strict_schema',
              type: 'message',
              role: 'assistant',
              content: [
                {
                  type: 'output_text',
                  text: 'schema ok',
                },
              ],
            },
          ],
          usage: {
            input_tokens: 3,
            output_tokens: 1,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }) as typeof fetch

    await queryModelWithoutStreaming({
      messages: [createUserMessage({ content: 'hello' })],
      systemPrompt: asSystemPrompt(['system prompt']),
      thinkingConfig: { type: 'disabled' },
      tools: [],
      signal: new AbortController().signal,
      options: {
        model: 'gpt-5.4',
        isNonInteractiveSession: true,
        hasAppendSystemPrompt: false,
        querySource: 'sdk',
        agents: [],
        mcpTools: [],
        extraToolSchemas: [
          {
            name: 'mcp__pencil__get_style_guide_tags',
            description: 'Return style guide tags',
            input_schema: {
              type: 'object',
            },
          } as never,
        ],
        async getToolPermissionContext() {
          return {
            mode: 'default',
            additionalWorkingDirectories: new Map(),
            alwaysAllowRules: {},
            alwaysDenyRules: {},
            alwaysAskRules: {},
            isBypassPermissionsModeAvailable: false,
          }
        },
      },
    })

    const body = JSON.parse(String(capturedInit?.body))
    const tool = body.tools.find(
      (entry: { name?: string }) =>
        entry.name === 'mcp__pencil__get_style_guide_tags',
    )

    expect(tool.strict).toBe(false)
    expect(tool.parameters).toEqual({
      type: 'object',
      properties: {},
    })
  })

  test('routes sideQuery through the openai adapter and returns beta-like message content', async () => {
    globalThis.fetch = mock(async () => {
      return new Response(
        JSON.stringify({
          id: 'resp_sidequery',
          model: 'gpt-5.4',
          output: [
            {
              id: 'msg_sidequery',
              type: 'message',
              role: 'assistant',
              content: [
                {
                  type: 'output_text',
                  text: 'side query response',
                },
              ],
            },
          ],
          usage: {
            input_tokens: 8,
            output_tokens: 4,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }) as typeof fetch

    const response = await sideQuery({
      model: 'gpt-5.4',
      system: 'system prompt',
      messages: [{ role: 'user', content: 'hello' }],
      querySource: 'session_search',
    })

    expect(response.id).toBe('msg_sidequery')
    expect(response.model).toBe('gpt-5.4')
    expect(response.content[0]).toMatchObject({
      type: 'text',
      text: 'side query response',
    })
  })
})
