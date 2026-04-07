> ✅ Completed: 2026-04-07
> Summary: 为 desktop slash 新增 /status、/stats、/usage 悬浮卡片，并补齐选中/外部关闭/自动关闭 smoke test。
> Duration: TBD
> Key learnings: TBD

# desktop status slash hover cards

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: 在 desktop 右侧输入框的 `/` 建议里增加 `/status`、`/stats`、`/usage` 三个“状态、诊断与运营”命令，并在选中时以自动收起的悬浮卡片展示，而不是写回输入框。
- **Scope**:
  - 基于 `docs/references/cli-slash-commands.md` 里 5.4 的命令语义设计 desktop 对应交互
  - 扩展 `workspace-composer.tsx` 的 slash suggestions，新增“状态、诊断与运营”分组
  - 为 `/status`、`/stats`、`/usage` 实现悬浮卡片状态、点击外部关闭和超时自动收起
  - 为 card 内容接入 desktop 已有本地状态，如 app version、provider/model、线程与技能数量
  - 增补 smoke test 覆盖选中、展示、外部关闭和自动关闭行为
- **Non-goals**:
  - 不实现真正的 `/status`、`/stats`、`/usage` 后端数据面板
  - 不改造现有 review/skill 的输入回写模型
  - 不伪造 CLI 才有的账户额度与远端统计数据
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-07-desktop-status-slash-hover-cards.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

上一轮 desktop `/` 已经支持“代码审查 + 技能”分组，并把 `/review` 系列建模为可写回输入框的单命令 pill。根据 slash command 参考文档，`/status`、`/stats`、`/usage` 属于 `local-jsx` 运行状态/统计/额度类命令，更适合做成“选中即展示的悬浮卡片”，而不是继续占用输入框。

## Optimized Task Brief

- **Outcome**:
  - 输入 `/` 时，建议面板里新增“状态、诊断与运营”分组
  - 选择 `/status`、`/stats`、`/usage` 时弹出高信息密度悬浮卡片
  - 卡片可通过点击其他区域或超时自动关闭
- **Problem**:
  - 当前 desktop `/` 只支持“写回输入框”的命令模型，不适合 `local-jsx` 状态型命令
  - desktop 目前没有 `/status`、`/stats`、`/usage` 对应的后端桥接，直接伪装成可执行命令会误导用户
- **Scope**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Non-goals**:
  - 不接入新的 Electron IPC bridge
  - 不增加新的 settings 或 store 结构
- **Constraints**:
  - 卡片内容必须区分“desktop 当前已知本地状态”和“CLI 中仍需实际执行的命令能力”
  - `/usage` 必须明确体现其在 CLI 中受账户可见性约束
  - 卡片收起逻辑不能干扰现有 composer 输入与 slash suggestions 键盘行为
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
  - `docs/exec-plans/active/2026-04-07-desktop-status-slash-hover-cards.md`
- **Validation**:
  - `bun run desktop:typecheck`
  - `bun run desktop:test -- shell.smoke.test.tsx`
  - `python3 scripts/check_harness.py`
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-desktop-status-slash-hover-cards.md
  - docs/PLANS.md
- **Open assumptions**:
  - 用本地状态驱动的 preview card 足以作为这三个命令的第一版 desktop 交互
  - 后续若接入真实 IPC 面板，本次卡片模型仍可作为前置 discoverability 层

## Incremental Slices

### Slice 1 — Establish context and the smallest viable change

- [x] Implement
  - 跑 harness preflight
  - 复核 slash command 参考文档 5.4 与现有 desktop `/` 实现
  - 确认 desktop 当前不存在对应后端 bridge，只能做前端 preview card
- [x] Validate
  - `python3 scripts/check_harness.py`
  - active plan 已创建并同步到 `docs/PLANS.md`

### Slice 2 — Deliver the core implementation

- [x] Implement
  - 扩展 slash suggestion 类型与分组
  - 实现 hover card 状态、定时器与点击外部关闭
  - 接入 `getAppInfo()` / provider / session / skills 等本地状态组装卡片内容
- [x] Validate
  - 验证分组、展示、关闭与现有 review/skill 行为互不干扰

### Slice 3 — Documentation, observability, and finish-up

- [x] Sync docs and generated surfaces
  - 回填 validation log、decision log、archive notes
- [x] Final validation
  - 跑 desktop 校验与 harness check
  - 归档 active plan

## Risks and Rollback

- 风险：
  - 若把这三条命令继续建模为输入框命令，会破坏 `local-jsx` 状态命令的交互预期
  - 自动关闭定时器若处理不好，会在用户阅读时闪退或与 slash suggestions 重叠
  - 悬浮卡片若伪造 CLI 不可得的数据，会损伤命令语义可信度
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | `/status`、`/stats`、`/usage` 采用“选中即展示”的 hover card，而不是写回输入框 | 这三条属于 `local-jsx` 状态型命令，更适合即时预览 |
| 2026-04-07 | 卡片内容优先使用 desktop 已知本地状态，再明确 CLI 才能看到的边界 | 避免伪造账户额度或远端统计能力 |
| 2026-04-07 | 当 hover card 已展开时，继续输入会立即收起卡片 | 避免状态预览阻断下一轮 `/` 搜索或普通输入 |
| 2026-04-07 | `/status` 系列测试增加 outside-click 与 auto-dismiss 覆盖，并把原有 skill actions smoke test 超时提高到 10 秒 | 新增真实 4.8 秒自动收起路径后，整文件在 CI/本机的边缘耗时更容易触及默认 5 秒阈值 |

## Validation Log

- `2026-04-07`: `python3 scripts/check_harness.py` 通过
- `2026-04-07`: 已复核 `docs/references/cli-slash-commands.md` 的 5.4 节
- `2026-04-07`: 已确认 desktop 当前存在 `getAppInfo()` / `getProviderSettings()` / 当前线程状态，但没有 `/status`、`/stats`、`/usage` 的专用 IPC 面板
- `2026-04-07`: `bun run desktop:typecheck` 通过
- `2026-04-07`: `bun run desktop:test -- shell.smoke.test.tsx` 通过，25/25 用例通过
- `2026-04-07`: `/status`、`/stats`、`/usage` 已验证为“选中即展示卡片”，不会写回 review/skill pill 模型

## Archive Notes

- Completion summary:
  - 在 desktop composer 的 slash suggestions 中新增“状态、诊断与运营”分组
  - `/status`、`/stats`、`/usage` 现在会展示本地状态驱动的 hover card，并支持点击外部/超时自动收起
  - smoke test 已覆盖选中展示、外部关闭与自动关闭
