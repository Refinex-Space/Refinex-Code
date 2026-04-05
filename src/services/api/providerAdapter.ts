import type { ProviderDriver } from '../../utils/providerRegistry.js'
import { getConfiguredModelProviderInfo } from '../../utils/providerRegistry.js'
import {
  ANTHROPIC_MESSAGES_ADAPTER_ID,
  anthropicMessagesAdapter,
} from './adapters/anthropicMessagesAdapter.js'
import {
  OPENAI_RESPONSES_ADAPTER_ID,
  openaiResponsesAdapter,
} from './adapters/openaiResponsesAdapter.js'

type ClaudeApiModule = typeof import('./claude.js')

export type ProviderAdapter = {
  id: string
  driver: ProviderDriver
  verifyApiKey: ClaudeApiModule['verifyApiKey']
  getAPIMetadata: ClaudeApiModule['getAPIMetadata']
  getCacheControl: ClaudeApiModule['getCacheControl']
  queryModelWithoutStreaming: ClaudeApiModule['queryModelWithoutStreaming']
  queryModelWithStreaming: ClaudeApiModule['queryModelWithStreaming']
  updateUsage: ClaudeApiModule['updateUsage']
  accumulateUsage: ClaudeApiModule['accumulateUsage']
  queryHaiku: ClaudeApiModule['queryHaiku']
  queryWithModel: ClaudeApiModule['queryWithModel']
}

export type RuntimeProviderAdapterSelection = {
  configuredProviderId: string
  configuredDriver: ProviderDriver
  adapterId: string
  adapterDriver: ProviderDriver
  mode: 'direct' | 'fallback'
  note?: string
}

export function getRuntimeProviderAdapter(): ProviderAdapter {
  const configured = getConfiguredModelProviderInfo()
  switch (configured.provider.driver) {
    case 'anthropic-messages':
      return anthropicMessagesAdapter
    case 'openai-responses':
      return openaiResponsesAdapter
  }
}

export function getRuntimeProviderAdapterSelection(): RuntimeProviderAdapterSelection {
  const configured = getConfiguredModelProviderInfo()
  const adapter = getRuntimeProviderAdapter()

  if (configured.provider.driver === adapter.driver) {
    return {
      configuredProviderId: configured.resolvedId,
      configuredDriver: configured.provider.driver,
      adapterId: adapter.id,
      adapterDriver: adapter.driver,
      mode: 'direct',
    }
  }

  return {
    configuredProviderId: configured.resolvedId,
    configuredDriver: configured.provider.driver,
    adapterId:
      adapter.driver === 'openai-responses'
        ? OPENAI_RESPONSES_ADAPTER_ID
        : ANTHROPIC_MESSAGES_ADAPTER_ID,
    adapterDriver: adapter.driver,
    mode: 'fallback',
    note: `${configured.provider.driver} adapter pending`,
  }
}

export const verifyApiKey: ProviderAdapter['verifyApiKey'] = (...args) =>
  getRuntimeProviderAdapter().verifyApiKey(...args)

export const getAPIMetadata: ProviderAdapter['getAPIMetadata'] = (...args) =>
  getRuntimeProviderAdapter().getAPIMetadata(...args)

export const getCacheControl: ProviderAdapter['getCacheControl'] = (...args) =>
  getRuntimeProviderAdapter().getCacheControl(...args)

export const queryModelWithoutStreaming: ProviderAdapter['queryModelWithoutStreaming'] = (
  ...args
) => getRuntimeProviderAdapter().queryModelWithoutStreaming(...args)

export const queryModelWithStreaming: ProviderAdapter['queryModelWithStreaming'] = (
  ...args
) => getRuntimeProviderAdapter().queryModelWithStreaming(...args)

export const updateUsage: ProviderAdapter['updateUsage'] = (...args) =>
  getRuntimeProviderAdapter().updateUsage(...args)

export const accumulateUsage: ProviderAdapter['accumulateUsage'] = (...args) =>
  getRuntimeProviderAdapter().accumulateUsage(...args)

export const queryHaiku: ProviderAdapter['queryHaiku'] = (...args) =>
  getRuntimeProviderAdapter().queryHaiku(...args)

export const queryWithModel: ProviderAdapter['queryWithModel'] = (...args) =>
  getRuntimeProviderAdapter().queryWithModel(...args)
