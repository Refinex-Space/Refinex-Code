> ✅ Completed: 2026-04-06
> Summary: 完成 desktop composer 的 sherpa-onnx 本地离线语音输入接入
> Duration: TBD
> Key learnings: TBD

# desktop sherpa onnx dictation

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: 在 desktop composer 中接入不依赖云提供商的本地离线语音输入，并替换不稳定的浏览器 Web Speech 方案
- **Scope**: desktop main/preload/renderer 语音输入链路、离线模型准备、PCM 采集、桌面测试
- **Non-goals**: 不做服务端 STT、不做流式逐字转写、不做多平台原生录音模块打包
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-06-desktop-sherpa-onnx-dictation.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Optimized Task Brief

- **Outcome**: composer 语音按钮改为本地离线听写；首次使用自动下载 `sherpa-onnx` 中文小模型；点击或 `Option+Space` 开始/结束录音；静音自动停；结果回填输入框
- **Why it matters**: 现有 Web Speech 在 Electron 中实际报 `network`，无法满足稳定可用的桌面端语音录入
- **Constraints**:
  - 不依赖 Anthropic / OpenAI / 第三方云语音
  - 不走原生签名 / App Store 路线
  - 优先支持中文
  - 包体不直接内置大模型，模型按需下载到用户数据目录
- **Affected surfaces**:
  - `apps/desktop/package.json`
  - `apps/desktop/src/main/index.ts`
  - `apps/desktop/src/main/voice-dictation.ts`
  - `apps/desktop/src/preload/index.ts`
  - `apps/desktop/src/shared/contracts.ts`
  - `apps/desktop/src/renderer/src/hooks/use-voice-dictation.ts`
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/setup.ts`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run desktop:typecheck`
  - `bun run desktop:test`
  - `python3 scripts/check_harness.py`
  - `node` 直接加载 `sherpa-onnx-node`

## Incremental Slices

### Slice 1 — Establish the desktop offline dictation bridge

- [x] Implement
- [x] Validate

### Slice 2 — Replace the renderer capture and transcription flow

- [x] Implement
- [x] Validate

### Slice 3 — Regression coverage and finish-up

- [x] Implement
- [x] Validate

## Risks and Rollback

- 首次使用需要联网下载约 79MB 模型，离线且未下载过模型时不可立即使用
- 当前实现仅验证 macOS 路径，其他平台明确降级
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | 放弃 Web Speech，改为 `sherpa-onnx-node` | 现网 Electron 环境已出现 `network`，浏览器内建识别不稳定 |
| 2026-04-06 | 选择 `csukuangfj/sherpa-onnx-paraformer-zh-small-2024-03-09` | 中文可用、官方文档明确、`model.int8.onnx` 约 79MB，明显小于 Whisper 常见本地方案 |
| 2026-04-06 | 录音采集放在 renderer，推理放在 main | 避免额外原生录音依赖，同时保留 Electron 侧长期可扩展性 |

## Validation Log

- `bun run desktop:typecheck` -> pass
- `bun run desktop:test` -> pass
- `python3 scripts/check_harness.py` -> pass
- `node` direct load of `sherpa-onnx-node` -> pass (`1.12.35`)

## Archive Notes

- 归档时说明：desktop composer 已切换为 `sherpa-onnx` 本地离线听写；首用下载模型；支持按钮与 `Option+Space` 唤醒；静音自动停止并回填输入框
