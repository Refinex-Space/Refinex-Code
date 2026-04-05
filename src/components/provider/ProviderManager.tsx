import * as React from 'react'
import { useRef, useState } from 'react'
import { useTerminalSize } from 'src/hooks/useTerminalSize.js'
import { Box, Text, useInput } from '../../ink.js'
import { useSetAppState } from '../../state/AppState.js'
import { Select } from '../CustomSelect/index.js'
import TextInput from '../TextInput.js'
import {
  type ProviderReasoningEffort,
  type ProviderVerbosity,
} from '../../utils/providerRegistry.js'
import {
  CODEX_PROVIDER_ID,
  configureAndActivateCodexProvider,
  getCodexProviderSnapshot,
  getCurrentProviderSummary,
  getProviderControlLockMessage,
  getProviderPaths,
  switchToAnthropicProvider,
  switchToConfiguredCodexProvider,
  type ProviderActivationResult,
} from '../../utils/providerManagement.js'
import { getProviderModelCatalogForDriver } from '../../utils/model/providerCatalog.js'

type Props = {
  onFinish: (message?: string) => void
  onCancel: () => void
  onApplied?: (result: ProviderActivationResult) => void
}

type Step =
  | 'menu'
  | 'baseUrl'
  | 'apiKey'
  | 'model'
  | 'contextWindow'
  | 'autoCompact'
  | 'verbosity'
  | 'effort'
  | 'confirm'

export function ProviderManager({
  onFinish,
  onCancel,
  onApplied,
}: Props): React.ReactNode {
  const setAppState = useSetAppState()
  const { columns } = useTerminalSize()
  const codexSnapshot = getCodexProviderSnapshot()
  const providerPaths = getProviderPaths()
  const lockMessage = getProviderControlLockMessage()
  const [step, setStep] = useState<Step>('menu')
  const [error, setError] = useState<string | null>(null)
  const [baseUrl, setBaseUrl] = useState(codexSnapshot.baseUrl)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(codexSnapshot.defaultModel)
  const [verbosity, setVerbosity] = useState<ProviderVerbosity>(
    codexSnapshot.defaultVerbosity,
  )
  const [effort, setEffort] = useState<ProviderReasoningEffort>(
    codexSnapshot.defaultReasoningEffort,
  )
  const [modelContextWindow, setModelContextWindow] = useState(
    codexSnapshot.configuredModelContextWindow?.toString() ?? '',
  )
  const [modelAutoCompactTokenLimit, setModelAutoCompactTokenLimit] = useState(
    codexSnapshot.configuredModelAutoCompactTokenLimit?.toString() ?? '',
  )
  const parsedContextWindowInput =
    parseOptionalPositiveIntegerInput(modelContextWindow)
  const derivedAutoCompactDefault = getDerivedAutoCompactDefault(
    parsedContextWindowInput,
    codexSnapshot.resolvedModelAutoCompactTokenLimit,
  )

  const applyResult = (result: ProviderActivationResult): void => {
    if (!result.ok) {
      setError(result.message)
      setStep('menu')
      return
    }

    setAppState(previous => ({
      ...previous,
      mainLoopModel: result.mainLoopModel,
      mainLoopModelForSession: null,
      effortValue: result.effortLevel,
    }))
    onApplied?.(result)
    onFinish(formatActivationMessage(result))
  }

  const codexEffortOptions = getCodexEffortOptions(model)

  if (step === 'menu') {
    const menuOptions = [
      {
        label: 'Switch to Anthropic',
        value: 'anthropic',
        description: 'Use the built-in Anthropic provider and clear OpenAI-only settings.',
      },
      {
        label: codexSnapshot.hasStoredCredential
          ? 'Switch to Codex'
          : 'Configure Codex',
        value: codexSnapshot.hasStoredCredential ? 'codex' : 'configure',
        description: codexSnapshot.hasStoredCredential
          ? `Use ${CODEX_PROVIDER_ID} with ${codexSnapshot.defaultModel}.`
          : 'Set up the OpenAI Responses provider and activate it immediately.',
      },
      ...(codexSnapshot.hasStoredCredential
        ? [
            {
              label: 'Edit Codex settings',
              value: 'configure',
              description:
                'Update base URL, API key, default model, context window, auto-compact threshold, verbosity, and effort.',
            },
          ]
        : []),
    ]

    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>Manage Provider</Text>
        {getCurrentProviderSummary()
          .split('\n')
          .map(line => (
            <Text key={line} dimColor>
              {line}
            </Text>
          ))}
        {lockMessage && <Text color="warning">{lockMessage}</Text>}
        {error && <Text color="error">{error}</Text>}
        <Select
          options={menuOptions}
          onChange={value => {
            setError(null)
            if (value === 'anthropic') {
              applyResult(switchToAnthropicProvider())
              return
            }
            if (value === 'codex') {
              applyResult(switchToConfiguredCodexProvider())
              return
            }
            setStep('baseUrl')
          }}
          onCancel={onCancel}
        />
        <Text dimColor>
          Enter to select. Esc to cancel.
        </Text>
      </Box>
    )
  }

  if (step === 'baseUrl') {
    return (
      <ProviderTextStep
        key="baseUrl"
        stepLabel="Step 1 of 7 · Base URL"
        title="Configure Codex"
        description={`Base URL for the OpenAI Responses-compatible provider. File target: ${providerPaths.providersPath}`}
        value={baseUrl}
        onChange={setBaseUrl}
        onSubmit={value => {
          setError(null)
          setBaseUrl(value)
          setStep('apiKey')
        }}
        onExit={() => setStep('menu')}
        placeholder="https://api.openai.com/v1"
        columns={Math.min(columns, 90)}
        error={error}
      />
    )
  }

  if (step === 'apiKey') {
    return (
      <ProviderTextStep
        key="apiKey"
        stepLabel="Step 2 of 7 · API Key"
        title="Configure Codex"
        description={
          codexSnapshot.hasStoredCredential
            ? `API key for ${CODEX_PROVIDER_ID}. Leave blank and press Enter to keep the existing credential in ${providerPaths.authPath}.`
            : `API key for ${CODEX_PROVIDER_ID}. File target: ${providerPaths.authPath}`
        }
        value={apiKey}
        onChange={setApiKey}
        onSubmit={value => {
          setError(null)
          setApiKey(value)
          setStep('model')
        }}
        onExit={() => setStep('baseUrl')}
        placeholder="sk-..."
        mask="*"
        columns={Math.min(columns, 90)}
        error={error}
      />
    )
  }

  if (step === 'model') {
    return (
      <ProviderTextStep
        key="model"
        stepLabel="Step 3 of 7 · Default Model"
        title="Configure Codex"
        description="Default model to activate immediately after switching providers."
        value={model}
        onChange={setModel}
        onSubmit={value => {
          const nextModel = value.trim() || codexSnapshot.defaultModel
          const normalized = normalizeModelDraft(nextModel, verbosity, effort)
          setError(null)
          setModel(nextModel)
          setVerbosity(normalized.verbosity)
          setEffort(normalized.effort)
          setStep('contextWindow')
        }}
        onExit={() => setStep('apiKey')}
        placeholder="gpt-5.4"
        columns={Math.min(columns, 90)}
        error={error}
      />
    )
  }

  if (step === 'contextWindow') {
    return (
      <ProviderTextStep
        key="contextWindow"
        stepLabel="Step 4 of 7 · Context Window"
        title="Configure Codex"
        description={`Optional context window override in tokens. Leave blank to use the Codex-compatible default for ${model} (${codexSnapshot.resolvedModelContextWindow ?? 272000}).`}
        value={modelContextWindow}
        onChange={setModelContextWindow}
        onSubmit={value => {
          const parsed = parseOptionalPositiveIntegerInput(value)
          if (parsed === 'invalid') {
            setError('Context window must be a positive integer.')
            return
          }
          setError(null)
          setModelContextWindow(value.trim())
          setStep('autoCompact')
        }}
        onExit={() => setStep('model')}
        placeholder={String(codexSnapshot.resolvedModelContextWindow ?? 272000)}
        columns={Math.min(columns, 90)}
        nextHint={`Next: Auto-compact trigger (default ${derivedAutoCompactDefault.toLocaleString()})`}
        error={error}
      />
    )
  }

  if (step === 'autoCompact') {
    return (
      <ProviderTextStep
        key="autoCompact"
        stepLabel="Step 5 of 7 · Auto-Compact Trigger"
        title="Configure Codex"
        description={`Optional auto-compact trigger in tokens. Leave blank to use the Codex-compatible default (${derivedAutoCompactDefault.toLocaleString()}). Runtime will clamp values above 90% of the configured context window.`}
        value={modelAutoCompactTokenLimit}
        onChange={setModelAutoCompactTokenLimit}
        onSubmit={value => {
          const parsed = parseOptionalPositiveIntegerInput(value)
          if (parsed === 'invalid') {
            setError('Auto-compact trigger must be a positive integer.')
            return
          }
          setError(null)
          setModelAutoCompactTokenLimit(value.trim())
          setStep('verbosity')
        }}
        onExit={() => setStep('contextWindow')}
        placeholder={String(derivedAutoCompactDefault)}
        columns={Math.min(columns, 90)}
        nextHint="Next: Verbosity"
        error={error}
      />
    )
  }

  if (step === 'verbosity') {
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>Step 6 of 7 · Verbosity</Text>
        <Text dimColor>
          Default verbosity for GPT-5 Responses. File target:{' '}
          {providerPaths.settingsPath}
        </Text>
        {error && <Text color="error">{error}</Text>}
        <Select
          options={[
            {
              label: 'Low',
              value: 'low',
              description: 'More concise output.',
            },
            {
              label: 'Medium',
              value: 'medium',
              description: 'Balanced detail.',
            },
            {
              label: 'High',
              value: 'high',
              description: 'More verbose output.',
            },
          ]}
          onChange={value => {
            setVerbosity(value as ProviderVerbosity)
            setStep('effort')
          }}
          onCancel={() => setStep('autoCompact')}
          defaultValue={verbosity}
          defaultFocusValue={verbosity}
        />
        <Text dimColor>
          Enter to select. Esc to go back.
        </Text>
      </Box>
    )
  }

  if (step === 'effort') {
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>Step 7 of 7 · Effort</Text>
        <Text dimColor>
          Default reasoning effort for {model}. Unsupported values are removed
          automatically for known models.
        </Text>
        {error && <Text color="error">{error}</Text>}
        <Select
          options={codexEffortOptions.map(level => ({
            label: level,
            value: level,
          }))}
          onChange={value => {
            setEffort(value as ProviderReasoningEffort)
            setStep('confirm')
          }}
          onCancel={() => setStep('verbosity')}
          defaultValue={effort}
          defaultFocusValue={effort}
        />
        <Text dimColor>
          Enter to select. Esc to go back.
        </Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Review Codex Configuration</Text>
      <Text>Provider ID: {CODEX_PROVIDER_ID}</Text>
      <Text>Driver: OpenAI Responses</Text>
      <Text>Base URL: {baseUrl}</Text>
      <Text>
        API key:{' '}
        {apiKey
          ? 'update stored credential'
          : codexSnapshot.hasStoredCredential
            ? 'keep existing stored credential'
            : 'new credential required'}
      </Text>
      <Text>Default model: {model}</Text>
      <Text>
        Context window:{' '}
        {modelContextWindow.trim() || `default (${codexSnapshot.resolvedModelContextWindow ?? 272000})`}
      </Text>
      <Text>
        Auto-compact trigger:{' '}
        {modelAutoCompactTokenLimit.trim() ||
          `default (${codexSnapshot.resolvedModelAutoCompactTokenLimit ?? 244800})`}
      </Text>
      <Text>Verbosity: {verbosity}</Text>
      <Text>Effort: {effort}</Text>
      <Text dimColor>providers.json: {providerPaths.providersPath}</Text>
      <Text dimColor>auth.json: {providerPaths.authPath}</Text>
      <Text dimColor>settings.json: {providerPaths.settingsPath}</Text>
      {error && <Text color="error">{error}</Text>}
      <Select
        options={[
          {
            label: 'Save and activate Codex',
            value: 'save',
            description:
              'Create or update user-scoped provider files and switch the active model immediately.',
          },
          {
            label: 'Back',
            value: 'back',
            description: 'Return to the previous step.',
          },
        ]}
        onChange={value => {
          if (value === 'back') {
            setStep('effort')
            return
          }
          const parsedContextWindow =
            parseOptionalPositiveIntegerInput(modelContextWindow)
          if (parsedContextWindow === 'invalid') {
            setError('Context window must be a positive integer.')
            return
          }
          const parsedAutoCompact =
            parseOptionalPositiveIntegerInput(modelAutoCompactTokenLimit)
          if (parsedAutoCompact === 'invalid') {
            setError('Auto-compact trigger must be a positive integer.')
            return
          }
          applyResult(
            configureAndActivateCodexProvider({
              baseUrl,
              apiKey,
              defaultModel: model,
              defaultVerbosity: verbosity,
              defaultReasoningEffort: effort,
              modelContextWindow: parsedContextWindow,
              modelAutoCompactTokenLimit: parsedAutoCompact,
            }),
          )
        }}
        onCancel={() => setStep('menu')}
      />
      <Text dimColor>
        Enter to confirm. Esc to return to the menu.
      </Text>
    </Box>
  )
}

function formatActivationMessage(result: ProviderActivationResult): string {
  if (result.createdFiles.length === 0) {
    return result.message
  }
  return `${result.message} Created: ${result.createdFiles.join(', ')}`
}

function parseOptionalPositiveIntegerInput(
  value: string,
): number | undefined | 'invalid' {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 'invalid'
}

function getCodexEffortOptions(
  model: string,
): ProviderReasoningEffort[] {
  const normalized = model.trim().toLowerCase()
  const entry = getProviderModelCatalogForDriver('openai-responses').find(
    candidate => candidate.id.toLowerCase() === normalized,
  )
  const levels = entry?.supportedEffortLevels ?? [
    'minimal',
    'low',
    'medium',
    'high',
    'xhigh',
  ]
  return levels.filter(
    (level): level is ProviderReasoningEffort => level !== 'max',
  )
}

function normalizeModelDraft(
  model: string,
  verbosity: ProviderVerbosity,
  effort: ProviderReasoningEffort,
): {
  verbosity: ProviderVerbosity
  effort: ProviderReasoningEffort
} {
  const normalized = model.trim().toLowerCase()
  const entry = getProviderModelCatalogForDriver('openai-responses').find(
    candidate => candidate.id.toLowerCase() === normalized,
  )

  return {
    verbosity:
      entry?.supportedVerbosityLevels?.includes(verbosity) === false
        ? (entry.defaultVerbosity ?? 'medium')
        : verbosity,
    effort:
      entry?.supportedEffortLevels?.includes(effort) === false
        ? ((entry.defaultEffortLevel === 'max'
            ? 'xhigh'
            : entry.defaultEffortLevel) ?? 'medium')
        : effort,
  }
}

function ProviderTextStep({
  stepLabel,
  title,
  description,
  value,
  onChange,
  onSubmit,
  onExit,
  placeholder,
  columns,
  mask,
  nextHint,
  error,
}: {
  stepLabel: string
  title: string
  description: string
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  onExit: () => void
  placeholder: string
  columns: number
  mask?: string
  nextHint?: string
  error?: string | null
}): React.ReactNode {
  const [cursorOffset, setCursorOffset] = useState(value.length)
  const [isPasting, setIsPasting] = useState(false)
  const [submitAfterPaste, setSubmitAfterPaste] = useState(false)
  const latestValueRef = useRef(value)

  React.useEffect(() => {
    latestValueRef.current = value
    setCursorOffset(value.length)
  }, [value])

  React.useEffect(() => {
    if (submitAfterPaste && !isPasting) {
      setSubmitAfterPaste(false)
      onSubmit(latestValueRef.current)
    }
  }, [isPasting, onSubmit, submitAfterPaste])

  useInput(
    (_input, key) => {
      if (isPasting && key.return) {
        setSubmitAfterPaste(true)
        return
      }
      if (key.return && !key.meta && !key.shift) {
        onSubmit(latestValueRef.current)
        return
      }
      if (key.escape) {
        onExit()
      }
    },
    { isActive: true },
  )

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>{stepLabel}</Text>
      <Text>{title}</Text>
      <Text dimColor>{description}</Text>
      {error && <Text color="error">{error}</Text>}
      {isPasting && (
        <Text dimColor>
          Paste detected. Enter will continue as soon as the paste completes.
        </Text>
      )}
      <TextInput
        value={value}
        onChange={nextValue => {
          latestValueRef.current = nextValue
          onChange(nextValue)
        }}
        disableEscapeDoublePress
        placeholder={placeholder}
        columns={columns}
        cursorOffset={cursorOffset}
        onChangeCursorOffset={setCursorOffset}
        focus
        showCursor
        mask={mask}
        onIsPastingChange={setIsPasting}
      />
      <Text dimColor>
        Enter to continue. Esc to go back.
        {nextHint ? ` ${nextHint}` : ''}
      </Text>
    </Box>
  )
}

function getDerivedAutoCompactDefault(
  modelContextWindow: number | undefined | 'invalid',
  fallback: number | undefined,
): number {
  if (typeof modelContextWindow === 'number') {
    return Math.floor(modelContextWindow * 0.9)
  }
  return fallback ?? 244_800
}
