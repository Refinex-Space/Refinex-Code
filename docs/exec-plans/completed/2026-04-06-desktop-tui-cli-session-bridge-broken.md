> ✅ Completed: 2026-04-07
> Summary: 修复桌面端 thread-tui 在 StrictMode 重挂载下的首帧丢失与空白主面板问题，并补齐会话 backlog 重放。
> Duration: 2 days
> Key learnings: 对需要保活的 PTY 会话，渲染层必须支持重挂载后的 backlog/attach 语义；否则 React StrictMode 或真实重连都会把启动首屏吞掉。

# desktop tui cli session bridge broken

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Severity**: TBD
- **Goal**: TBD
- **Impact**: TBD
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-06-desktop-tui-cli-session-bridge-broken.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Symptom and Context

- **Expected**: 桌面端线程切到 TUI 后，底部输入框发送的内容应写入当前线程绑定的真实 CLI 会话，主界面终端区持续显示与 `rcode`/`bun run dev` 一致的流式输出。
- **Observed**: 桌面端 TUI 区域虽然展示为终端，但输入仍沿用旧的单轮消息路径；在切换到 `node-pty` 真实会话桥接后，又因为 `node-pty` 的 `spawn-helper` 缺失执行位，PTY 创建直接失败，导致线程并未进入可交互的 CLI 会话。
- **Observed**: 桌面端 TUI 区域虽然展示为终端，但输入仍沿用旧的单轮消息路径；在切换到 `node-pty` 真实会话桥接后，又因为 `node-pty` 的 `spawn-helper` 缺失执行位，PTY 创建直接失败，导致线程并未进入可交互的 CLI 会话。进一步排查发现，普通 shell 终端虽然 PTY 已能收发数据，但渲染层焦点恢复不够稳定，`Cmd+T` 打开的终端面板可能无法立即接收键盘输入。
- **Observed**: 桌面端 TUI 区域虽然展示为终端，但输入仍沿用旧的单轮消息路径；在切换到 `node-pty` 真实会话桥接后，又因为 `node-pty` 的 `spawn-helper` 缺失执行位，PTY 创建直接失败，导致线程并未进入可交互的 CLI 会话。进一步排查发现，普通 shell 终端虽然 PTY 已能收发数据，但渲染层焦点恢复不够稳定，`Cmd+T` 打开的终端面板可能无法立即接收键盘输入。随后又定位到线程 TUI 面板被做成了“只读终端”，会把 xterm 对后端 PTY 的回写通道一起关闭，导致 CLI 虽然启动却可能停在空白态。
- **Observed**: 在 `React.StrictMode` 下，`TerminalPanel` 会先经历一次开发态探测挂载再正式挂载；而 `thread-tui` 同时使用 `persistOnUnmount` 保活 PTY。结果是第一次挂载已经消耗了 CLI 启动期的首屏输出与终端查询应答，第二次真正显示给用户的 xterm 复用的是一个“已启动但无 backlog 可回放”的会话，于是主面板表现为空白终端。
- **Impact**: 当前桌面端 TUI 不能承载真实线程会话，开发者在桌面端看到的只是普通消息发送或空白/异常终端输出，核心“专注模式”不可用。
- **Evidence**:
  - 用户复现：桌面端 TUI 模式下，底部输入框发送“你好”后，并不是在和运行中的 CLI 对话。
  - 代码证据：`apps/desktop/src/main/index.ts` 中 `terminal:write` 仍保留 `runThreadTuiTurn(...)` 单轮分支，没有把 `thread-tui` 的写入发送到 PTY。
  - 运行时证据：本地最小复现 `node-pty` 拉起 `/bin/echo` 时在修复前报 `posix_spawnp failed`；检查发现 `apps/desktop/node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper` 权限为 `0644`，补成 `0755` 后 PTY 可正常启动并输出。
  - 打包证据：`bun run desktop:dev` 启动时 Electron 主进程报 `Failed to load native module: pty.node`，调用栈落在 `out/main/index.js`，说明 `node-pty` 被错误 bundle 进主进程产物而非按原生依赖 external。
  - shell 验证：本地最小复现 `node-pty` 拉起 `/bin/zsh -i` 后，可成功写入 `echo __RW_OK__` 并收到回显，说明 shell PTY 桥接本身已可用，剩余问题集中在渲染层聚焦。
  - thread-tui 证据：`TerminalPanel` 之前仅在 `profile === "shell"` 时注册 `terminal.onData(...)`，并对 `thread-tui` 设置 `disableStdin: true`。这会连带切断 xterm 的终端响应回写能力，不仅是禁用用户键盘。
  - StrictMode 证据：渲染入口 `apps/desktop/src/renderer/src/main.tsx` 使用 `<StrictMode>` 包裹整棵应用；`WorkspaceHome` 中 `thread-tui` 面板使用 `persistOnUnmount`；`TerminalPanel` 在复用既有 PTY 会话时没有任何 backlog 重放能力。这三者叠加会让第一次探测挂载吃掉 thread-tui 的启动首屏，第二次正式挂载只看到空白终端。

## Optimized Bug Brief

- **Reproduction**:
  - 在桌面端打开任意线程，切到 TUI 模式。
  - 使用底部输入框发送消息，例如“你好”。
  - 观察主界面终端区域：消息没有进入持续存活的 CLI REPL，会话语义错误或 PTY 启动失败。
- **Likely surfaces**:
  - `apps/desktop/src/main/index.ts`
  - `apps/desktop/src/renderer/src/components/workspace/workspace-composer.tsx`
  - `apps/desktop/src/renderer/src/components/terminal/terminal-panel.tsx`
- **Hypotheses**:
  - 主进程 `thread-tui` 写入路径仍沿用历史的一次性消息执行逻辑。
  - `node-pty` 的 unix `spawn-helper` 在当前安装结果中缺失执行位，导致 PTY 启动失败。
- **Validation**:
  - `python3 scripts/check_harness.py`
  - `bun run --cwd apps/desktop typecheck`
  - `bun run --cwd apps/desktop test`
  - `bun run --cwd apps/desktop build`
  - 本地最小复现：`node-pty` 在补齐 `spawn-helper` 执行位后，可成功拉起 `/bin/echo hello`
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-06-desktop-tui-cli-session-bridge-broken.md
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

- `node-pty` 依赖原生 helper；若未来打包路径或依赖结构变化，helper 定位逻辑需要同步调整。
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | 桌面端线程 TUI 改为真实 PTY 会话桥接，不再接受 headless 单轮消息方案 | 用户目标是“桌面端主界面承载真实 CLI 会话”，不是一次性调用包装 |
| 2026-04-06 | 在主进程 PTY 启动前自动修复 `node-pty` `spawn-helper` 执行位 | 本地证据表明 `spawn-helper` 缺执行位会直接触发 `posix_spawnp failed`，导致 PTY 无法启动 |
| 2026-04-06 | 在 `electron-vite` 主进程构建中显式 external `node-pty`，并把它提升为 runtime dependency | `externalizeDepsPlugin()` 默认只处理 `dependencies`，不处理 `devDependencies`；否则 `pty.node` 会被打包链错误内联 |
| 2026-04-06 | 为 shell 终端增加挂载聚焦、延迟重聚焦与点击重聚焦 | shell PTY 已验证可收发数据，桌面端“无法输入”更符合渲染层焦点未稳定落到 xterm |
| 2026-04-06 | 为 thread-tui 保留 xterm 到 PTY 的输入回写通道，但不主动自动聚焦 | 线程 TUI 需要保留终端自身的响应/控制字节回写能力，不能把“禁用面板直输”实现成完全 `disableStdin` |
| 2026-04-07 | 为终端会话补充可重放 backlog，并在复用既有会话时回填历史输出 | 真实根因是 `StrictMode` 探测挂载提前消费了 thread-tui 的首屏输出；仅靠 PTY 桥接无法覆盖这类重挂载场景 |

## Validation Log

- `python3 scripts/check_harness.py` 通过。
- `bun run --cwd apps/desktop typecheck` 通过。
- `bun run --cwd apps/desktop test` 通过，9 个测试文件 / 49 个测试全部通过。
- `bun run --cwd apps/desktop build` 通过。
- 本地最小验证：`chmod 755 apps/desktop/node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper` 后，`node-pty` 可以成功拉起 `/bin/echo hello`，证明权限缺陷是 PTY 启动失败的直接原因。
- 冷启动验证：`bun run desktop:dev` 已通过此前的崩溃点，日志到达 `starting electron app...`，未再出现 `Failed to load native module: pty.node`。
- shell PTY 验证：`node-pty` 拉起 `/bin/zsh -i` 后，写入 `echo __RW_OK__` 可收到回显。
- 渲染层回归：新增终端测试后，`bun run --cwd apps/desktop test` 通过，现为 10 个测试文件 / 50 个测试全部通过。
- thread-tui 回归：新增测试确保 `thread-tui` 仍会注册 `onData -> writeTerminal` 回写链路，同时不会像 shell 一样自动聚焦；当前测试总数为 51。
- StrictMode 回归：新增测试覆盖 `persistOnUnmount` + 二次挂载复用既有 `thread-tui` 会话时的 backlog 回放，验证开发态探测挂载不会再吞掉主面板首屏。
- 最新验证：`bun run --cwd apps/desktop typecheck`、`bun run --cwd apps/desktop test -- terminal-panel`、`bun run --cwd apps/desktop test`、`bun run --cwd apps/desktop build` 均已通过；当前桌面端测试总数为 52。

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
