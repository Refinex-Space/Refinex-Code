> ✅ Completed: 2026-04-06
> Summary: desktop skills manager delivered and validated
> Duration: TBD
> Key learnings: TBD

# desktop skills manager

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: 在 desktop shell 中接入 skills 主视图，提供只读的 Skill 浏览与详情管理页，并保持 Electron dev/typecheck/test 可用
- **Scope**: desktop main/preload/renderer 的 skills snapshot、IPC、侧栏入口、skills 双栏视图、Markdown/文本预览、对应 node 与 renderer 测试
- **Non-goals**: 新增 Skill、搜索交互、bundled/MCP/managed/policy/legacy commands skills、复杂二进制预览
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/desktop-skills-manager.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

desktop shell 原本只有 workspace/settings 两种主视图。本次需求要求在左侧“新线程”下方新增“技能”入口，并在右侧提供 Skill 管理视图。

初版实现一度直接复用了仓库根 `src/*` 的 CLI skill 加载逻辑，导致 Electron dev/build 把 CLI alias、bun-only 模块和插件加载链路一起拉入桌面端：

- `bun run desktop:dev` 在 main build 阶段失败
- `bun run desktop:typecheck` 会被无关 CLI 依赖污染

因此需要将 desktop 的 skill snapshot builder 改为本地最小实现，只复刻文件型 skills 所需规则。

## Optimized Task Brief

- **Outcome**: TBD
- **Problem**: desktop 端缺少 Skills 入口与管理页，同时旧实现错误依赖 CLI 模块，导致 Electron 开发构建直接失败
- **Scope**:
  - skills 视图接入到 desktop shell
  - personal/project/plugin 三类 file-based skills 的只读 snapshot
  - `SKILL.md` metadata、Markdown/源码切换、普通文本预览
  - left sidebar 入口、skills 双栏 UI、基础 renderer/main 测试
- **Non-goals**:
  - Skill 创建、搜索、编辑
  - bundled/MCP/managed/policy/legacy commands 技能来源
  - 超大文件和二进制文件的深度预览
- **Constraints**:
  - 不允许 desktop main 继续 import 根仓库 `src/*` CLI 模块
  - 维持现有 desktop `SkillSnapshot` 契约，减少 renderer 返工
  - terminal 在 `skills` 视图下保持隐藏，维持阅读型主面板体验
- **Affected surfaces**:
  - `apps/desktop/src/main/*`
  - `apps/desktop/src/preload/index.ts`
  - `apps/desktop/src/shared/contracts.ts`
  - `apps/desktop/src/renderer/src/components/skills/*`
  - `apps/desktop/src/renderer/src/components/sidebar/workspace-sidebar.tsx`
  - `apps/desktop/src/renderer/src/app/layout.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
  - `apps/desktop/src/main/skills-snapshot.test.ts`
- **Validation**:
  - `bun run desktop:typecheck`
  - `bun run desktop:test`
  - `python3 scripts/check_harness.py`
  - 限时启动 `bun run desktop:dev`，确认 main/preload/renderer 能完成构建
- **Docs to sync**:
  - docs/exec-plans/active/desktop-skills-manager.md
  - docs/PLANS.md
- **Open assumptions**:
  - 无 active worktree 时仅展示 personal skills
  - plugin skills 仅覆盖 installed file-based plugin skills，不复刻 CLI 全量 plugin 解析链路

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

- desktop main 若继续依赖 CLI-only 模块，会再次把 Bun/alias/plugin loader 链路引入 Electron 构建
- plugin skills 当前仅覆盖 installed file-based 目录，不包含 bundled/MCP/policy 等其他来源
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | desktop skill snapshot builder 改为本地最小实现，不再复用根 CLI `src/*` | Electron dev/typecheck 已被 CLI alias 与 bun-only 依赖阻塞，必须切断依赖链 |
| 2026-04-06 | plugin skills 仅扫描 installed file-based plugin skills | 满足本期展示目标，同时避免引入完整 plugin loader 复杂度 |
| 2026-04-06 | 文件预览仅支持 Markdown/文本，超大与非文本文件降级为占位 | 首版以稳定展示为主，避免二进制解析风险 |
| 2026-04-06 | skills 页主布局改为单容器分栏，并在左列启用即时搜索 | 对齐视觉稿，消除中间间距，降低 skill 行交互割裂感，并补齐检索能力 |
| 2026-04-06 | skill 管理页的替换/下载/卸载统一走 Electron main IPC 与系统 zip/unzip | renderer 保持无文件系统权限，替换与卸载后可直接回刷 snapshot，且不引入额外压缩依赖 |
| 2026-04-06 | `+` 菜单的上传能力仅写入 personal skills，并在同名时覆盖原有 personal root | 避免误写 project/plugin skills，同时防止 `~/.agents/skills` 与 `~/.claude/skills` 产生重复同名 Skill |
| 2026-04-06 | `浏览 Skills` 采用 GitHub 实时拉取 + main 内存短缓存，而非预下载仓库存档 | 上游仓库会持续演进，实时拉取可保持目录新鲜度；缓存可避免频繁重复请求，同时不把第三方 skills 快照固化进本仓库 |
| 2026-04-06 | GitHub 远程 skills catalog 增加可选 `GITHUB_TOKEN`，并将文件内容读取切到 raw 内容地址 | 降低 REST API 403 限流概率，把 API 压力收敛到 tree 列表请求，同时对限流场景提供明确错误提示 |

## Validation Log

- 2026-04-06: `bun run desktop:typecheck` ✅
- 2026-04-06: `bun run desktop:test` ✅
- 2026-04-06: `python3 scripts/check_harness.py` ✅
- 2026-04-06: 限时启动 `bun run desktop:dev`，main/preload/renderer 完成构建，未再出现 `src/bootstrap/state.js` 解析失败 ✅
- 2026-04-06: skills 视图 refinement：单容器竖向分隔、skill 行右侧箭头、搜索过滤交互与 renderer 回归测试 ✅
- 2026-04-06: skill 详情头部新增 `...` 菜单，覆盖发起对话占位、替换 zip、下载 zip、卸载确认，以及 main/renderer 回归测试 ✅
- 2026-04-06: `+` 菜单新增浏览/创建子菜单与上传 zip 技能链路；`bun run desktop:typecheck`、`bun run desktop:test`、`python3 scripts/check_harness.py` 全部通过 ✅
- 2026-04-06: `浏览 Skills` 弹窗接入 Anthropic GitHub skills catalog，支持 frontmatter 元数据展示与一键在线安装；`bun run desktop:typecheck`、`bun run desktop:test`、`python3 scripts/check_harness.py` 全部通过 ✅
- 2026-04-06: GitHub 403 限流优化完成：支持 `GITHUB_TOKEN`、raw 内容拉取与明确限流提示；`bun run desktop:typecheck`、`bun run desktop:test`、`python3 scripts/check_harness.py` 全部通过 ✅

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
