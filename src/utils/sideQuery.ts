import type Anthropic from '@anthropic-ai/sdk'
import type {
  BetaContentBlock,
  BetaToolUnion,
} from '@anthropic-ai/sdk/resources/beta/messages.js'
import {
  getLastApiCompletionTimestamp,
  setLastApiCompletionTimestamp,
} from '../bootstrap/state.js'
import type { QuerySource } from '../constants/querySource.js'
import {
  getAttributionHeader,
  getCLISyspromptPrefix,
} from '../constants/system.js'
import { logEvent } from '../services/analytics/index.js'
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../services/analytics/metadata.js'
import { queryModelWithoutStreaming } from '../services/api/providerAdapter.js'
import { getEmptyToolPermissionContext } from '../Tool.js'
import { computeFingerprint } from './fingerprint.js'
import {
  createAssistantMessage,
  createUserMessage,
  extractTextContent,
} from './messages.js'
import { normalizeModelStringForAPI } from './model/model.js'
import { asSystemPrompt } from './systemPromptType.js'

type MessageParam = Anthropic.MessageParam
type TextBlockParam = Anthropic.TextBlockParam
type Tool = Anthropic.Tool
type ToolChoice = Anthropic.ToolChoice
type BetaMessage = Anthropic.Beta.Messages.BetaMessage
type BetaJSONOutputFormat = Anthropic.Beta.Messages.BetaJSONOutputFormat
type BetaThinkingConfigParam = Anthropic.Beta.Messages.BetaThinkingConfigParam

export type SideQueryOptions = {
  /** Model to use for the query */
  model: string
  /**
   * System prompt - string or array of text blocks (will be prefixed with CLI attribution).
   *
   * The attribution header is always placed in its own TextBlockParam block to ensure
   * server-side parsing correctly extracts the cc_entrypoint value without including
   * system prompt content.
   */
  system?: string | TextBlockParam[]
  /** Messages to send (supports cache_control on content blocks) */
  messages: MessageParam[]
  /** Optional tools (supports both standard Tool[] and BetaToolUnion[] for custom tool types) */
  tools?: Tool[] | BetaToolUnion[]
  /** Optional tool choice (use { type: 'tool', name: 'x' } for forced output) */
  tool_choice?: ToolChoice
  /** Optional JSON output format for structured responses */
  output_format?: BetaJSONOutputFormat
  /** Max tokens (default: 1024) */
  max_tokens?: number
  /** Max retries (default: 2) */
  maxRetries?: number
  /** Abort signal */
  signal?: AbortSignal
  /** Skip CLI system prompt prefix (keeps attribution header for OAuth). For internal classifiers that provide their own prompt. */
  skipSystemPromptPrefix?: boolean
  /** Temperature override */
  temperature?: number
  /** Thinking budget (enables thinking), or `false` to send `{ type: 'disabled' }`. */
  thinking?: number | false
  /** Stop sequences — generation stops when any of these strings is emitted */
  stop_sequences?: string[]
  /** Attributes this call in tengu_api_success for COGS joining against reporting.sampling_calls. */
  querySource: QuerySource
}

/**
 * Extract text from first user message for fingerprint computation.
 */
function extractFirstUserMessageText(messages: MessageParam[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user')
  if (!firstUserMessage) return ''

  const content = firstUserMessage.content
  if (typeof content === 'string') return content

  // Array of content blocks - find first text block
  const textBlock = content.find(block => block.type === 'text')
  return textBlock?.type === 'text' ? textBlock.text : ''
}

/**
 * Lightweight API wrapper for "side queries" outside the main conversation loop.
 *
 * Use this instead of direct client.beta.messages.create() calls to ensure
 * proper OAuth token validation with fingerprint attribution headers.
 *
 * This handles:
 * - Fingerprint computation for OAuth validation
 * - Attribution header injection
 * - CLI system prompt prefix
 * - Proper betas for the model
 * - API metadata
 * - Model string normalization (strips [1m] suffix for API)
 *
 * @example
 * // Permission explainer
 * await sideQuery({ querySource: 'permission_explainer', model, system: SYSTEM_PROMPT, messages, tools, tool_choice })
 *
 * @example
 * // Session search
 * await sideQuery({ querySource: 'session_search', model, system: SEARCH_PROMPT, messages })
 *
 * @example
 * // Model validation
 * await sideQuery({ querySource: 'model_validation', model, max_tokens: 1, messages: [{ role: 'user', content: 'Hi' }] })
 */
export async function sideQuery(opts: SideQueryOptions): Promise<BetaMessage> {
  const {
    model,
    system,
    messages,
    tools,
    tool_choice,
    output_format,
    max_tokens = 1024,
    maxRetries = 2,
    signal,
    skipSystemPromptPrefix,
    temperature,
    thinking,
    stop_sequences,
    querySource,
  } = opts

  // Extract first user message text for fingerprint
  const messageText = extractFirstUserMessageText(messages)

  // Compute fingerprint for OAuth attribution
  const macroVersion =
    (globalThis as { MACRO?: { VERSION?: string } }).MACRO?.VERSION ?? 'dev'
  const fingerprint = computeFingerprint(messageText, macroVersion)
  const attributionHeader = getAttributionHeader(fingerprint)

  // Build system as array to keep attribution header in its own block
  // (prevents server-side parsing from including system content in cc_entrypoint)
  const systemBlocks: TextBlockParam[] = [
    attributionHeader ? { type: 'text', text: attributionHeader } : null,
    // Skip CLI system prompt prefix for internal classifiers that provide their own prompt
    ...(skipSystemPromptPrefix
      ? []
      : [
          {
            type: 'text' as const,
            text: getCLISyspromptPrefix({
              isNonInteractive: false,
              hasAppendSystemPrompt: false,
            }),
          },
        ]),
    ...(Array.isArray(system)
      ? system
      : system
        ? [{ type: 'text' as const, text: system }]
        : []),
  ].filter((block): block is TextBlockParam => block !== null)

  const convertedMessages = messages.map(message =>
    message.role === 'assistant'
      ? createAssistantMessage({
          content:
            typeof message.content === 'string'
              ? message.content
              : (message.content as BetaContentBlock[]),
        })
      : createUserMessage({
          content:
            typeof message.content === 'string'
              ? message.content
              : (message.content as Array<{
                  type: string
                  text?: string
                  [key: string]: unknown
                }>),
        }),
  )

  const thinkingConfig: BetaThinkingConfigParam | { budgetTokens: number } =
    thinking === false
      ? { type: 'disabled' }
      : thinking !== undefined
        ? {
            type: 'enabled',
            budgetTokens: Math.min(thinking, max_tokens - 1),
          }
        : { type: 'disabled' }

  const normalizedModel = normalizeModelStringForAPI(model)
  const start = Date.now()
  const response = await queryModelWithoutStreaming({
    messages: convertedMessages,
    systemPrompt: asSystemPrompt(systemBlocks.map(block => block.text)),
    thinkingConfig:
      thinkingConfig.type === 'disabled'
        ? { type: 'disabled' as const }
        : {
            type: 'enabled' as const,
            budgetTokens: thinkingConfig.budgetTokens,
          },
    tools: [],
    signal: signal ?? new AbortController().signal,
    options: {
      async getToolPermissionContext() {
        return getEmptyToolPermissionContext()
      },
      model: normalizedModel,
      toolChoice: tool_choice as never,
      isNonInteractiveSession: true,
      hasAppendSystemPrompt: false,
      extraToolSchemas: tools as BetaToolUnion[] | undefined,
      querySource,
      agents: [],
      mcpTools: [],
      maxOutputTokensOverride: max_tokens,
      outputFormat: output_format,
      temperatureOverride: temperature,
      enablePromptCaching: false,
    } as never,
  })

  if (response.isApiErrorMessage) {
    throw new Error(extractTextContent(response.message.content))
  }

  const now = Date.now()
  const lastCompletion = getLastApiCompletionTimestamp()
  logEvent('tengu_api_success', {
    requestId:
      (response.requestId ??
        undefined) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    querySource:
      opts.querySource as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    model:
      normalizedModel as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    inputTokens: response.message.usage.input_tokens,
    outputTokens: response.message.usage.output_tokens,
    cachedInputTokens: response.message.usage.cache_read_input_tokens ?? 0,
    uncachedInputTokens: response.message.usage.cache_creation_input_tokens ?? 0,
    durationMsIncludingRetries: now - start,
    timeSinceLastApiCallMs:
      lastCompletion !== null ? now - lastCompletion : undefined,
  })
  setLastApiCompletionTimestamp(now)

  return response.message as BetaMessage
}
