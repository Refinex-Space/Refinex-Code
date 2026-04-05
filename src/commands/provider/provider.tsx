import * as React from 'react'
import { useEffect } from 'react'
import { Pane } from '../../components/design-system/Pane.js'
import { ProviderManager } from '../../components/provider/ProviderManager.js'
import { COMMON_HELP_ARGS, COMMON_INFO_ARGS } from '../../constants/xml.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import {
  getCurrentProviderSummary,
  switchToAnthropicProvider,
  switchToConfiguredCodexProvider,
} from '../../utils/providerManagement.js'
import { useSetAppState } from '../../state/AppState.js'

function ApplyProviderAndClose({
  onDone,
  action,
}: {
  onDone: (result?: string) => void
  action: 'anthropic' | 'codex'
}): React.ReactNode {
  const setAppState = useSetAppState()

  useEffect(() => {
    const result =
      action === 'anthropic'
        ? switchToAnthropicProvider()
        : switchToConfiguredCodexProvider()

    if (result.ok) {
      setAppState(previous => ({
        ...previous,
        mainLoopModel: result.mainLoopModel,
        mainLoopModelForSession: null,
        effortValue: result.effortLevel,
      }))
    }

    onDone(result.message)
  }, [action, onDone, setAppState])

  return null
}

export const call: LocalJSXCommandCall = async (onDone, _context, args) => {
  const normalizedArgs = args?.trim().toLowerCase() ?? ''

  if (COMMON_INFO_ARGS.includes(normalizedArgs) || normalizedArgs === 'status') {
    onDone(getCurrentProviderSummary())
    return
  }

  if (COMMON_HELP_ARGS.includes(normalizedArgs)) {
    onDone(
      'Run /provider to open the provider manager, /provider status to inspect the current provider, or /provider [anthropic|codex] to switch quickly.',
    )
    return
  }

  if (normalizedArgs === 'anthropic' || normalizedArgs === 'codex') {
    return (
      <ApplyProviderAndClose
        onDone={onDone}
        action={normalizedArgs}
      />
    )
  }

  return (
    <Pane color="permission">
      <ProviderManager
        onFinish={onDone}
        onCancel={() => onDone('Provider manager dismissed')}
      />
    </Pane>
  )
}
