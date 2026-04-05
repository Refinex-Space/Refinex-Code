> ✅ Completed: 2026-04-06
> Summary: Fixed the desktop blank-screen regression by resolving the BrowserWindow preload entry against the actual electron-vite output, eliminating the missing preload and undefined desktopApp crash.
> Duration: 2026-04-06 single session
> Key learnings: The renderer blank screen was a preload bootstrap failure, not a sidebar rendering failure.; electron-vite currently emits preload as index.mjs, so BrowserWindow should resolve the real entry instead of assuming index.js.; A small fallback resolver is enough regression protection for preload output format drift.

# 桌面端 preload 路径导致空白页

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Severity**: high
- **Goal**: 修复桌面端启动后空白页问题，使 preload 正常注入 desktopApp bridge，侧栏和主界面恢复渲染。
- **Impact**: 当前桌面应用窗口启动后呈现空白，核心界面无法使用。
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-06-desktop-preload-path-blank-screen.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Symptom and Context

- **Expected**: Electron 能成功加载 preload，window.desktopApp 可用，RWork 主界面与侧栏正常渲染。
- **Observed**: Electron 尝试加载不存在的 out/preload/index.js，随后 renderer 中 window.desktopApp 为 undefined，Layout 在 useDesktopShell 中崩溃。
- **Impact**: 当前桌面应用窗口启动后呈现空白，核心界面无法使用。
- **Evidence**:
  - 控制台报错：Unable to load preload script: .../out/preload/index.js
  - 实际构建产物目录为 apps/desktop/out/preload/index.mjs
  - renderer 报错：Cannot read properties of undefined (reading 'getAppInfo')

## Optimized Bug Brief

- **Reproduction**:
  - 运行 bun run desktop:dev
  - 观察 Electron 窗口为空白，控制台出现 preload 加载失败与 getAppInfo undefined 报错
- **Likely surfaces**:
  - apps/desktop/src/main/index.ts
  - 桌面端 Electron 启动路径与 preload bridge
- **Hypotheses**:
  - BrowserWindow preload 路径硬编码为 index.js，而 electron-vite 当前输出为 index.mjs
- **Validation**:
  - preload 脚本能被 Electron 成功加载
  - window.desktopApp 注入后界面不再空白
  - 桌面端 typecheck/test/build 通过
- **Docs to sync**:
  - docs/exec-plans/completed/2026-04-06-desktop-preload-path-blank-screen.md
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

  - 如果后续 Electron 输出格式再次变化，硬编码扩展名可能再次失效。
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | 仅修复 BrowserWindow preload 入口解析，不修改侧栏实现本身 | 控制台证据已经表明空白页根因是 preload 未加载，而不是侧栏数据链本身 |
| 2026-04-06 | preload 路径改为优先解析 `index.mjs`，并保留 `index.js` 回退 | 当前 electron-vite 输出为 `index.mjs`，同时保留对未来或旧输出格式的兼容 |

## Validation Log

- `ELECTRON_ENABLE_LOGGING=1 timeout 20s bun run --cwd apps/desktop dev` -> 复现 `Unable to load preload script: .../out/preload/index.js`
- `ls apps/desktop/out/preload` -> 仅存在 `index.mjs`
- 修复后再次运行 `ELECTRON_ENABLE_LOGGING=1 timeout 20s bun run --cwd apps/desktop dev` -> 不再出现 preload 加载失败，也不再出现 `getAppInfo` undefined 报错
- `bun run desktop:typecheck` -> 通过
- `bun run desktop:test` -> 通过
- `bun run desktop:build` -> 通过

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
