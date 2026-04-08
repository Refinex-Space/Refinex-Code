> ✅ Completed: 2026-04-08
> Summary: Completed the desktop GUI conversation MVP, removed temporary troubleshooting logs, and verified the GUI/CLI path end-to-end.
> Duration: 1 day
> Key learnings: A broken non-interactive import chain can present as a GUI hang even when renderer and IPC are healthy.; Targeted phase logs at the CLI boundary are enough to separate spawn issues from module-load issues.

# Desktop GUI Conversation MVP

## Metadata

- **Status**: 🟢 Completed
- **Owner**: Codex / Claude Agent
- **Created**: 2026-04-08
- **Goal**: Enable the desktop GUI workspace mode to send a plain-text user message, receive an AI response through the repository's real provider runtime, and render the conversation inside the GUI thread surface.
- **Scope**: Add a desktop conversation bridge in main/preload, session-scoped GUI conversation state and persistence, GUI message rendering, and composer send integration for GUI mode using existing provider settings. Keep the implementation tool-light and text-only for the first release.
- **Non-goals**: Do not implement tool result rendering, slash command rich execution previews, markdown/code block formatting, attachments, or streaming-rich partial token UI beyond the minimum needed to show progress and final text.
- **Rollback**: Git revert or restore the modified files
- **Roadmap entry**: `docs/PLANS.md`
- **Plan path**: `docs/exec-plans/active/2026-04-08-desktop-gui-conversation-mvp.md`

## Harness Preflight

- **Repo check**: available and passing
- **Harness surfaces**:
  - scripts/check_harness.py
  - docs/generated/harness-manifest.md
  - docs/OBSERVABILITY.md
  - docs/exec-plans/tech-debt-tracker.md

## Background

The desktop GUI composer currently only forwards prompts into the embedded TUI terminal and the GUI thread surface is still an empty placeholder, so desktop users cannot have a native in-app conversation flow.

## Optimized Task Brief

- **Outcome**: Enable the desktop GUI workspace mode to send a plain-text user message, receive an AI response through the repository's real provider runtime, and render the conversation inside the GUI thread surface.
- **Problem**: The desktop GUI composer currently only forwards prompts into the embedded TUI terminal and the GUI thread surface is still an empty placeholder, so desktop users cannot have a native in-app conversation flow.
- **Scope**: Add a desktop conversation bridge in main/preload, session-scoped GUI conversation state and persistence, GUI message rendering, and composer send integration for GUI mode using existing provider settings. Keep the implementation tool-light and text-only for the first release.
- **Non-goals**: Do not implement tool result rendering, slash command rich execution previews, markdown/code block formatting, attachments, or streaming-rich partial token UI beyond the minimum needed to show progress and final text.
- **Constraints**:
  - Reuse the repository's existing provider/runtime stack instead of terminal output scraping or introducing a second AI SDK abstraction.
  - Do not commit secrets or widen provider credential exposure beyond the existing desktop provider settings bridge.
  - Desktop GUI mode must stay isolated from TUI terminal session plumbing so later feature work can evolve independently.
- **Affected surfaces**:
  - apps/desktop/src/shared/contracts.ts
  - apps/desktop/src/preload/index.ts
  - apps/desktop/src/main/index.ts
  - apps/desktop/src/renderer/src/components/workspace/*
  - apps/desktop/src/renderer/src/stores/*
  - apps/desktop/src/main/* conversation runtime support
- **Validation**:
  - bun run desktop:typecheck
  - bun run desktop:test
  - Targeted manual GUI smoke path in desktop dev build: create/select session -> switch to GUI -> send prompt -> response appears
- **Docs to sync**:
  - docs/exec-plans/active/2026-04-08-desktop-gui-conversation-mvp.md
  - docs/PLANS.md
  - docs/OBSERVABILITY.md
- **Open assumptions**:
  - The first MVP can ship without rich markdown/tool rendering as long as plain-text request/response is correct and persisted per desktop session.

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

- Importing the full runtime query stack into the Electron main process may require careful environment/setup shims to avoid boot-time regressions.
- If the shared runtime emits provider/tool side effects by default, GUI mode must deliberately constrain its execution policy for this MVP.
- Git revert or restore the modified files

## Decision Log

| Date | Decision | Why |
| ---- | -------- | --- |
| 2026-04-08 | GUI conversation requests run through the repository CLI in headless `--print --output-format json` mode instead of PTY/TUI scraping. | This reuses the real provider runtime without coupling the GUI surface to terminal output protocols. |
| 2026-04-08 | The desktop main process stores a GUI-specific transcript per session and reuses an internal CLI session id for `--resume`. | Renderer only needs plain user/assistant text state, while CLI resume keeps model context continuous across messages. |
| 2026-04-08 | MVP disables tool execution via `--tools \"\"` and only renders plain text request/response. | This constrains scope to correctness of send/receive/persist/render before tool cards and rich parsing are introduced. |
| 2026-04-08 | Renderer smoke coverage now validates both backends: TUI writes to terminal; GUI calls the conversation bridge and renders returned text. | This protects the new mode split from regressing silently during future desktop UI work. |
| 2026-04-08 | GUI headless child processes must not inherit the desktop dev environment; force `NODE_ENV=production` and drop `DEV` when spawning the CLI. | Electron dev mode leaked Ink dev-only behavior into the headless CLI path, producing misleading stderr and delaying diagnosis of GUI hangs. |
| 2026-04-08 | The GUI hang root cause was a broken non-interactive CLI import chain, not renderer/preload/main IPC. | `src/utils/filePersistence/filePersistence.ts` imported constants/types that were no longer exported from `src/utils/filePersistence/types.ts`, which blocked `await import('src/cli/print.js')` before `runHeadless()` could start. |

## Validation Log

- `2026-04-08`: `python3 scripts/check_harness.py` -> pass (`OK: True`)
- `2026-04-08`: `bun run desktop:typecheck` -> pass
- `2026-04-08`: `bun run desktop:test` -> pass (`12` files, `66` tests)
- `2026-04-08`: Added renderer smoke coverage for GUI/TUI mode routing and global jsdom `scrollIntoView` mock required by the new conversation surface.
- `2026-04-08`: Added GUI conversation debug instrumentation across renderer send/load, main IPC, and CLI child process lifecycle to diagnose hangs in the desktop GUI path.
- `2026-04-08`: Debug logs confirmed `ipc -> spawn` was healthy and the GUI child inherited desktop dev environment (`Ink` devtools warning on stderr). The runner now sanitizes child env and optionally adds CLI debug-to-stderr when GUI debug is enabled.
- `2026-04-08`: Focused CLI repro (`./bin/rcode -p --bare --output-format json --max-turns 1 --tools "" ...`) now returns a successful JSON result in about `5s` after restoring the missing `filePersistence` exports that had blocked `print.js` import.
- `2026-04-08`: User-confirmed desktop GUI smoke path passed after the import-chain fix; the temporary troubleshooting logs were then removed while preserving the working GUI conversation flow.

## Archive Notes

- Add completion date, summary, duration, and key learnings before archiving
