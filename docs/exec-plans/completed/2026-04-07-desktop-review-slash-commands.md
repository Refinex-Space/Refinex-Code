> ✅ Completed: 2026-04-07
> Summary: 完成 desktop 右侧输入框的代码审查 slash 分类，新增 /review、/pr-comments、/security-review 分组建议、单命令 pill 引导和回归测试。
> Duration: 单次 UI 能力扩展与回归验证
> Key learnings: 内建 prompt commands 不能套用 skill 连缀模型；desktop 若复用 CLI `/`，需要在 suggestion 分组、命令 pill 状态和参数引导三个层面同时建模。

# desktop review slash commands

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: 在 desktop 右侧输入框的 `/` 建议面板里增加“代码审查”分类，优先显示 `/review`、`/pr-comments`、`/security-review`，支持键盘选择并在选中后按 CLI 真实用法引导用户输入参数或直接发送。
- **Scope**:
  - 复用 `2026-04-07-cli-slash-commands-reference.md` 中关于 `/review` 相关命令的研究结论
  - 改造 `workspace-composer.tsx` 的 slash suggestions，从单一技能列表扩展为“代码审查 + 技能”的分组面板
  - 设计 review slash command 选中后的输入态、pill 样式和引导文案
  - 增补桌面 smoke test 验证发送到 `thread-tui` 的实际输入
- **Non-goals**:
  - 不实现完整 CLI 全量 `/` 命令迁移
  - 不接入内建 prompt commands 的运行时动态发现机制，本次只落地已研究清楚的代码审查命令
  - 不改动 thread-tui 后端 slash command 执行逻辑
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-07-desktop-review-slash-commands.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

当前 desktop 右侧输入框已经支持 `/` 唤出 skills，并能将已选 skill 作为 pill 回写到输入框。但 CLI 的 `/` 不是只有 skills，还包含内建 prompt commands。前一份已归档研究明确指出 `/review`、`/pr-comments`、`/security-review` 属于“代码审查”类内建 prompt commands，适合作为 desktop `/` 的下一批高价值能力。

## Optimized Task Brief

- **Outcome**:
  - 输入 `/` 时，建议面板在“技能”上方增加“代码审查”分组
  - 用户可用上下键和回车选择 review 命令
  - 选中后输入框进入带命令 pill 的引导态，发送到 `thread-tui` 的内容符合 CLI 用法
- **Problem**:
  - 当前 desktop `/` suggestions 把 slash space 错误地缩窄成“只有 skill”
  - review 相关命令和 skill 的使用方式不同，如果仍按 skill 连缀模型实现，会把 `/review 123` 做成无效输入
- **Scope**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Non-goals**:
  - 不为所有 builtin prompt commands 做分类与交互迁移
  - 不改变现有多 skill pill 的发送行为
- **Constraints**:
  - 代码审查分组必须排在技能分组上方
  - 选中 review 命令后必须体现“单一 slash command + 参数输入”的模型，而不是 skill 连缀
  - 引导文案必须符合已研究出的 CLI 用法边界
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
  - `docs/exec-plans/completed/2026-04-07-desktop-review-slash-commands.md`
- **Validation**:
  - `bun run desktop:test -- shell.smoke.test.tsx`
  - `bun run desktop:typecheck`
  - `python3 scripts/check_harness.py`
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-desktop-review-slash-commands.md
  - docs/PLANS.md
- **Open assumptions**:
  - 代码审查命令先以内建静态目录落地即可，不阻塞后续更通用的 slash command 注册桥接
  - `/security-review` 在 desktop 引导态里允许“直接发送”即可满足第一版体验

## Incremental Slices

### Slice 1 — Establish context and the smallest viable change

- [x] Implement
  - 运行 harness preflight
  - 复核已归档 slash command 研究结论
  - 定位 desktop composer 当前 skill-only slash suggestions 实现和相关测试
- [x] Validate
  - `python3 scripts/check_harness.py`
  - 确认当前 active plan 已创建并同步到 `docs/PLANS.md`

### Slice 2 — Deliver the core implementation

- [x] Implement
  - 将 slash suggestions 扩展为分组列表
  - 为 review commands 设计单命令 pill 与使用引导
  - 保持现有 skill 选择与多 skill 连缀能力
- [x] Validate
  - 验证 `/` 面板分组顺序、键盘选择和发送内容正确

### Slice 3 — Documentation, observability, and finish-up

- [x] Sync docs and generated surfaces
  - 回填 validation log、decision log、archive notes
- [x] Final validation
  - 运行桌面校验与 harness check
  - 归档 active plan

## Risks and Rollback

- 风险：
  - 如果把 review commands 也并入多 pill skill 模型，生成的命令串会失效
  - slash suggestions 从单列表改为分组列表后，键盘索引和 aria-activedescendant 容易错位
  - 测试若只校验 UI，不校验写入 `thread-tui` 的实际字符串，回归会被漏掉
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | review 相关内建 prompt commands 单独建“代码审查”分组 | 它们不是 skills，且交互模型是单一 slash command + 参数 |
| 2026-04-07 | 代码审查命令使用单独 pill 状态，不与多 skill pill 混用 | 避免生成无效的命令前缀串 |
| 2026-04-07 | review 命令使用静态目录与命令专属 helper text | 本次目标是高价值首批落地，不阻塞后续更通用的 slash command 注册桥接 |

## Validation Log

- `2026-04-07`: `python3 scripts/check_harness.py` 通过
- `2026-04-07`: 已复核 `docs/exec-plans/completed/2026-04-07-cli-slash-commands-reference.md`
- `2026-04-07`: 已定位 desktop slash suggestions 入口为 `workspace-composer.tsx`，对应回归测试位于 `shell.smoke.test.tsx`
- `2026-04-07`: 已在 `workspace-composer.tsx` 实现“代码审查 + 技能”的分组 slash suggestions，并加入 review 命令单独 pill / helper text / placeholder 引导
- `2026-04-07`: `bun run desktop:typecheck` 通过
- `2026-04-07`: `bun run desktop:test -- shell.smoke.test.tsx` 通过，22 个测试全部通过
- `2026-04-07`: 再次运行 `python3 scripts/check_harness.py`，结果通过

## Archive Notes

- 归档时记录：
  - desktop `/` 输入框已支持“代码审查”分类
  - `/review`、`/pr-comments`、`/security-review` 使用单命令 pill 模型
  - 现有多 skill pill 行为保持不变
