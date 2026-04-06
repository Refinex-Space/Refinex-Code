> ✅ Completed: 2026-04-06
> Summary: 完成 desktop composer 语音听写接入与快捷键唤醒
> Duration: TBD
> Key learnings: TBD

# desktop voice dictation in composer

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: 在 desktop composer 中接入语音听写按钮与快捷键唤醒能力，并在静音或手动停止时把结果写回输入框
- **Scope**: renderer composer UI、voice dictation hook、renderer keyboard handling、desktop renderer tests
- **Non-goals**: 不接入服务端 ASR，不改消息发送链路，不做音频文件存储或上传
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/desktop-voice-dictation-in-composer.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

desktop composer 已有成熟的文本输入与按钮布局，但没有任何语音输入能力。Electron renderer 运行在 Chromium 环境中，适合优先复用浏览器语音识别接口实现“点击开始听写 / 静音自动停止 / 回填输入框”的产品路径，而不必先引入 main 进程录音管线。

## Optimized Task Brief

- **Outcome**: 发送按钮左侧出现语音输入按钮；点击或按 `Option+Space` 可以开始/结束听写；静音超时自动结束；结果直接写入 composer 文本框
- **Problem**: 当前 desktop 输入区只支持手动键盘输入，缺少高频听写场景
- **Scope**: 语音识别状态管理、composer UI、快捷键、测试
- **Non-goals**: 聊天消息发送、跨平台全自定义录音编解码、后台持续听写
- **Constraints**:
  - 优先复用 renderer 侧可用能力，避免无必要引入 Electron main 音频链路
  - 快捷键避开 macOS 默认 `Cmd+Space`
  - 无 active session 时禁止听写，避免把文本写入无效上下文
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/hooks/use-voice-dictation.ts`
  - `apps/desktop/src/renderer/src/test/setup.ts`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run desktop:typecheck`
  - `bun run desktop:test`
  - `python3 scripts/check_harness.py`
- **Docs to sync**:
  - docs/exec-plans/active/desktop-voice-dictation-in-composer.md
  - docs/PLANS.md
- **Open assumptions**:
  - 第一版语音输入采用 Chromium SpeechRecognition / webkitSpeechRecognition

## Incremental Slices

### Slice 1 — Establish context and the smallest viable change

- [x] Implement
- [x] Validate

### Slice 2 — Deliver the core implementation

- [x] Implement
- [x] Validate

### Slice 3 — Documentation, observability, and finish-up

- [x] Sync docs and generated surfaces
- [x] Final validation

## Risks and Rollback

- 浏览器语音识别接口在部分环境中可能不可用，因此 UI 需要明确降级并禁止误触
- 快捷键若选择 `Cmd+Space` 会与系统 Spotlight 冲突
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | 听写能力优先使用 renderer 侧 Web Speech API | 最贴合当前产品形态，接入成本和状态边界都显著低于自建录音/转写链路 |
| 2026-04-06 | 快捷键采用 `Option+Space` | 避开 macOS Spotlight 默认 `Cmd+Space`，同时仍然满足“空格 + 修饰键”快速唤醒要求 |

## Validation Log

- `bun run desktop:typecheck` -> pass
- `bun run desktop:test` -> pass
- `python3 scripts/check_harness.py` -> pass

## Archive Notes

- 归档时说明：voice dictation 已接入 composer；支持按钮与 `Option+Space` 唤醒；静音超时自动结束并回填输入框
