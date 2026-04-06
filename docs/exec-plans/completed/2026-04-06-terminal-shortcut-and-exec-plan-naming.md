> ✅ Completed: 2026-04-06
> Summary: 将终端快捷键改为 Cmd+T，并规范三份桌面端执行计划归档文件名。
> Duration: single turn
> Key learnings: Small shell-chrome adjustments often span runtime handlers, visible hints, and process docs at the same time; treating them as one repair keeps the UX and repo metadata aligned.

# 调整终端快捷键并规范执行计划命名

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-06
- **Severity**: Low
- **Goal**: Update the terminal shortcut to `Cmd+T`, align all shell affordances with that shortcut, and rename the recent completed exec plans to the repository's date-first convention before committing the desktop shell changes.
- **Impact**: The shell currently exposes inconsistent terminal shortcuts across keyboard handling and UI hints, and the recent plan filenames drift from the repository's date-first naming rule.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-06-terminal-shortcut-and-exec-plan-naming.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Symptom and Context

- **Expected**: Terminal toggling should consistently use `Cmd+T` across runtime behavior and visible shortcut labels, and completed exec plans should use `YYYY-MM-DD-description.md`.
- **Observed**: The app still binds terminal toggle to ``Cmd+` `` in code and tooltips, while three recent completed plans still use ad-hoc hash-prefixed filenames.
- **Impact**: Keyboard guidance is inconsistent, and plan artifacts drift from the repo's naming standard.
- **Evidence**:
  - `apps/desktop/src/renderer/src/hooks/use-keyboard-shortcuts.ts` still checks for the backtick key.
  - `apps/desktop/src/renderer/src/app/layout.tsx` and `apps/desktop/src/renderer/src/components/command/command-palette.tsx` still display the old terminal shortcut.
  - `docs/exec-plans/completed/feat-20260406-e02d368c.md`, `docs/exec-plans/completed/fix-20260406-4c4db50a.md`, and `docs/exec-plans/completed/fix-20260406-871bdf0b.md` do not follow the date-first convention.

## Optimized Bug Brief

- **Reproduction**:
  - Launch the desktop shell and inspect the terminal tooltip / command palette shortcut.
  - Press `Cmd+\`` and note that terminal toggling is still wired to the legacy shortcut.
  - List recent completed exec plans and observe the three hash-based filenames.
- **Likely surfaces**:
  - `apps/desktop/src/renderer/src/hooks/use-keyboard-shortcuts.ts`
  - `apps/desktop/src/renderer/src/app/layout.tsx`
  - `apps/desktop/src/renderer/src/components/command/command-palette.tsx`
  - `apps/desktop/src/renderer/src/test/shell.smoke.test.tsx`
  - `docs/exec-plans/completed/`
- **Hypotheses**:
  - The runtime and UI labels drifted because the shortcut is duplicated in multiple desktop-shell surfaces.
  - The plan filenames drifted because the archived files were kept with generated slugs instead of normalized names.
- **Validation**:
  - `bun run --cwd apps/desktop typecheck`
  - `bun run --cwd apps/desktop test`
  - `python3 scripts/check_harness.py`
- **Docs to sync**:
  - docs/exec-plans/completed/2026-04-06-terminal-shortcut-and-exec-plan-naming.md
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

- The terminal shortcut is surfaced in multiple desktop-shell affordances, so future changes should keep runtime handling, header tooltip, and command palette metadata in sync.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-06 | Rebind terminal toggle to `Cmd+T` and explicitly exclude `Shift`. | This preserves the existing `Cmd+Shift+T` theme shortcut while moving terminal toggle to the requested key. |
| 2026-04-06 | Normalize the three generated plan filenames to date-first names before commit. | Completed exec plans should be mechanically scannable and match the repository naming convention. |

## Validation Log

- Confirmed terminal shortcut handling, header tooltip text, and command palette metadata were still split across separate desktop-shell surfaces.
- Renamed the three recent completed plans to date-first filenames and updated their internal `Plan path` references.
- `bun run --cwd apps/desktop typecheck` -> pass
- `bun run --cwd apps/desktop test` -> pass (`3` files, `8` tests)
- `python3 scripts/check_harness.py` -> pass

## Archive Notes

- Ready to archive. This pass also prepares the desktop shell changeset for a single commit by aligning shortcut behavior and plan artifact naming.
