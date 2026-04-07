> ✅ Completed: 2026-04-07
> Summary: 完成桌面端 slash skill 建议展示、键盘选择与测试验证
> Duration: same session
> Key learnings: 复用 CLI 的 slash skill 插入格式可以显著降低桌面端与 CLI 语义漂移，但桌面端仍需独立的轻量 suggestion UI 实现。

# desktop slash skill suggestion ui

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: 为桌面端右侧主面板输入框补齐 `/` 触发的 skill 建议面板，支持展示、键盘选择和插入 skill slash 文本。
- **Scope**: 仅覆盖桌面 renderer 中主工作区 composer 的 slash skill 建议 UI、过滤匹配、键盘导航与回填行为，以及对应测试。
- **Non-goals**: 不在本次实现完整 slash command 体系；不接入非 skill 命令；不执行 skill 本身的业务逻辑改造；不改动 CLI 行为。
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-07-desktop-slash-skill-suggestion-ui.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

桌面端 composer 目前只有普通 `textarea`，placeholder 已提示 `/ 唤出命令`，但 renderer 中没有 slash suggestion 能力。桌面端已经通过 `getSkillsSnapshot()` 暴露 skill 元数据，包含 `name`、`displayName`、`description` 和 `userInvocable`，足以支撑第一阶段的 slash skill 建议 UI。CLI 侧 `/` 建议会把选中的命令写回为 `/${commandName} `，因此桌面端本阶段只需对 skill 做同样的插入格式即可。

## Optimized Task Brief

- **Outcome**: 用户在桌面端主面板输入 `/` 或 `/partial` 时，可在输入框上方看到 skill 建议列表，支持上下键切换和回车插入 `/${skill.name} `。
- **Problem**: 当前桌面端提示了 slash 命令入口，但没有任何发现性与选择能力，skill 入口不可用。
- **Scope**:
  - 在 composer 中加载当前工作区可见的 skill snapshot
  - 过滤 `userInvocable` skills，并按 CLI 风格优先匹配名称/分词/描述
  - 渲染输入框上方建议面板，展示格式为人类可读名称 + 单行 description
  - 支持 `ArrowUp` / `ArrowDown` / `Enter`
  - 补充 renderer smoke test
- **Non-goals**:
  - 不实现参数提示、内联 ghost text、Tab 接受等完整 CLI typeahead 能力
  - 不实现 `/` 后的全部内建命令
  - 不改动 TUI 或 CLI 的 skill 解析链路
- **Constraints**:
  - 遵守 root `AGENTS.md`，优先保证正确性，不引入无关 UI IO
  - 不回滚当前工作区已有脏改动
  - 编辑使用 `apply_patch`
- **Affected surfaces**:
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
- **Validation**:
  - `bun run --cwd apps/desktop test -- shell.smoke.test.tsx`
  - `bun run desktop:typecheck`
- **Docs to sync**:
  - docs/exec-plans/completed/2026-04-07-desktop-slash-skill-suggestion-ui.md
  - docs/PLANS.md
- **Open assumptions**:
  - 首阶段只对 skill 生效，输入框中 `/` 后带空格即视为进入参数输入态，不再展示建议
  - 选中 skill 后插入格式与 CLI 保持一致，为 `/${skill.name} `

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

- skills snapshot 在 renderer 端异步加载，若状态管理不当，可能出现建议列表闪烁或选择索引越界
- slash skill 只实现了 skill 子集，后续若接入完整 slash commands 需要抽离成独立 typeahead 层
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | 选中 suggestion 后沿用 CLI 的 `/${commandName} ` 写回格式 | 避免桌面端与 CLI 的 slash skill 语义分叉 |
| 2026-04-07 | composer 内直接读取 skills snapshot，而不复用 `useSkillsData()` | 避免为建议列表额外读取 skill 文件预览，减少无关 IO |
| 2026-04-07 | 本阶段只暴露 `userInvocable` skills 到 slash suggestions | 与 CLI 中“可由用户用 slash 触发”的技能语义保持一致 |

## Validation Log

- `python3 scripts/check_harness.py` ✅
- 已核对 CLI `/` 选择行为：`src/utils/suggestions/commandSuggestions.ts#formatCommand` 输出 `/${command} `
- `bun run desktop:typecheck` ✅
- `bun run --cwd apps/desktop test -- shell.smoke.test.tsx` ✅
- 验证点：`/` 可展示 skills；支持上下键切换；回车仅插入 `/${skill.name} `；`userInvocable: false` skill 不展示 ✅

## Archive Notes

- 完成后归档到 `docs/exec-plans/completed/`
- 结果摘要：桌面端右侧主面板已支持 slash skill 建议 UI 与键盘选择
