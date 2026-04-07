> ✅ Completed: 2026-04-07
> Summary: Hidden the embedded CLI prompt/footer chrome in desktop thread TUI sessions while preserving composer-driven PTY input.
> Duration: within the same working session
> Key learnings: Embedded TUI surfaces should hide prompt chrome via an explicit launch contract, but still keep the underlying input handler mounted for PTY-fed input.

# desktop tui hide cli footer chrome

## Metadata

- **Status**: ✅ Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-07
- **Goal**: Hide the embedded CLI prompt chrome at the bottom of desktop thread TUI sessions while preserving stdin handling from the desktop composer.
- **Scope**: Desktop thread-TUI launch env, CLI prompt rendering, and focused validation for the embedded TUI path.
- **Non-goals**: Changing the desktop composer UX, altering TUI message rendering above the footer, or changing normal standalone CLI behavior.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/completed/2026-04-07-desktop-tui-hide-cli-footer-chrome.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The desktop app embeds a full CLI REPL inside the thread TUI panel. That REPL currently renders its own bottom prompt border, visible input row, vim insert indicator, and status line. In desktop mode these are redundant because message input is already handled by the desktop composer, so the duplicated footer chrome wastes vertical space and looks incorrect.

## Optimized Task Brief

- **Outcome**: Desktop thread TUI sessions keep accepting input from the desktop composer, but do not visibly render the CLI prompt row or footer/status chrome.
- **Problem**: The embedded CLI shows duplicate bottom chrome such as the prompt row, `-- INSERT --`, and the status line, which should not appear inside the desktop thread panel.
- **Scope**: Add an explicit embedded-TUI env flag, gate prompt/footer rendering on that flag, and validate desktop thread TUI tests plus targeted type checking.
- **Non-goals**: Refactoring the broader REPL layout or changing how permissions, messages, or the desktop terminal transport work.
- **Constraints**:
  - Preserve stdin capture so the desktop composer can still submit text through the PTY.
  - Keep standalone CLI and non-thread desktop shells unchanged.
  - Prefer a narrow feature gate over broad layout heuristics.
- **Affected surfaces**:
  - `apps/desktop/src/main/thread-tui-env.ts`
  - `apps/desktop/src/main/thread-tui-env.test.ts`
  - `src/components/PromptInput/PromptInput.tsx`
  - `src/components/PromptInput/PromptInputFooter.tsx`
  - `src/components/PromptInput/utils.ts`
  - `src/components/PromptInput/utils.test.ts` or an equivalent focused test surface
- **Validation**:
  - Run focused desktop terminal/env tests.
  - Run targeted CLI prompt-related tests if available.
  - Run type checking for touched packages.
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-07-desktop-tui-hide-cli-footer-chrome.md
  - docs/PLANS.md
- **Open assumptions**:
  - The user wants to hide only the redundant footer chrome, not the actual transcript content above it.

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

- Hidden-input rendering must not break PTY-fed input submission for the desktop composer path.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-07 | Use an explicit env flag from the desktop thread-TUI launcher instead of inferring from layout size or terminal chrome. | The embedded mode is a product surface decision, so an explicit launch contract is easier to reason about and safer for normal CLI sessions. |
| 2026-04-07 | Keep the prompt input mounted but render it in a zero-height hidden container when prompt chrome is disabled. | The desktop composer still sends keystrokes into the PTY, so removing the input component entirely would break input capture. |

## Validation Log

- `python3 scripts/check_harness.py` -> pass
- Confirmed `apps/desktop/src/main/index.ts` launches thread TUI through a dedicated env override path.
- Confirmed the visible footer chrome comes from `src/components/PromptInput/PromptInput.tsx` and `src/components/PromptInput/PromptInputFooter.tsx`.
- `bun run test -- src/main/thread-tui-env.test.ts src/renderer/src/test/terminal-panel.test.tsx` -> pass (`7` tests)
- `bun test src/components/PromptInput/utils.test.ts` -> pass (`2` tests)
- `bun run typecheck` in `apps/desktop` -> pass
- `bunx tsc --noEmit` at repo root -> fail due existing repo-level configuration issues: missing `bun` type definitions and a `baseUrl` deprecation error in `tsconfig.json`; not caused by this feature change.

## Archive Notes

- Ready to archive. Summary: desktop thread TUI now hides the redundant CLI prompt/footer chrome while preserving hidden stdin capture for composer-driven input.
