> ✅ Completed: 2026-04-07
> Summary: 完成 CLI / 斜杠命令深度研究文档，新增中文参考资料与 references 渐进式披露索引，并基于运行时导出结果整理当前可见命令目录。
> Duration: 单次文档研究与归档收口
> Key learnings: `/` 体系必须以运行时命令装配为准；desktop 若复用 CLI 行为，重点应复用来源、排序、参数态切换与执行分流，而不是只复刻候选 UI。

# cli slash commands reference

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: 基于 CLI 源码与实时命令注册结果，产出一份中文 `/` 斜杠命令深度参考文档，放入 `docs/references/`，并把 references 索引升级为渐进式披露入口。
- **Scope**:
  - 研究 `/` 命令的注册、可见性过滤、补全排序、参数引导与执行模型
  - 盘点当前仓库环境下真实可见的 slash commands
  - 分类整理内建命令、内建 prompt 命令、已安装 skills、隐藏命令
  - 更新 `docs/references/index.md`，为后续输入框 `/` 能力迭代提供稳定文档锚点
- **Non-goals**:
  - 不修改 CLI 或 desktop 的 `/` 交互实现
  - 不尝试覆盖 feature-gated 但当前未启用的全部命令实现细节
  - 不把 MCP 运行时临时注入的 model-only skills 误写成当前用户可直接输入的 slash commands
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-07-cli-slash-commands-reference.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

前序 desktop 输入框 `/skill` 交互开发已经证明，右侧主面板后续若要持续对齐 CLI 行为，必须先把 CLI 侧的 slash command 体系抽象成稳定、可索引、可复用的文档基线。本计划聚焦“把源码事实压成中文参考文档”，而不是继续修改 UI。

## Optimized Task Brief

- **Outcome**:
  - 新增 `docs/references/cli-slash-commands.md`
  - 更新 `docs/references/index.md`
  - 归档时保留验证证据，确保未来 desktop `/` 输入框能力可以直接引用
- **Problem**:
  - 当前仓库没有一份针对 CLI `/` 命令的体系化中文文档
  - 命令来源同时包含内建命令、prompt 命令、skills、插件/动态扩展，若只看 UI 容易误判能力边界
  - `/` 补全存在最近使用、Fuse 排序、参数 hint、特殊命令补全等机制，零散看代码难以复用
- **Scope**:
  - `src/commands.ts`
  - `src/types/command.ts`
  - `src/utils/suggestions/commandSuggestions.ts`
  - `src/hooks/useTypeahead.tsx`
  - `src/components/PromptInput/PromptInputFooterSuggestions.tsx`
  - `src/utils/processUserInput/processSlashCommand.tsx`
  - 关键命令实现：`help`、`skills`、`mcp`、`plugin`、`resume`、`context`、`init`、`review`、`security-review`
- **Non-goals**:
  - 不把所有命令源码逐行转写为 API 文档
  - 不为隐藏命令写产品级承诺，只做附录说明
- **Constraints**:
  - 以当前仓库和当前环境的真实 `getCommands()` 结果为准
  - 文档语言为中文
  - 遵守 Harness 渐进式披露：references index 只做入口，深度内容下沉到独立参考文档
- **Affected surfaces**:
  - `docs/references/index.md`
  - `docs/references/cli-slash-commands.md`
  - `docs/exec-plans/active/2026-04-07-cli-slash-commands-reference.md`
- **Validation**:
  - `python3 scripts/check_harness.py`
  - 重新执行 `enableConfigs() + getCommands(process.cwd())` 导出完整命令清单
  - 检查 references 索引链接与新文档路径
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-cli-slash-commands-reference.md
  - docs/references/index.md
  - docs/references/cli-slash-commands.md
  - docs/PLANS.md
- **Open assumptions**:
  - 当前环境下可见命令集合可代表 Refinex Code 本地常用工作流
  - feature-gated 命令以“附录说明”即可满足本次参考文档目标

## Incremental Slices

### Slice 1 — Establish context and the smallest viable change

- [x] Implement
  - 读取 Harness 路由文档与 references 索引
  - 研究命令注册、typeahead、执行链路
  - 运行仓库 preflight，并重新导出完整 slash command 快照
- [x] Validate
  - `python3 scripts/check_harness.py`
  - `bun -e "enableConfigs(); getCommands(process.cwd()) ..."` 成功导出 73 条命令快照

### Slice 2 — Deliver the core implementation

- [x] Implement
  - 撰写中文参考文档，覆盖控制平面模型、补全机制、执行模型、命令目录、风险与边界
- [x] Validate
  - 自查命令数量、分类与源码事实一致
  - 确认所有命令都归到正确章节

### Slice 3 — Documentation, observability, and finish-up

- [x] Sync docs and generated surfaces
  - 更新 `docs/references/index.md` 渐进式披露入口
  - 归档前补齐 validation log 与 archive notes
- [x] Final validation
  - 复跑 Harness 检查
  - 归档 active plan 到 `completed/`

## Risks and Rollback

- 风险：
  - 命令可见性受 `availability`、`isEnabled()`、feature flags、账号状态影响，文档必须明确“当前环境快照”边界
  - `getCommands()` 不包含 MCP 运行时 model-only skills，若不说明会误导 desktop `/` 功能设计
  - prompt command 描述可能来自 skills frontmatter，后续本地技能变动会导致目录漂移
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | 文档落在 `docs/references/cli-slash-commands.md` | 这是稳定参考资料，不是设计草案，也不是一次性执行计划 |
| 2026-04-07 | 以运行时 `getCommands()` 导出结果作为目录基线 | 只看 `src/commands.ts` 会漏掉用户技能与动态装配来源 |
| 2026-04-07 | references 索引只保留入口，深度内容下沉到单独文档 | 符合 Harness 渐进式披露，避免根索引膨胀 |

## Validation Log

- `2026-04-07`: `python3 scripts/check_harness.py` 通过
- `2026-04-07`: `bun -e "import { enableConfigs } from './src/utils/config.ts'; import { getCommands } from './src/commands.ts'; enableConfigs(); const cmds = await getCommands(process.cwd()); ..."` 成功导出完整命令快照
- `2026-04-07`: 快照统计结果为 73 条命令，其中 68 条可见；可见命令分布为 `local=9`、`local-jsx=42`、`prompt=17`
- `2026-04-07`: 新增 `docs/references/cli-slash-commands.md`，并更新 `docs/references/index.md`
- `2026-04-07`: 通过覆盖率脚本校验文档已覆盖 68 条可见命令名称
- `2026-04-07`: 再次运行 `python3 scripts/check_harness.py`，结果通过
- `2026-04-07`: 校验 `docs/references/index.md` 已包含 `cli-slash-commands.md` 入口

## Archive Notes

- 完成后记录：
  - 文档路径与索引入口
  - 命令统计摘要
  - 对 desktop `/` 输入框复用价值的结论
