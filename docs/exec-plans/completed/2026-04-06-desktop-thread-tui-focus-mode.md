> ✅ Completed: 2026-04-06
> Summary: Delivered per-thread TUI focus mode with GUI/TUI switch, CLI-backed embedded terminal, and composer-to-PTY routing.
> Duration: TBD
> Key learnings: TBD

# desktop thread tui focus mode

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Goal**: 在桌面端右侧主面板为每个线程接入可运行的 TUI 专注模式，并提供 GUI/TUI 模式切换入口
- **Scope**: 线程主区域交互模式切换、线程级终端会话绑定、主输入框写入线程 TUI、桌面端验证与计划同步
- **Non-goals**: GUI 聊天气泡与消息模型、终端尺寸回传完善、线程历史持久化协议
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-06-desktop-thread-tui-focus-mode.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

当前桌面端已经具备可复用的 PTY 桥接能力和 xterm 渲染能力，但它只作为底部工具终端存在，尚未与线程模型、主输入框、右侧主区域绑定。现状导致右侧面板没有正式的对话交互能力，主输入框也仍然停留在占位态。

## Optimized Task Brief

- **Outcome**: 右侧面板顶部提供 GUI/TUI 药丸切换；TUI 模式下线程主区域直接嵌入真实 CLI 终端；主输入框把消息写入当前线程对应的 CLI 会话
- **Problem**: 右侧面板缺少正式交互能力，已有底部终端与线程脱节，无法形成“线程即会话、输入框即终端输入”的专注模式
- **Scope**:
  - 为线程引入 GUI/TUI 模式状态
  - 在线程主区域嵌入 xterm，并与线程 id 绑定
  - 为线程 TUI 会话定义独立终端 profile，直接启动 CLI
  - 让主输入框在 TUI 模式下改为写入线程 PTY
- **Non-goals**:
  - GUI 图形消息流实现
  - 终端 resize 信号的完整传递
  - 线程消息结构化存储
- **Constraints**:
  - 保持 Harness 文档与计划同步
  - 不破坏现有底部 shell 工具终端
  - 线程之间必须通过独立 session id 做终端隔离
  - 复用现有 CLI，而不是复制一套渲染逻辑
- **Affected surfaces**:
  - apps/desktop/src/main/index.ts
  - apps/desktop/src/shared/contracts.ts
  - apps/desktop/src/renderer/src/stores/ui.ts
  - apps/desktop/src/renderer/src/components/terminal/terminal-panel.tsx
  - apps/desktop/src/renderer/src/components/workspace/workspace-home.tsx
  - apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx
  - apps/desktop/src/renderer/src/app/layout.tsx
  - apps/desktop/src/renderer/src/test/
- **Validation**:
  - `bun run desktop:typecheck`
  - `bun run desktop:test`
  - 桌面端 smoke tests 覆盖模式切换与输入桥接
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-06-desktop-thread-tui-focus-mode.md
  - docs/PLANS.md
- **Open assumptions**:
  - 当前阶段允许先以 CLI 原样嵌入为主，不额外构造 GUI 消息模型
  - 当前 PTY 桥接先保证启动和输入链路，后续再补终端尺寸同步

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

  - 线程 TUI 当前仍依赖现有 PTY 桥接，终端尺寸变化的信号传递尚未增强
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | 线程交互采用真实 CLI PTY 嵌入，而非自建消息 UI 仿真 | 这样可以直接复用 CLI 输出格式、权限提示和 ANSI 渲染，降低双端分叉风险 |
| 2026-04-06 | 线程 TUI 与底部 shell 使用不同 session id 命名空间 | 避免同一线程下 shell 和 CLI 终端互相复用同一 PTY |

## Validation Log

- `python3 scripts/check_harness.py` -> OK
- 已确认现有主进程存在 terminal IPC，渲染层存在 xterm TerminalPanel，可复用为线程 TUI 载体
- `bun run desktop:typecheck` -> OK
- `bun run desktop:test` -> OK（9 files, 49 tests）

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
