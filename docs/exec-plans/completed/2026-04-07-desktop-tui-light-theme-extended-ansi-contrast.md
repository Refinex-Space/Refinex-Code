> ✅ Completed: 2026-04-07
> Summary: Improved light-theme embedded TUI file-reference contrast by adding a readable extended ANSI palette.
> Duration: TBD
> Key learnings: TBD

# desktop tui light theme extended ansi contrast

## Metadata

- **Status**: 🟡 Active
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Severity**: Low
- **Goal**: 提升亮色 embedded TUI 中文件路径/引用色的可读性
- **Impact**: 亮色主题下文件路径与引用行号颜色过浅，影响扫描与阅读效率
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-07-desktop-tui-light-theme-extended-ansi-contrast.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Symptom and Context

- **Expected**: 亮色 embedded TUI 中的文件路径和引用颜色应在白底上保持清晰可读
- **Observed**: 文件路径显示为浅紫色，接近默认 xterm 256 色高亮中的浅色蓝紫，亮色背景下对比不足
- **Impact**: 用户难以快速辨认文件名与引用位置
- **Evidence**:
  - 用户截图显示 `README.md:*` 这类引用在亮色主题下接近浅紫色
  - 先前 DOM 证据中同类引用颜色接近 `#afafff/#b1b9f9`
  - 当前 embedded 主题只覆盖前 16 个 ANSI 色，未覆盖 xterm `extendedAnsi`

## Optimized Bug Brief

- **Reproduction**:
  - 打开桌面端线程页 TUI
  - 在亮色主题下查看文件路径/引用色
- **Likely surfaces**:
  - `apps/desktop/src/renderer/src/components/terminal/terminal-panel.tsx`
  - `apps/desktop/src/renderer/src/test/terminal-panel.test.tsx`
- **Hypotheses**:
  - 文件颜色来自 xterm 256 色板高位索引，而不是当前已自定义的前 16 个 ANSI 变量
- **Validation**:
  - `npm run typecheck` in `apps/desktop`
  - `npm test -- --run src/renderer/src/test/terminal-panel.test.tsx src/renderer/src/test/shell.smoke.test.tsx`
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-desktop-tui-light-theme-extended-ansi-contrast.md
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

- 扩展色板覆盖会影响亮色 embedded TUI 中所有 256 色高位索引，因此需要控制在“只压暗过亮颜色”的范围内，避免把整套语义色洗成灰色
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | 不继续调前 16 个 ANSI 变量，转而为亮色 embedded 主题补 `extendedAnsi` | 文件引用颜色来自 xterm 256 色板高位索引，前 16 色对其无效 |
| 2026-04-07 | 对亮色 embedded 的扩展色板做“亮度上限收敛”，只压暗过亮颜色 | 这样能同时修复浅紫、浅蓝等一批白底不可读色，而不是赌一个单独色号 |
| 2026-04-07 | 用色号 147 的回归断言锁定已知浅紫从 `#afafff` 压暗到 `#7377b0` | 给这次修复提供可重复、可验证的护栏 |

## Validation Log

- `2026-04-07` 通过代码与 DOM 证据确认：亮色文件引用来自 xterm `extendedAnsi` 扩展色，而不是前 16 个 ANSI 变量
- `2026-04-07` 为亮色 embedded 主题新增 `extendedAnsi` 可读性收敛逻辑，并补充测试
- `2026-04-07` `npm run typecheck` (cwd `apps/desktop`) -> pass
- `2026-04-07` `npm test -- --run src/renderer/src/test/terminal-panel.test.tsx src/renderer/src/test/shell.smoke.test.tsx` (cwd `apps/desktop`) -> pass, 26 tests passed

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
