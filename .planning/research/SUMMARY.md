# Project Research Summary

**Project:** claude-peon
**Domain:** Claude Code hooks-based sound effects plugin (conversion from opencode plugin API)
**Researched:** 2026-02-23
**Confidence:** HIGH

## Executive Summary

Claude-peon is a developer tool that plays Warcraft/StarCraft-themed audio cues during Claude Code sessions. The product is being converted from the opencode plugin API — which required a long-lived plugin process — to Claude Code's hooks system, which invokes shell commands at lifecycle points. This is a significant architectural simplification: the result is stateless shell scripts invoked by Claude Code, a merged write into `~/.claude/settings.json`, and a Bun-served web UI for configuration. No new runtime dependencies are needed; the existing Bun + afplay + JSON config foundation carries over almost entirely.

The recommended approach is a clean conversion, not a retrofit. The old plugin factory (`index.js`) should be deleted and replaced with a single `play.js` dispatcher that reads hook event context from stdin, looks up the sound mapping in `claude-peon.json`, and spawns `afplay` asynchronously. The web UI's "Apply" button becomes the only integration point: it reads the user's `~/.claude/settings.json`, merges in the claude-peon hook entries, and writes back — preserving any other hooks the user has. The entire conversion can be done in a focused sequence: dispatcher first, config schema migration second, Apply endpoint third, UI button fourth, branding cleanup last.

The primary risks are all mechanical and well-understood. The most dangerous is corrupting `~/.claude/settings.json` during the Apply write: the mitigation is an atomic write (write to `.tmp`, then rename) plus a post-write validation read. The second risk is hooks silently not firing because Claude Code snapshots hook config at session start — mitigated entirely by surfacing a "restart Claude Code" message in the UI after Apply. All other pitfalls (wrong event names, synchronous afplay blocking, relative paths breaking) have clear prevention strategies documented in the research.

---

## Key Findings

### Recommended Stack

The stack is deliberately minimal. Claude Code hooks invoke shell commands at lifecycle points; no plugin runtime is needed. Hook scripts call `afplay` directly via `node play.js` (or `bash play.sh`). The Bun UI server, already in use, handles all configuration and writes the hook registration into `~/.claude/settings.json`. The `jq` CLI tool handles JSON parsing in shell scripts if needed.

See `.planning/research/STACK.md` for the full hooks API reference, settings.json format, and event-mapping table.

**Core technologies:**
- Bash/Node hook dispatcher (`play.js`): entry point for all Claude Code events — invoked as a shell command, reads stdin JSON, plays sound
- `afplay` (macOS built-in): audio playback — zero dependencies, already in use, supports `-v` volume flag
- `~/.claude/settings.json` (JSON file): hook registration — merged by the UI Apply button; must use `async: true` on all sound hooks
- Bun + `ui/server.js`: web UI runtime — unchanged; gains a new `/api/apply` endpoint that writes hooks into settings.json
- `jq` 1.6+ (optional): JSON parsing in shell scripts — brew install if needed; not required for a JS dispatcher

### Expected Features

No existing Claude Code sound plugin has a web configuration UI or game-themed sound packs. The competition is one-file shell scripts. Claude-peon's differentiator — web UI + game sounds + one-click Apply — is intact and does not require new features to deliver.

See `.planning/research/FEATURES.md` for the full competitor analysis and prioritization matrix.

**Must have (table stakes):**
- Sound on task completion (`Stop` hook) — core value proposition; know when Claude is done without watching the screen
- Sound on permission/idle notification (`Notification` hook, matcher: `permission_prompt|idle_prompt`) — "Claude needs you" alert
- Sound on session start (`SessionStart` hook) — confirms plugin is active
- Sound on user prompt submit (`UserPromptSubmit` hook) — acknowledge feedback loop
- Volume control persisted in config — essential for comfort; already exists with exponential curve
- Web UI "Apply" button writes hooks into `~/.claude/settings.json` — the clone-and-run promise; this is the core conversion deliverable
- Multiple presets (wc2, wc3, sc:bw, sc2) — personality and differentiation; already exist, just need trigger schema migration
- Clear README: macOS-only documented; "restart Claude Code after Apply" prominently stated

**Should have (competitive):**
- Sound on tool failure (`PostToolUseFailure` hook) — distinct error audio for long-running tasks; add when base hooks are stable
- Project-scoped vs global hook install option in Apply button — power user feature; add when global scope works
- Whisper mode surfaced per mapping in UI — already in codebase; expose in UI after base conversion

**Defer (v2+):**
- SubagentStop hook support — power-user feature; wait for demand
- SessionEnd hook — cosmetic; low impact
- Additional sound packs — only if users request

### Architecture Approach

The architecture shifts from a single long-lived plugin process (with in-memory state) to stateless, short-lived hook processes. Each Claude Code lifecycle event spawns `play.js` fresh; the script reads config from disk, selects a sound, fires `afplay` asynchronously, and exits. The web UI server is unchanged except for a new Apply endpoint that merges hook entries into `~/.claude/settings.json`. Sound selection logic, preset system, and config schema all carry over with only the trigger type names changed.

See `.planning/research/ARCHITECTURE.md` for data flow diagrams, component boundaries, and build order.

**Major components:**
1. `play.js` (hook dispatcher) — stateless entry point; reads stdin JSON, reads `claude-peon.json`, selects and plays sound; single file replacing all of `index.js`
2. `claude-peon.json` (config) — source of truth for volume, mappings, and preset; read by dispatcher on every invocation; written by UI server
3. `ui/server.js` Apply/Remove endpoints — reads `~/.claude/settings.json`, merges claude-peon hook entries, writes back atomically; new endpoints only, rest of server is unchanged
4. `~/.claude/settings.json` hook entries — declares which shell commands fire on which Claude Code events; written by Apply, read by Claude Code at session start
5. `ui/index.html` Apply button — front-end change only; calls Apply endpoint, shows confirmation with restart instruction

### Critical Pitfalls

1. **Corrupting settings.json on Apply** — use an atomic write (write to `.tmp`, then `fs.renameSync` to target); validate post-write by reading back and parsing; never silently swallow write errors. GitHub issue #2835 confirms Claude Code ignores malformed settings.json without any error output.

2. **Hooks snapshot at session start requires restart** — hooks written by Apply do not fire in the current session. Mitigate entirely with UI: show "Hooks installed. Restart Claude Code to activate." as the Apply confirmation message, not in the README.

3. **Wrong event name mapping** — opencode event names (`session.idle`, `permission.asked`, `tool.execute.after`) have no 1:1 equivalents in Claude Code hooks. Map from the Claude Code hooks reference backwards; do not use opencode names as a guide. Completed mapping is in STACK.md.

4. **afplay blocking without async** — omitting `async: true` causes Claude Code to wait for `afplay` to finish before continuing; a 2-second clip stalls the UI for 2 seconds per tool call. Set `async: true` on every sound hook, no exceptions.

5. **Relative paths breaking at runtime** — hook commands are shell strings executed from Claude Code's working directory, not the claude-peon repo. Embed the absolute path to the repo (from `__dirname` at Apply time) in every generated hook command. Never use `~` tilde expansion in hook commands.

---

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Hook Dispatcher and Event Mapping

**Rationale:** Everything else depends on a working `play.js` that correctly handles Claude Code's stdin payload and event vocabulary. This is the load-bearing piece with no upstream dependencies and can be tested in isolation by piping JSON directly (`echo '{"hook_event_name":"Stop"}' | node play.js`).

**Delivers:** A standalone `play.js` at repo root that reads stdin, reads `claude-peon.json`, and plays the configured sound for the given event.

**Addresses:** Sound on Stop, SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Notification (all P1 features from FEATURES.md).

**Avoids:** Pitfall 3 (wrong event names — mapping table is verified before any code is written), Pitfall 4 (stdin vs arguments — test with piped JSON from the start), Pitfall 5 (afplay blocking — use async spawn pattern from the existing codebase).

---

### Phase 2: Config Schema Migration

**Rationale:** The existing `claude-peon.json` config and all preset files use opencode trigger type names (`"tool.execute.after"`, `"session.idle"`). The dispatcher reads these at runtime; if the schema is not migrated in the same phase, the dispatcher and config will speak different vocabularies and all sounds will silently fail.

**Delivers:** Updated `claude-peon.json` default config and all `ui/presets/*.json` files with trigger types renamed to Claude Code hook event names (`PostToolUse`, `Stop`, `UserPromptSubmit`, `Notification`, `PreToolUse`, `SessionStart`).

**Uses:** Event mapping table from STACK.md.

**Implements:** Architecture component: config schema (Pattern 2 from ARCHITECTURE.md — event-to-trigger mapping via config).

---

### Phase 3: Apply/Remove Endpoints in UI Server

**Rationale:** Depends on a working dispatcher (Phase 1) so the endpoint can embed a tested absolute path in the generated hook commands. This is the most failure-prone phase — it touches `~/.claude/settings.json`, a system file owned by Claude Code, and must merge without clobbering.

**Delivers:** `POST /api/apply` endpoint that merges claude-peon hook entries into `~/.claude/settings.json` with atomic write and post-write validation. `POST /api/remove` endpoint that strips claude-peon entries cleanly.

**Uses:** Atomic write pattern (`writeFileSync` to `.tmp` then `renameSync`), absolute path embedding, `async: true` in generated hook commands.

**Avoids:** Pitfall 1 (settings.json corruption — atomic write + post-write parse), Pitfall 4 (relative paths — absolute path from `__dirname` embedded at write time), Pitfall 6 (merging not overwriting — read-merge-write cycle).

---

### Phase 4: UI Apply Button and UX Copy

**Rationale:** Front-end change only; depends on Apply/Remove endpoints existing. This is also where the session-restart pitfall is mitigated entirely at the UX layer.

**Delivers:** Apply button in `ui/index.html` that calls `/api/apply`, shows the path written, and displays "Restart Claude Code to activate." as the success confirmation. Platform warning banner when `process.platform !== 'darwin'`.

**Addresses:** UX pitfalls from PITFALLS.md: silent success, missing restart instruction, non-macOS users getting no feedback.

---

### Phase 5: Branding and Cleanup

**Rationale:** No architectural dependency; can be done last or in parallel with Phase 4. Keeping it separate prevents naming churn from interfering with the core conversion work.

**Delivers:** All references to "openpeon", "opencode", and the old plugin API removed. `package.json` updated to remove `@opencode-ai/plugin`. `index.js` deleted. README rewritten: clone → run UI → pick sounds → click Apply → restart Claude Code → done.

---

### Phase Ordering Rationale

- Dispatcher first because it has no dependencies and everything downstream (Apply endpoint path generation, config migration validation) depends on it working.
- Config migration in the same breath as dispatcher (Phase 2) because mismatched trigger vocabularies produce silent failures that are hard to debug.
- Apply endpoint third because it needs a tested dispatcher path to embed; rushing it before Phase 1 means the endpoint generates untested hook commands.
- UI button fourth because it is a thin wrapper over the endpoint; doing it after endpoint testing avoids UI changes to chase a moving API.
- Branding last because renaming files and strings during active development creates unnecessary churn.

### Research Flags

Phases with standard, well-documented patterns (skip additional research):
- **Phase 1 (dispatcher):** Hook stdin format and exit code contract are fully documented in official docs; sample patterns available in STACK.md.
- **Phase 2 (config migration):** Event mapping table is complete in STACK.md; mechanical rename, no unknowns.
- **Phase 4 (UI button):** Front-end change against an existing server; no novel patterns.
- **Phase 5 (branding):** Mechanical rename; no research needed.

Phases that may benefit from a quick verification pass during planning:
- **Phase 3 (Apply endpoint):** The merge-not-overwrite logic and atomic write pattern are well-understood, but the exact settings.json structure (how other tools write their hooks) is worth verifying against a real `~/.claude/settings.json` before writing the merge logic, to ensure the merge handles edge cases (missing `hooks` key, malformed file, unexpected nesting).

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All hook API details verified directly from official Claude Code docs at code.claude.com/docs; settings.json format confirmed from two independent official sources plus Anthropic blog |
| Features | HIGH | Claude Code hooks reference is authoritative on which events exist; competitor analysis covers all known Claude Code sound plugins (4 repos surveyed) |
| Architecture | HIGH | Architecture is constrained by Claude Code's hooks model — stateless shell commands are the only option; component boundaries follow directly from the API |
| Pitfalls | HIGH | 4 of 6 critical pitfalls traced to specific verified GitHub issues on the anthropics/claude-code repo; 2 are direct consequences of documented API behavior |

**Overall confidence:** HIGH

### Gaps to Address

- **Atomic write on macOS**: `fs.renameSync` is atomic on Linux (same filesystem); macOS APFS behavior for atomic rename should be spot-checked during Phase 3 implementation. If non-atomic, use a write-to-tmp + rename approach that handles APFS copy-on-write semantics.
- **settings.json concurrent write behavior**: GitHub issue #15608 flags concurrent write corruption from multiple Claude Code sessions. The Apply endpoint should warn users to close active sessions before applying, but the exact failure mode under concurrent writes has not been reproduced locally — validate during Phase 3 testing.
- **`UserPromptSubmit` hook timing**: The mapping from opencode's `message.updated` (role: user) to `UserPromptSubmit` is the weakest 1:1 mapping. If `UserPromptSubmit` fires earlier or later than expected in the session lifecycle, the acknowledge sound may feel off. Validate manually during Phase 1 testing before committing to the mapping.

---

## Sources

### Primary (HIGH confidence)
- [code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks) — hooks API reference: events, settings.json schema, stdin payload, exit codes, async semantics, matcher syntax
- [code.claude.com/docs/en/hooks-guide](https://code.claude.com/docs/en/hooks-guide) — hooks quickstart: practical examples, troubleshooting, notification hook patterns
- [github.com/anthropics/claude-code/issues/2835](https://github.com/anthropics/claude-code/issues/2835) — silent failure on malformed settings.json
- [github.com/anthropics/claude-code/issues/15608](https://github.com/anthropics/claude-code/issues/15608) — config corruption with concurrent sessions
- [github.com/anthropics/claude-code/issues/22679](https://github.com/anthropics/claude-code/issues/22679) — hook settings cached at session start, changes require restart
- [github.com/anthropics/claude-code/issues/11544](https://github.com/anthropics/claude-code/issues/11544) — hooks not loading from settings.json (regression, closed)
- Existing codebase: `index.js`, `ui/server.js` — source of truth for what currently exists and must be preserved or replaced

### Secondary (MEDIUM confidence)
- [claude.com/blog/how-to-configure-hooks](https://claude.com/blog/how-to-configure-hooks) — Anthropic blog post corroborating settings.json format
- [github.com/mohak34/opencode-notifier](https://github.com/mohak34/opencode-notifier) — competitor: permission/complete/error/question events, no UI
- [github.com/wyattjoh/claude-code-notification](https://github.com/wyattjoh/claude-code-notification) — competitor: Notification hook only, no UI
- [github.com/Dev-GOM/claude-code-marketplace](https://github.com/Dev-GOM/claude-code-marketplace) — competitor: 9 hook types, no UI
- [github.com/daveschumaker/homebrew-claude-sounds](https://github.com/daveschumaker/homebrew-claude-sounds) — competitor: random sounds, Notification hook only
- [github.com/ctoth/claudio](https://github.com/ctoth/claudio) — comparable hook-based audio plugin for Claude Code

### Tertiary (LOW confidence)
- [alexop.dev/posts/how-i-added-sound-effects-to-claude-code-with-hooks](https://alexop.dev/posts/how-i-added-sound-effects-to-claude-code-with-hooks/) — practitioner writeup, single author, corroborates hooks approach for sound

---
*Research completed: 2026-02-23*
*Ready for roadmap: yes*
