> ✅ Completed: 2026-04-07
> Summary: 在 desktop slash suggestions 中新增 /init，并将内建 review 命令模型泛化为 prompt-command。
> Duration: TBD
> Key learnings: TBD

# desktop slash init command

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: 在 desktop 右侧输入框的 `/` 建议中支持 CLI 内建 prompt 命令 `/init`，让用户可以像选择 `/review` 一样选择、查看引导并发送到当前线程 TUI。
- **Scope**:
  - 为 `/init` 建立独立的内建 prompt 命令建议项
  - 调整 desktop slash prompt 命令模型，使其不再只服务代码审查命令
  - 增补 `/init` 的 smoke test，并保证原有 review/skill 行为不回归
- **Non-goals**:
  - 不实现 `/init` 的实际 prompt 生成逻辑，仍由 CLI 负责执行
  - 不接入 `/statusline`、`/insights` 等其他内建 prompt 命令
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-07-desktop-slash-init-command.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

desktop 当前已经支持 `/review`、`/pr-comments`、`/security-review` 这组内建 prompt 命令，但 UI 建模仍写死为“代码审查命令”。根据参考文档，`/init` 同样属于 CLI 的内建 `prompt` 命令，应以相同的 desktop 交互模型被发现和选择，只是它不应被错误归类到“代码审查”分组里。

## Optimized Task Brief

- **Outcome**:
  - 输入 `/` 时，desktop slash suggestions 会新增“初始化”分组，包含 `/init`
  - 选择 `/init` 后，输入框展示内建命令 pill、helper text 和发送占位提示
  - 发送后会把 `/init` 直接写入当前线程 TUI
- **Problem**:
  - 当前 desktop 只把内建 prompt 命令建模成“代码审查命令”，无法承载 `/init`
  - 若继续复用“代码审查”语义，会让 `/init` 的 discoverability 与分组命名都出现偏差
- **Scope**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Non-goals**:
  - 不新增新的 hover card 类型
  - 不更改 skill pill 和状态卡片逻辑
- **Constraints**:
  - `/init` 必须作为内建 `prompt` 命令而非技能或状态卡片实现
  - 现有 `/review`、`/pr-comments`、`/security-review` 行为不能回归
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run desktop:typecheck`
  - `bun run desktop:test -- shell.smoke.test.tsx`
  - `python3 scripts/check_harness.py`
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-desktop-slash-init-command.md
  - docs/PLANS.md
- **Open assumptions**:
  - 先为 `/init` 单独新增“初始化”分组，比现在就全面重构所有内建 prompt 命令分组更稳妥

## Incremental Slices

### Slice 1 — Establish context and the smallest viable change

- [x] Implement
  - 跑 harness preflight
  - 创建 active plan
  - 复核 `docs/references/cli-slash-commands.md` 里 `/init` 的 prompt-command 语义
- [x] Validate
  - `python3 scripts/check_harness.py`
  - `docs/PLANS.md` 已同步 active entry

### Slice 2 — Deliver the core implementation

- [x] Implement
  - 将内建 slash prompt 命令模型泛化，不再只绑定“代码审查命令”
  - 新增 `/init` 建议项、初始化分组、pill 选择文案与 helper text
  - 让 `/init` 发送时写入 `/init\r`，不带多余空格
- [x] Validate
  - smoke test 验证 `/init` 可被选择、展示 helper text 并写入线程 TUI
  - smoke test 验证 `/review` 在新增 `/init` 后仍能准确选中与发送

### Slice 3 — Documentation, observability, and finish-up

- [x] Sync docs and generated surfaces
  - 回填 validation log、decision log、archive notes
- [x] Final validation
  - 跑 desktop 校验与 harness check
  - 归档 active plan

## Risks and Rollback

- 风险：
  - 若仍保留“代码审查命令”硬编码语义，后续新增其他内建 prompt 命令会继续受阻
  - 若 `/init` 仍沿用带空格的 `insertValue`，发送时会产生多余尾随空格
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | 将 desktop 内建 slash 命令从“代码审查命令”泛化为 `prompt-command` | `/init` 与 `/review` 同属 CLI 内建 prompt 命令，不能继续被 review 语义绑死 |
| 2026-04-07 | `/init` 先单独放在“初始化”分组 | 比一次性重构所有内建 prompt 命令分组更小、更稳、也更符合当前用户目标 |
| 2026-04-07 | `/init` 使用无尾空格的 `insertValue` | 该命令当前不需要参数，发送时应保持 `/init\r` 而不是 `/init \r` |

## Validation Log

- `2026-04-07`: `python3 scripts/check_harness.py` 通过
- `2026-04-07`: 已确认 `/init` 在参考文档中属于 CLI 内建 `prompt` 命令
- `2026-04-07`: `bun run desktop:typecheck` 通过
- `2026-04-07`: `bun run desktop:test -- shell.smoke.test.tsx` 通过，27/27 用例通过
- `2026-04-07`: 已验证 `/init` 可展示在“初始化”分组中，并以 `/init\r` 写入线程 TUI

## Archive Notes

- Completion summary:
  - desktop slash suggestions 新增了 `/init` 内建 prompt 命令入口
  - 现有 review 命令模型已泛化为更通用的 `prompt-command`
  - smoke test 已覆盖 `/init` 选择与发送路径，并确保 `/review` 不回归
