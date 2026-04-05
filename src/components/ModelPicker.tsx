import capitalize from 'lodash-es/capitalize.js'
import * as React from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useExitOnCtrlCDWithKeybindings } from 'src/hooks/useExitOnCtrlCDWithKeybindings.js'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from 'src/services/analytics/index.js'
import {
  FAST_MODE_MODEL_DISPLAY,
  isFastModeAvailable,
  isFastModeCooldown,
  isFastModeEnabled,
} from 'src/utils/fastMode.js'
import { Box, Text } from '../ink.js'
import { useKeybindings } from '../keybindings/useKeybinding.js'
import { useAppState, useSetAppState } from '../state/AppState.js'
import {
  convertEffortValueToLevel,
  type EffortLevel,
  getDefaultEffortForModel,
  getSupportedEffortLevelsForModel,
  modelSupportsEffort,
  resolvePickerEffortPersistence,
  toPersistableEffort,
} from '../utils/effort.js'
import {
  getDefaultMainLoopModel,
  type ModelSetting,
  modelDisplayString,
  parseUserSpecifiedModel,
} from '../utils/model/model.js'
import { getModelOptions, type ModelOption } from '../utils/model/modelOptions.js'
import {
  getDefaultVerbosityForConfiguredProviderModel,
  getSupportedVerbosityLevelsForConfiguredProviderModel,
  type ProviderVerbosity,
} from '../utils/model/providerCatalog.js'
import {
  getSettingsForSource,
  updateSettingsForSource,
} from '../utils/settings/settings.js'
import { ConfigurableShortcutHint } from './ConfigurableShortcutHint.js'
import { Select } from './CustomSelect/index.js'
import { Byline } from './design-system/Byline.js'
import { KeyboardShortcutHint } from './design-system/KeyboardShortcutHint.js'
import { Pane } from './design-system/Pane.js'
import { effortLevelToSymbol } from './EffortIndicator.js'

export type Props = {
  initial: string | null
  sessionModel?: ModelSetting
  onSelect: (model: string | null, effort: EffortLevel | undefined) => void
  onCancel?: () => void
  isStandaloneCommand?: boolean
  showFastModeNotice?: boolean
  headerText?: string
  skipSettingsWrite?: boolean
}

const NO_PREFERENCE = '__NO_PREFERENCE__'

type SelectableModelOption = ModelOption & {
  value: string
}

export function ModelPicker({
  initial,
  sessionModel,
  onSelect,
  onCancel,
  isStandaloneCommand,
  showFastModeNotice,
  headerText,
  skipSettingsWrite,
}: Props): React.ReactNode {
  const setAppState = useSetAppState()
  const exitState = useExitOnCtrlCDWithKeybindings()
  const initialValue = initial === null ? NO_PREFERENCE : initial
  const [focusedValue, setFocusedValue] = useState<string | undefined>(
    initialValue,
  )
  const isFastMode = useAppState(s =>
    isFastModeEnabled() ? s.fastMode : false,
  )
  const [hasToggledEffort, setHasToggledEffort] = useState(false)
  const effortValue = useAppState(s => s.effortValue)
  const [effort, setEffort] = useState<EffortLevel | undefined>(
    effortValue !== undefined ? convertEffortValueToLevel(effortValue) : undefined,
  )

  const modelOptions = useMemo(
    () => getModelOptions(isFastMode ?? false),
    [isFastMode],
  )

  const optionsWithInitial = useMemo(() => {
    if (initial !== null && !modelOptions.some(opt => opt.value === initial)) {
      return [
        ...modelOptions,
        {
          value: initial,
          label: modelDisplayString(initial),
          description: 'Current model',
        },
      ]
    }
    return modelOptions
  }, [modelOptions, initial])

  const selectOptions = useMemo<SelectableModelOption[]>(
    () =>
      optionsWithInitial.map(opt => ({
        ...opt,
        value: opt.value === null ? NO_PREFERENCE : opt.value,
      })),
    [optionsWithInitial],
  )

  const initialFocusValue = useMemo(
    () =>
      selectOptions.some(option => option.value === initialValue)
        ? initialValue
        : (selectOptions[0]?.value ?? undefined),
    [selectOptions, initialValue],
  )

  const visibleCount = Math.min(10, selectOptions.length)
  const hiddenCount = Math.max(0, selectOptions.length - visibleCount)
  const focusedOption = useMemo(
    () => selectOptions.find(option => option.value === focusedValue),
    [selectOptions, focusedValue],
  )
  const focusedModelName = focusedOption?.label
  const focusedEffortLevels = useMemo(
    () => getSupportedEffortLevelsForOption(focusedOption, focusedValue),
    [focusedOption, focusedValue],
  )
  const focusedSupportsEffort = (focusedEffortLevels?.length ?? 0) > 0
  const focusedDefaultEffort = useMemo(
    () => getDefaultEffortLevelForOption(focusedOption, focusedValue),
    [focusedOption, focusedValue],
  )
  const focusedVerbosity = useMemo(
    () => getVerbosityInfoForOption(focusedOption, focusedValue),
    [focusedOption, focusedValue],
  )
  const displayEffort = useMemo(
    () =>
      getDisplayedPickerEffort(
        effort ?? focusedDefaultEffort,
        focusedDefaultEffort,
        focusedEffortLevels,
      ),
    [effort, focusedDefaultEffort, focusedEffortLevels],
  )

  const handleFocus = useCallback(
    (value: string) => {
      setFocusedValue(value)
      if (!hasToggledEffort && effortValue === undefined) {
        setEffort(getDefaultEffortLevelForOption(focusedOptionForValue(value, selectOptions), value))
      }
    },
    [effortValue, hasToggledEffort, selectOptions],
  )

  const handleCycleEffort = useCallback(
    (direction: 'left' | 'right') => {
      if (!focusedEffortLevels || focusedEffortLevels.length === 0) {
        return
      }
      setEffort(previous =>
        cycleEffortLevel(
          previous ?? focusedDefaultEffort,
          direction,
          focusedEffortLevels,
        ),
      )
      setHasToggledEffort(true)
    },
    [focusedDefaultEffort, focusedEffortLevels],
  )

  useKeybindings(
    {
      'modelPicker:decreaseEffort': () => handleCycleEffort('left'),
      'modelPicker:increaseEffort': () => handleCycleEffort('right'),
    },
    { context: 'ModelPicker' },
  )

  const handleSelect = useCallback(
    (value: string) => {
      logEvent('tengu_model_command_menu_effort', {
        effort:
          effort as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      })

      const selectedOption = focusedOptionForValue(value, selectOptions)
      const selectedEffortLevels = getSupportedEffortLevelsForOption(
        selectedOption,
        value,
      )
      const selectedDefaultEffort = getDefaultEffortLevelForOption(
        selectedOption,
        value,
      )
      const normalizedEffort =
        effort !== undefined
          ? getDisplayedPickerEffort(
              effort,
              selectedDefaultEffort,
              selectedEffortLevels,
            )
          : undefined

      if (!skipSettingsWrite) {
        const effortLevel = resolvePickerEffortPersistence(
          normalizedEffort,
          selectedDefaultEffort,
          getSettingsForSource('userSettings')?.effortLevel,
          hasToggledEffort,
        )
        const persistable = toPersistableEffort(effortLevel)
        if (persistable !== undefined) {
          updateSettingsForSource('userSettings', {
            effortLevel: persistable,
          })
        }
        setAppState(previous => ({
          ...previous,
          effortValue: effortLevel,
        }))
      }

      const selectedModel = resolveOptionModel(value)
      const selectedEffort =
        hasToggledEffort && selectedModel && modelSupportsEffort(selectedModel)
          ? normalizedEffort
          : undefined

      if (value === NO_PREFERENCE) {
        onSelect(null, selectedEffort)
        return
      }

      onSelect(value, selectedEffort)
    },
    [
      effort,
      hasToggledEffort,
      onSelect,
      selectOptions,
      setAppState,
      skipSettingsWrite,
    ],
  )

  const content = (
    <Box flexDirection="column">
      <Box flexDirection="column">
        <Box marginBottom={1} flexDirection="column">
          <Text color="remember" bold>
            Select model
          </Text>
          <Text dimColor>
            {headerText ??
              'Switch between available models. Applies to this session and future sessions. For custom model names, specify with --model.'}
          </Text>
          {sessionModel && (
            <Text dimColor>
              Currently using {modelDisplayString(sessionModel)} for this session
              {' '}(set by plan mode). Selecting a model will undo this.
            </Text>
          )}
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Box flexDirection="column">
            <Select
              defaultValue={initialValue}
              defaultFocusValue={initialFocusValue}
              options={selectOptions}
              onChange={handleSelect}
              onFocus={handleFocus}
              onCancel={onCancel ?? (() => {})}
              visibleOptionCount={visibleCount}
            />
          </Box>
          {hiddenCount > 0 && (
            <Box paddingLeft={3}>
              <Text dimColor>and {hiddenCount} more…</Text>
            </Box>
          )}
        </Box>

        <Box marginBottom={1} flexDirection="column">
          {focusedSupportsEffort ? (
            <Text dimColor>
              <EffortLevelIndicator effort={displayEffort} />{' '}
              {formatEffortLabel(displayEffort)} effort
              {displayEffort === focusedDefaultEffort ? ' (default)' : ''}{' '}
              <Text color="subtle">← → to adjust</Text>
            </Text>
          ) : (
            <Text color="subtle">
              <EffortLevelIndicator effort={undefined} /> Effort not supported
              {focusedModelName ? ` for ${focusedModelName}` : ''}
            </Text>
          )}
          {focusedVerbosity.supportedLevels &&
            focusedVerbosity.supportedLevels.length > 0 &&
            focusedVerbosity.defaultVerbosity && (
              <Text dimColor>
                Verbosity {capitalize(focusedVerbosity.defaultVerbosity)} (default)
              </Text>
            )}
        </Box>

        {isFastModeEnabled() ? (
          showFastModeNotice ? (
            <Box marginBottom={1}>
              <Text dimColor>
                Fast mode is <Text bold>ON</Text> and available with{' '}
                {FAST_MODE_MODEL_DISPLAY} only (/fast). Switching to other models
                {' '}turn off fast mode.
              </Text>
            </Box>
          ) : isFastModeAvailable() && !isFastModeCooldown() ? (
            <Box marginBottom={1}>
              <Text dimColor>
                Use <Text bold>/fast</Text> to turn on Fast mode (
                {FAST_MODE_MODEL_DISPLAY} only).
              </Text>
            </Box>
          ) : null
        ) : null}
      </Box>

      {isStandaloneCommand && (
        <Text dimColor italic>
          {exitState.pending ? (
            <>Press {exitState.keyName} again to exit</>
          ) : (
            <Byline>
              <KeyboardShortcutHint shortcut="Enter" action="confirm" />
              <ConfigurableShortcutHint
                action="select:cancel"
                context="Select"
                fallback="Esc"
                description="exit"
              />
            </Byline>
          )}
        </Text>
      )}
    </Box>
  )

  if (!isStandaloneCommand) {
    return content
  }

  return <Pane color="permission">{content}</Pane>
}

function resolveOptionModel(value?: string): string | undefined {
  if (!value) return undefined
  return value === NO_PREFERENCE ? getDefaultMainLoopModel() : parseUserSpecifiedModel(value)
}

function focusedOptionForValue(
  value: string,
  options: SelectableModelOption[],
): SelectableModelOption | undefined {
  return options.find(option => option.value === value)
}

function getSupportedEffortLevelsForOption(
  option: ModelOption | undefined,
  value?: string,
): EffortLevel[] | undefined {
  if (option?.supportedEffortLevels) {
    return option.supportedEffortLevels
  }

  const resolved = resolveOptionModel(value) ?? getDefaultMainLoopModel()
  return getSupportedEffortLevelsForModel(resolved)
}

function getDefaultEffortLevelForOption(
  option: ModelOption | undefined,
  value?: string,
): EffortLevel {
  if (option?.defaultEffortLevel) {
    return option.defaultEffortLevel
  }

  const resolved = resolveOptionModel(value) ?? getDefaultMainLoopModel()
  const defaultValue = getDefaultEffortForModel(resolved)
  return defaultValue !== undefined
    ? convertEffortValueToLevel(defaultValue)
    : 'high'
}

function getVerbosityInfoForOption(
  option: ModelOption | undefined,
  value?: string,
): {
  supportedLevels?: ProviderVerbosity[]
  defaultVerbosity?: ProviderVerbosity
} {
  const resolved = resolveOptionModel(value) ?? getDefaultMainLoopModel()
  return {
    supportedLevels:
      option?.supportedVerbosityLevels ??
      getSupportedVerbosityLevelsForConfiguredProviderModel(resolved),
    defaultVerbosity:
      option?.defaultVerbosity ??
      getDefaultVerbosityForConfiguredProviderModel(resolved),
  }
}

function getDisplayedPickerEffort(
  current: EffortLevel,
  fallback: EffortLevel,
  supportedLevels: EffortLevel[] | undefined,
): EffortLevel {
  if (!supportedLevels || supportedLevels.length === 0) {
    return fallback
  }
  if (supportedLevels.includes(current)) {
    return current
  }
  if (current === 'max' && supportedLevels.includes('xhigh')) {
    return 'xhigh'
  }
  if (current === 'xhigh' && supportedLevels.includes('max')) {
    return 'max'
  }
  return supportedLevels[supportedLevels.length - 1] ?? fallback
}

function cycleEffortLevel(
  current: EffortLevel,
  direction: 'left' | 'right',
  supportedLevels: EffortLevel[],
): EffortLevel {
  const clampedCurrent = getDisplayedPickerEffort(
    current,
    supportedLevels[0] ?? 'high',
    supportedLevels,
  )
  const currentIndex = supportedLevels.indexOf(clampedCurrent)
  if (direction === 'right') {
    return supportedLevels[(currentIndex + 1) % supportedLevels.length]!
  }
  return supportedLevels[
    (currentIndex - 1 + supportedLevels.length) % supportedLevels.length
  ]!
}

function formatEffortLabel(level: EffortLevel): string {
  return level === 'xhigh' ? 'XHigh' : capitalize(level)
}

function EffortLevelIndicator({
  effort,
}: {
  effort: EffortLevel | undefined
}): React.ReactNode {
  return <Text color={effort ? 'claude' : 'subtle'}>{effortLevelToSymbol(effort ?? 'low')}</Text>
}
