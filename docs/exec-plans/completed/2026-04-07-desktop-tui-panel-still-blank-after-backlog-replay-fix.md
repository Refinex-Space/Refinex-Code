> ✅ Completed: 2026-04-07
> Summary: 完成桌面端 TUI 空白面板修复、回归测试与类型验证
> Duration: same session
> Key learnings: thread-tui 的黑屏根因在运行时环境变量覆盖和渲染层导出兼容性，而不是 PTY 或 CLI 首帧本身。

# desktop tui panel still blank after backlog replay fix

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Severity**: High
- **Goal**: 让桌面端线程右侧主面板的 `TUI` 模式稳定显示与 CLI 相同的首屏、流式输出和输入回显
- **Impact**: 用户在桌面端进入 `TUI` 模式后只能看到空白黑色终端面板，无法观察欢迎界面、消息输出或发送回显
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-07-desktop-tui-panel-still-blank-after-backlog-replay-fix.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Symptom and Context

- **Expected**: 新建或切换到线程的 `TUI` 模式时，右侧主面板应像直接运行 `rcode` 一样显示欢迎界面、提示行、用户输入和 AI 响应
- **Observed**: 主面板标题栏和容器存在，但终端正文区域为空白；即使输入“你好”或新建会话，也看不到任何输出
- **Impact**: 桌面端的核心线程交互路径不可用，用户必须回退到外部终端才能使用 CLI
- **Evidence**:
  - 用户截图 `/Users/refinex/Library/Application Support/PixPin/Temp/PixPin_2026-04-07_00-24-21.png` 显示嵌入终端区域为纯黑空白
  - `node-pty` 直连 `./bin/rcode` 的对照实验能够收到完整欢迎界面 ANSI 输出，说明 PTY 和 CLI 首帧本身正常
  - Electron 主进程日志显示 `terminal:create` 与 `bin/rcode` 启动都成功，但带 `NODE_ENV=production` / `DEV=0` 的 thread-tui 子进程没有刷出欢迎界面字节流
  - 同一条 `node-pty -> ./bin/rcode` 链路在去掉这两个环境覆盖后立即恢复欢迎界面输出

## Optimized Bug Brief

- **Reproduction**:
  - 打开桌面应用
  - 选择任意工作区并新建线程
  - 切换到 `TUI` 模式
  - 观察右侧终端面板为空白，发送消息后仍无可见输出
- **Likely surfaces**:
  - `apps/desktop/src/renderer/src/components/terminal/terminal-panel.tsx`
  - `apps/desktop/src/renderer/src/test/terminal-panel.test.tsx`
- **Hypotheses**:
  - 已排除：PTY 创建、CLI 启动、REPL 首帧欢迎界面生成
  - 已确认：主进程为 thread-tui 强制覆盖 `NODE_ENV=production` / `DEV=0`，改变了 `rcode` 启动行为，导致首屏输出不再产生
  - 次级修复：桌面渲染层同时兼容 `@xterm/xterm` 的命名导出与 default 导出，避免 Vite / Node 形态差异再引入新黑屏
- **Validation**:
  - `npm test -- --run src/renderer/src/test/terminal-panel.test.tsx`
  - `npm run typecheck` in `apps/desktop`
  - `python3 scripts/check_harness.py`
- **Docs to sync**:
  - docs/exec-plans/completed/2026-04-07-desktop-tui-panel-still-blank-after-backlog-replay-fix.md
  - docs/PLANS.md

## Investigation and Repair Slices

### Slice 1 — Reproduce or bound the failure

- [x] Reproduce / collect evidence
- [x] Record findings

### Slice 2 — Isolate root cause

- [x] Isolate
- [x] Record findings

### Slice 3 — Repair, add regression protection, and verify

- [x] Repair
- [x] Regression protection
- [x] Validate

## Risks and Rollback

- 风险集中在桌面端终端面板的 `xterm` 初始化路径；修复仅调整运行时导入形态，不改变 IPC / PTY 协议
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | 不继续围绕 CLI `REPL` 首帧深挖，转而回到桌面渲染链路 | `node-pty -> ./bin/rcode` 对照实验已经能稳定拿到欢迎界面输出，CLI 并未卡死 |
| 2026-04-07 | 移除 thread-tui 对 `NODE_ENV` / `DEV` 的强制覆盖 | 这是唯一能稳定复现“有进程、无欢迎输出”差异的环境变量组合 |
| 2026-04-07 | 让 `TerminalPanel` 同时兼容 `@xterm/xterm` 的命名导出与 default 导出 | 当前包在 Node 与 Vite 预打包场景的导出形态不同，单押一种会引入前端初始化回归 |
| 2026-04-07 | 补一条“主进程输出必须写入 xterm”的回归测试 | 防止未来再次出现后端 PTY 正常、前端面板黑屏的假通状态 |

## Validation Log

- 2026-04-07: `npm test -- --run src/renderer/src/test/terminal-panel.test.tsx` 通过（4 tests）
- 2026-04-07: `npm test -- --run src/main/thread-tui-env.test.ts src/renderer/src/test/terminal-panel.test.tsx` 通过（5 tests）
- 2026-04-07: `npm run typecheck` in `apps/desktop` 通过
- 2026-04-07: `python3 scripts/check_harness.py` 通过
- 2026-04-07: 运行时验证 `node-pty -> ./bin/rcode` 在去掉 `NODE_ENV=production` / `DEV=0` 后恢复欢迎界面输出

## Archive Notes

- Archived to `docs/exec-plans/completed/2026-04-07-desktop-tui-panel-still-blank-after-backlog-replay-fix.md`
