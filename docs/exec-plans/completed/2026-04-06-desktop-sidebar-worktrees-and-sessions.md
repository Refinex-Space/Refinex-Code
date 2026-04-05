> ✅ Completed: 2026-04-06
> Summary: Implemented a persistent WorkTree and multi-session sidebar for RWork, moved state ownership into Electron app data storage, redesigned the sidebar UI around worktree/session hierarchy, and verified typecheck, tests, build, and dev startup.
> Duration: 2026-04-06 single session
> Key learnings: For multi-project desktop tooling, app data storage is a better state boundary than repo-local files or renderer localStorage.; Using git root as the canonical WorkTree identity prevents duplicate sidebar entries when users open subdirectories of the same repo.; A worktree spine with nested session strips reads better for dense tool UI than a card stack.

# 桌面端侧边栏 WorkTree 与线程持久化

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: 为 RWork 桌面端设计并实现支持多项目 WorkTree 与多线程的左侧边栏，并把项目/线程状态持久化到适合 Electron 桌面应用的本地存储位置。
- **Scope**: 设计 WorkTree/Session 数据模型与本地存储位置；实现 Electron 主进程文件存储；实现多项目、多线程侧边栏 UI 与交互；接入创建/切换/删除项目与线程；同步必要文档与验证。
- **Non-goals**: 不实现聊天内容协议、不实现完整会话消息持久化、不引入数据库或发布打包链、不照搬 Omni 的 Rust/Tauri 设计。
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-06-desktop-sidebar-worktrees-and-sessions.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

当前桌面端侧栏只有内存级 workspace rail，既不能承载一个项目下多个线程，也没有稳定的本地状态落盘方案，无法支撑实际桌面工作流。

## Optimized Task Brief

- **Outcome**: 为 RWork 桌面端设计并实现支持多项目 WorkTree 与多线程的左侧边栏，并把项目/线程状态持久化到适合 Electron 桌面应用的本地存储位置。
- **Problem**: 当前桌面端侧栏只有内存级 workspace rail，既不能承载一个项目下多个线程，也没有稳定的本地状态落盘方案，无法支撑实际桌面工作流。
- **Scope**: 设计 WorkTree/Session 数据模型与本地存储位置；实现 Electron 主进程文件存储；实现多项目、多线程侧边栏 UI 与交互；接入创建/切换/删除项目与线程；同步必要文档与验证。
- **Non-goals**: 不实现聊天内容协议、不实现完整会话消息持久化、不引入数据库或发布打包链、不照搬 Omni 的 Rust/Tauri 设计。
- **Constraints**:
  - exec-plan 文件名必须带日期前缀。
  - 存储设计不能污染用户打开的项目目录，应基于桌面应用本地数据目录。
  - 前端设计遵循 frontend-skill：高密度、少卡片、强层级、克制动效。
  - 实现应基于当前 Electron + TypeScript 架构，而不是依赖 Rust/Tauri 或浏览器 localStorage 作为主存储。
- **Affected surfaces**:
  - apps/desktop/src/main/index.ts 与 shared contracts
  - apps/desktop/src/renderer 侧边栏、主布局、stores、hooks、tests
  - apps/desktop/README.md 与 docs/exec-plans
- **Validation**:
  - 桌面端 typecheck/test/build 通过
  - 开发启动可完成 Electron main/preload/renderer 构建
  - 多项目与多线程状态可跨重启持久化到本地文件
- **Docs to sync**:
  - docs/exec-plans/completed/2026-04-06-desktop-sidebar-worktrees-and-sessions.md
  - docs/PLANS.md
  - apps/desktop/README.md
- **Open assumptions**:
  - TBD

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

  - 如果状态模型放在 renderer store 而不是主进程文件系统，会继续受进程刷新影响。
  - 若 UI 直接照搬 Omni，会带入不适合当前最小产品阶段的信息密度和状态耦合。
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | WorkTree 与线程元数据统一落在 `app.getPath('userData')/sidebar-state`，而不是 localStorage 或项目目录 | Electron 桌面应用拥有稳定的本地应用数据目录；状态不应污染任意用户仓库 |
| 2026-04-06 | 按 `index.json -> worktrees/<id>/worktree.json -> sessions/<id>.json` 组织文件 | 先满足当前轻量元数据持久化，同时给后续 transcript、artifact、config 预留扩展层级 |
| 2026-04-06 | Git 仓库项目以 git root 作为 WorkTree 身份，而不是用户选择的任意子目录 | 当前产品本质是代码工作台，WorkTree 应绑定真实 repo/worktree 根，避免同仓库子目录重复出现 |
| 2026-04-06 | 侧栏采用 WorkTree spine + session strip，而不是沿用早期卡片式 workspace rail | 更符合 frontend-skill 的高密度工具界面方向，也更接近真实多线程工作流 |
| 2026-04-06 | 终端 session 绑定到 active session id，cwd 绑定到 active worktree path | 同一项目下不同线程需要独立终端上下文，但共享工作树根目录 |

## Validation Log

- `python3 scripts/check_harness.py` -> OK: True
- `bun run desktop:typecheck` -> 通过
- `bun run desktop:test` -> 通过，包含 renderer smoke test 与 `src/main/worktree-state-store.test.ts` 持久化单测
- `bun run desktop:build` -> 通过
- `bun run desktop:dev` -> 30s 内完成 main/preload/renderer 构建并打印 `starting electron app...`
- `apps/desktop/src/main/worktree-state-store.test.ts` -> 验证 WorkTree/Session 元数据跨 store 实例重载后仍可恢复

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
