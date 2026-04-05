import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { setCwdState, setOriginalCwd } from './bootstrap/state.js'
import { getClaudeSkillScope } from './utils/permissions/filesystem.js'
import { getCommandName } from './types/command.js'
import { getClaudeConfigHomeDir } from './utils/envUtils.js'
import { getSkillsPath, getSkillsPaths, getSkillDirCommands, clearSkillCaches } from './skills/loadSkillsDir.js'

const originalHome = process.env.HOME
const originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR
const originalCwd = process.cwd()

let tempHome = ''
let tempProject = ''

function writeText(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content, 'utf8')
}

describe('skill home directory support', () => {
  beforeEach(() => {
    tempHome = mkdtempSync(join(tmpdir(), 'skill-home-'))
    tempProject = join(tempHome, 'project')
    mkdirSync(tempProject, { recursive: true })
    process.env.HOME = tempHome
    process.env.CLAUDE_CONFIG_DIR = join(tempHome, '.claude')
    getClaudeConfigHomeDir.cache.clear?.()
    clearSkillCaches()
    process.chdir(tempProject)
    setOriginalCwd(tempProject)
    setCwdState(tempProject)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    setOriginalCwd(originalCwd)
    setCwdState(originalCwd)
    if (originalHome === undefined) {
      delete process.env.HOME
    } else {
      process.env.HOME = originalHome
    }
    if (originalClaudeConfigDir === undefined) {
      delete process.env.CLAUDE_CONFIG_DIR
    } else {
      process.env.CLAUDE_CONFIG_DIR = originalClaudeConfigDir
    }
    getClaudeConfigHomeDir.cache.clear?.()
    clearSkillCaches()
    rmSync(tempHome, { recursive: true, force: true })
  })

  test('loads user-invocable skills from ~/.agents/skills for slash command discovery', async () => {
    writeText(
      join(tempHome, '.agents', 'skills', 'agent-home', 'SKILL.md'),
      `---
name: agent-home
description: 测试 ~/.agents/skills 加载
---

这是一个测试 skill。
`,
    )

    const commands = await getSkillDirCommands(tempProject)

    expect(commands.some(command => getCommandName(command) === 'agent-home')).toBe(
      true,
    )
  })

  test('exposes both ~/.agents/skills and ~/.claude/skills as user skill roots', () => {
    expect(getSkillsPaths('userSettings', 'skills')).toEqual([
      join(tempHome, '.agents', 'skills'),
      join(tempHome, '.claude', 'skills'),
    ])
    expect(getSkillsPath('userSettings', 'skills')).toBe(
      join(tempHome, '.agents', 'skills'),
    )
  })

  test('permission narrowing recognizes files inside ~/.agents/skills', () => {
    const skillFile = join(
      tempHome,
      '.agents',
      'skills',
      'agent-home',
      'SKILL.md',
    )

    expect(getClaudeSkillScope(skillFile)).toEqual({
      skillName: 'agent-home',
      pattern: '~/.agents/skills/agent-home/**',
    })
  })
})
