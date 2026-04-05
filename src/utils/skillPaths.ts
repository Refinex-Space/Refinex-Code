import { homedir } from 'os'
import { join } from 'path'
import type { SettingSource } from './settings/constants.js'
import { getManagedFilePath } from './settings/managedPath.js'
import { getClaudeConfigHomeDir } from './envUtils.js'

function dedupePaths(paths: string[]): string[] {
  return [...new Set(paths.map(path => path.normalize('NFC')))]
}

function getUserHomeDir(): string {
  return (process.env.HOME ?? homedir()).normalize('NFC')
}

export function getUserSkillPaths(
  dir: 'skills' | 'commands',
): string[] {
  if (dir === 'skills') {
    return dedupePaths([
      join(getUserHomeDir(), '.agents', 'skills'),
      join(getClaudeConfigHomeDir(), 'skills'),
    ])
  }

  return [join(getClaudeConfigHomeDir(), 'commands').normalize('NFC')]
}

export function getSkillsPaths(
  source: SettingSource | 'plugin',
  dir: 'skills' | 'commands',
): string[] {
  switch (source) {
    case 'policySettings':
      return [join(getManagedFilePath(), '.claude', dir).normalize('NFC')]
    case 'userSettings':
      return getUserSkillPaths(dir)
    case 'projectSettings':
      return [`.claude/${dir}`]
    case 'plugin':
      return ['plugin']
    default:
      return []
  }
}

export function getPrimarySkillsPath(
  source: SettingSource | 'plugin',
  dir: 'skills' | 'commands',
): string {
  return getSkillsPaths(source, dir)[0] ?? ''
}
