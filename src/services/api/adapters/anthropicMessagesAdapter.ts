import type { ProviderDriver } from '../../../utils/providerRegistry.js'
import {
  accumulateUsage,
  getAPIMetadata,
  getCacheControl,
  queryHaiku,
  queryModelWithStreaming,
  queryModelWithoutStreaming,
  queryWithModel,
  updateUsage,
  verifyApiKey,
} from '../claude.js'

export const ANTHROPIC_MESSAGES_ADAPTER_ID = 'anthropic'

export type AnthropicMessagesAdapter = {
  id: string
  driver: ProviderDriver
  verifyApiKey: typeof verifyApiKey
  getAPIMetadata: typeof getAPIMetadata
  getCacheControl: typeof getCacheControl
  queryModelWithoutStreaming: typeof queryModelWithoutStreaming
  queryModelWithStreaming: typeof queryModelWithStreaming
  updateUsage: typeof updateUsage
  accumulateUsage: typeof accumulateUsage
  queryHaiku: typeof queryHaiku
  queryWithModel: typeof queryWithModel
}

export const anthropicMessagesAdapter: AnthropicMessagesAdapter = {
  id: ANTHROPIC_MESSAGES_ADAPTER_ID,
  driver: 'anthropic-messages',
  verifyApiKey,
  getAPIMetadata,
  getCacheControl,
  queryModelWithoutStreaming,
  queryModelWithStreaming,
  updateUsage,
  accumulateUsage,
  queryHaiku,
  queryWithModel,
}
