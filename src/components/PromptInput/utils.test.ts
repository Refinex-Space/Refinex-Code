import { afterEach, describe, expect, it } from 'bun:test'

import { shouldHidePromptChrome } from './utils.js'

const originalHidePromptUi = process.env.CLAUDE_CODE_HIDE_PROMPT_UI

describe('shouldHidePromptChrome', () => {
  afterEach(() => {
    if (originalHidePromptUi === undefined) {
      delete process.env.CLAUDE_CODE_HIDE_PROMPT_UI
      return
    }

    process.env.CLAUDE_CODE_HIDE_PROMPT_UI = originalHidePromptUi
  })

  it('在嵌入式 thread-tui 模式下返回 true', () => {
    process.env.CLAUDE_CODE_HIDE_PROMPT_UI = '1'

    expect(shouldHidePromptChrome()).toBe(true)
  })

  it('默认不隐藏 prompt chrome', () => {
    delete process.env.CLAUDE_CODE_HIDE_PROMPT_UI

    expect(shouldHidePromptChrome()).toBe(false)
  })
})
