import { basename, join, sep } from 'path'
import type { FsOperations } from './fsOperations.js'

export const PRIMARY_SHARED_INSTRUCTION_FILE = 'AGENTS.md'
export const LEGACY_SHARED_INSTRUCTION_FILE = 'CLAUDE.md'
export const LEGACY_LOCAL_INSTRUCTION_FILE = 'CLAUDE.local.md'

type ExistsSyncOnly = Pick<FsOperations, 'existsSync'>
type ReadableFs = Pick<FsOperations, 'existsSync' | 'readFileSync'>

export function getSharedInstructionCandidatePaths(dir: string): string[] {
  return [
    join(dir, LEGACY_SHARED_INSTRUCTION_FILE),
    join(dir, PRIMARY_SHARED_INSTRUCTION_FILE),
  ]
}

export function getDotClaudeInstructionCandidatePaths(dir: string): string[] {
  return [
    join(dir, '.claude', LEGACY_SHARED_INSTRUCTION_FILE),
    join(dir, '.claude', PRIMARY_SHARED_INSTRUCTION_FILE),
  ]
}

export function getProjectInstructionCandidatePaths(dir: string): string[] {
  return [
    ...getSharedInstructionCandidatePaths(dir),
    ...getDotClaudeInstructionCandidatePaths(dir),
  ]
}

export function resolvePreferredSharedInstructionPath(
  canonicalPath: string,
  legacyPath: string,
  fs: ExistsSyncOnly,
): string {
  if (fs.existsSync(canonicalPath)) {
    return canonicalPath
  }
  if (fs.existsSync(legacyPath)) {
    return legacyPath
  }
  return canonicalPath
}

export function isSharedInstructionPath(filePath: string): boolean {
  const name = basename(filePath)
  return (
    name === PRIMARY_SHARED_INSTRUCTION_FILE ||
    name === LEGACY_SHARED_INSTRUCTION_FILE
  )
}

export function isInstructionMemoryFilePath(filePath: string): boolean {
  const name = basename(filePath)

  if (
    name === PRIMARY_SHARED_INSTRUCTION_FILE ||
    name === LEGACY_SHARED_INSTRUCTION_FILE ||
    name === LEGACY_LOCAL_INSTRUCTION_FILE
  ) {
    return true
  }

  return (
    name.endsWith('.md') &&
    filePath.includes(`${sep}.claude${sep}rules${sep}`)
  )
}

export function isHarnessRoutingAgentsContent(content: string): boolean {
  const normalized = content.toLowerCase()

  return (
    normalized.includes('## task routing') &&
    normalized.includes('routing map') &&
    normalized.includes('agent-first control plane')
  )
}

export function isHarnessRoutingAgentsPath(
  filePath: string,
  fs: ReadableFs,
): boolean {
  if (basename(filePath) !== PRIMARY_SHARED_INSTRUCTION_FILE) {
    return false
  }

  try {
    const content = fs.readFileSync(filePath, { encoding: 'utf8' })
    return isHarnessRoutingAgentsContent(content)
  } catch {
    return false
  }
}

export function hasProjectOnboardingInstructionFile(
  dir: string,
  fs: ReadableFs,
): boolean {
  const rootAgentsPath = join(dir, PRIMARY_SHARED_INSTRUCTION_FILE)

  return getProjectInstructionCandidatePaths(dir).some(path => {
    if (!fs.existsSync(path)) {
      return false
    }

    if (path === rootAgentsPath && isHarnessRoutingAgentsPath(path, fs)) {
      return false
    }

    return true
  })
}
