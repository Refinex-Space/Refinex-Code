import { chmodSync } from 'fs'
import memoize from 'lodash-es/memoize.js'
import { dirname, join } from 'path'
import { z } from 'zod/v4'
import { logForDebugging } from './debug.js'
import { getClaudeConfigHomeDir } from './envUtils.js'
import { getErrnoCode } from './errors.js'
import { getFsImplementation } from './fsOperations.js'
import { safeParseJSON } from './json.js'
import {
  getProviderRegistry,
  type ProviderAuthStoreMode,
} from './providerRegistry.js'
import { getSecureStorage } from './secureStorage/index.js'
import { jsonStringify } from './slowOperations.js'
import { writeFileSyncAndFlush_DEPRECATED } from './file.js'

export const ProviderAuthEntrySchema = z.object({
  apiKey: z.string().optional(),
  bearerToken: z.string().optional(),
})

export const ProviderAuthMapSchema = z.record(
  z.string(),
  ProviderAuthEntrySchema,
)

export const ProviderAuthFileSchema = z.object({
  $schema: z.string().optional(),
  providers: ProviderAuthMapSchema.optional(),
})

export type ProviderAuthEntry = z.infer<typeof ProviderAuthEntrySchema>
export type ProviderAuthFile = z.infer<typeof ProviderAuthFileSchema>
export type ResolvedProviderAuthBackend = 'file' | 'secure-storage'
export type ProviderAuthStoreInfo = {
  configuredMode: ProviderAuthStoreMode
  resolvedBackend: ResolvedProviderAuthBackend
  backendName: string
}

export function getProviderAuthFilePath(): string {
  return join(getClaudeConfigHomeDir(), 'auth.json')
}

function loadProviderAuthFileUncached(): ProviderAuthFile {
  const path = getProviderAuthFilePath()
  try {
    const content = getFsImplementation().readFileSync(path, {
      encoding: 'utf8',
    })
    if (!content.trim()) {
      return {}
    }

    const parsed = safeParseJSON(content, false)
    const result = ProviderAuthFileSchema.safeParse(parsed)
    if (result.success) {
      return result.data
    }

    logForDebugging(
      `[providerAuthStore] Ignoring invalid auth.json at ${path}`,
      { level: 'warn' },
    )
  } catch (error) {
    const code = getErrnoCode(error)
    if (code !== 'ENOENT') {
      logForDebugging(
        `[providerAuthStore] Failed to read auth.json at ${path}: ${String(error)}`,
        { level: 'warn' },
      )
    }
  }

  return {}
}

const loadProviderAuthFile = memoize(
  (): ProviderAuthFile => loadProviderAuthFileUncached(),
)

export function clearProviderAuthStoreCache(): void {
  loadProviderAuthFile.cache?.clear?.()
}

function writeProviderAuthFile(data: ProviderAuthFile): void {
  const path = getProviderAuthFilePath()
  const dir = dirname(path)
  try {
    getFsImplementation().mkdirSync(dir)
  } catch (error) {
    if (getErrnoCode(error) !== 'EEXIST') {
      throw error
    }
  }

  writeFileSyncAndFlush_DEPRECATED(
    path,
    jsonStringify(data, null, 2) + '\n',
    { encoding: 'utf8' },
  )

  try {
    chmodSync(path, 0o600)
  } catch {
    // 忽略非 POSIX 文件系统上的 chmod 失败
  }

  clearProviderAuthStoreCache()
}

function parseProviderAuthMap(
  value: unknown,
): Record<string, ProviderAuthEntry> {
  const result = ProviderAuthMapSchema.safeParse(value)
  if (result.success) {
    return result.data
  }
  return {}
}

export function getProviderAuthStoreInfo(): ProviderAuthStoreInfo {
  const configuredMode = getProviderRegistry().authStore

  if (configuredMode === 'file') {
    return {
      configuredMode,
      resolvedBackend: 'file',
      backendName: 'auth.json',
    }
  }

  if (configuredMode === 'auto' && process.platform !== 'darwin') {
    return {
      configuredMode,
      resolvedBackend: 'file',
      backendName: 'auth.json',
    }
  }

  const storage = getSecureStorage()
  return {
    configuredMode,
    resolvedBackend: 'secure-storage',
    backendName: storage.name,
  }
}

function readProviderAuthMap(): Record<string, ProviderAuthEntry> {
  const store = getProviderAuthStoreInfo()
  if (store.resolvedBackend === 'file') {
    return loadProviderAuthFile().providers ?? {}
  }

  const storageData = getSecureStorage().read() ?? {}
  return parseProviderAuthMap(storageData.providerAuth)
}

export function isProviderAuthConfigured(
  auth: ProviderAuthEntry | null | undefined,
): boolean {
  return !!auth && !!(auth.apiKey || auth.bearerToken)
}

export function getProviderAuth(providerId: string): ProviderAuthEntry | null {
  return readProviderAuthMap()[providerId] ?? null
}

export function hasProviderAuth(providerId: string): boolean {
  return isProviderAuthConfigured(getProviderAuth(providerId))
}

export function saveProviderAuth(
  providerId: string,
  auth: ProviderAuthEntry,
): { success: boolean; warning?: string } {
  const parsed = ProviderAuthEntrySchema.safeParse(auth)
  if (!parsed.success || !isProviderAuthConfigured(parsed.data)) {
    return {
      success: false,
      warning: 'Provider auth entry must include at least one credential',
    }
  }

  const store = getProviderAuthStoreInfo()
  if (store.resolvedBackend === 'file') {
    const file = loadProviderAuthFile()
    writeProviderAuthFile({
      ...file,
      providers: {
        ...(file.providers ?? {}),
        [providerId]: parsed.data,
      },
    })
    return { success: true }
  }

  const storage = getSecureStorage()
  const storageData = storage.read() ?? {}
  storageData.providerAuth = {
    ...parseProviderAuthMap(storageData.providerAuth),
    [providerId]: parsed.data,
  }
  return storage.update(storageData)
}

export function deleteProviderAuth(providerId: string): boolean {
  const store = getProviderAuthStoreInfo()
  if (store.resolvedBackend === 'file') {
    const file = loadProviderAuthFile()
    const nextProviders = { ...(file.providers ?? {}) }
    delete nextProviders[providerId]
    writeProviderAuthFile({
      ...file,
      providers: nextProviders,
    })
    return true
  }

  const storage = getSecureStorage()
  const storageData = storage.read() ?? {}
  const nextProviders = parseProviderAuthMap(storageData.providerAuth)
  delete nextProviders[providerId]
  storageData.providerAuth = nextProviders
  return storage.update(storageData).success
}
