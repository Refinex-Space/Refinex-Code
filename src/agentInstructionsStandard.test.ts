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
import initCommand from './commands/init.js'
import {
  getSteps,
  shouldShowProjectOnboarding,
} from './projectOnboardingState.js'
import {
  getCurrentProjectConfig,
  getMemoryPath,
  saveCurrentProjectConfig,
} from './utils/config.js'
import { isMemoryFilePath } from './utils/claudemd.js'

const originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR
const originalCwd = process.cwd()

let tempRoot = ''
let tempConfigDir = ''

function writeText(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content, 'utf8')
}

describe('agent instruction standard', () => {
  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'agent-standard-'))
    tempConfigDir = join(tempRoot, '.config')
    mkdirSync(tempConfigDir, { recursive: true })
    process.env.CLAUDE_CONFIG_DIR = tempConfigDir
    process.chdir(tempRoot)
    setOriginalCwd(tempRoot)
    setCwdState(tempRoot)
    saveCurrentProjectConfig(current => ({
      ...current,
      hasCompletedProjectOnboarding: false,
      projectOnboardingSeenCount: 0,
    }))
    shouldShowProjectOnboarding.cache.clear?.()
  })

  afterEach(() => {
    process.chdir(originalCwd)
    setOriginalCwd(originalCwd)
    setCwdState(originalCwd)
    saveCurrentProjectConfig(current => ({
      ...current,
      hasCompletedProjectOnboarding: false,
      projectOnboardingSeenCount: 0,
    }))
    shouldShowProjectOnboarding.cache.clear?.()
    if (originalClaudeConfigDir === undefined) {
      delete process.env.CLAUDE_CONFIG_DIR
    } else {
      process.env.CLAUDE_CONFIG_DIR = originalClaudeConfigDir
    }
    rmSync(tempRoot, { recursive: true, force: true })
  })

  test('defaults new shared memory paths to AGENTS.md but preserves legacy files when they already exist', () => {
    expect(getMemoryPath('User')).toBe(join(tempConfigDir, 'AGENTS.md'))
    expect(getMemoryPath('Project')).toBe(join(tempRoot, 'AGENTS.md'))

    writeText(join(tempConfigDir, 'CLAUDE.md'), '# legacy user\n')
    writeText(join(tempRoot, 'CLAUDE.md'), '# legacy project\n')

    expect(getMemoryPath('User')).toBe(join(tempConfigDir, 'CLAUDE.md'))
    expect(getMemoryPath('Project')).toBe(join(tempRoot, 'CLAUDE.md'))

    writeText(join(tempConfigDir, 'AGENTS.md'), '# canonical user\n')
    writeText(join(tempRoot, 'AGENTS.md'), '# canonical project\n')

    expect(getMemoryPath('User')).toBe(join(tempConfigDir, 'AGENTS.md'))
    expect(getMemoryPath('Project')).toBe(join(tempRoot, 'AGENTS.md'))
  })

  test('startup onboarding treats .claude/AGENTS.md as a valid project instruction file', () => {
    writeText(join(tempRoot, '.claude', 'AGENTS.md'), '# project instructions\n')

    const instructionStep = getSteps().find(step => step.key === 'claudemd')

    expect(instructionStep).toBeDefined()
    expect(instructionStep?.isEnabled).toBe(true)
    expect(instructionStep?.isComplete).toBe(true)
    expect(instructionStep?.text).toContain('AGENTS.md')
  })

  test('root harness AGENTS.md does not suppress project onboarding or condensed welcome mode', () => {
    writeText(
      join(tempRoot, 'AGENTS.md'),
      `# Refinex-Code

This repository uses an agent-first control plane with concise routing.

## Task Routing

- AGENTS.md is a routing map, not an encyclopedia
`,
    )

    const instructionStep = getSteps().find(step => step.key === 'claudemd')

    expect(instructionStep).toBeDefined()
    expect(instructionStep?.isComplete).toBe(false)
    expect(shouldShowProjectOnboarding()).toBe(true)
  })

  test('startup onboarding repairs stale completion state caused by a harness route map AGENTS.md', () => {
    writeText(
      join(tempRoot, 'AGENTS.md'),
      `# Refinex-Code

This repository uses an agent-first control plane with concise routing.

## Task Routing

- AGENTS.md is a routing map, not an encyclopedia
`,
    )
    saveCurrentProjectConfig(current => ({
      ...current,
      hasCompletedProjectOnboarding: true,
    }))
    shouldShowProjectOnboarding.cache.clear?.()

    expect(shouldShowProjectOnboarding()).toBe(true)
    expect(getCurrentProjectConfig().hasCompletedProjectOnboarding).toBe(false)
  })

  test('memory path detection recognizes AGENTS.md alongside legacy instruction files', () => {
    expect(isMemoryFilePath(join(tempRoot, 'AGENTS.md'))).toBe(true)
    expect(isMemoryFilePath(join(tempRoot, '.claude', 'AGENTS.md'))).toBe(true)
    expect(isMemoryFilePath(join(tempRoot, 'CLAUDE.md'))).toBe(true)
    expect(isMemoryFilePath(join(tempRoot, 'notes.md'))).toBe(false)
  })

  test('/init guidance now points shared setup at AGENTS.md', async () => {
    const prompt = await initCommand.getPromptForCommand()
    const text = prompt[0]?.type === 'text' ? prompt[0].text : ''

    expect(initCommand.description).toContain('AGENTS.md')
    expect(text).toContain('AGENTS.md')
    expect(text).not.toContain('create a CLAUDE.md file')
  })
})
