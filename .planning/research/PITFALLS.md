# Pitfalls Research

**Domain:** Claude Code hooks integration — plugin-to-hook conversion with web UI–managed hook installation
**Researched:** 2026-02-23
**Confidence:** HIGH (hooks system documented from official source; specific bug reports verified from anthropics/claude-code GitHub issues)

---

## Critical Pitfalls

### Pitfall 1: Corrupting settings.json During the "Apply" Write

**What goes wrong:**
The UI server's "Apply" button writes hook entries into `~/.claude/settings.json`. If that write is interrupted — process killed, disk full, concurrent Claude Code session touching the same file — the result is a partially written, invalid JSON file. Claude Code silently ignores a malformed `settings.json` even with `--debug` enabled (GitHub issue #2835). The user sees no hooks, no error, and no indication that a config file even exists. They have no way to distinguish "Apply failed" from "hooks not configured."

**Why it happens:**
The current codebase pattern is `writeFileSync(path, JSON.stringify(data, null, 2))` — a single synchronous overwrite. There is no read-merge-write cycle that handles concurrency, no atomic write (write to temp, rename), and no validation that the file is well-formed after writing. Multiple concurrent Claude Code processes are a known source of settings.json corruption (GitHub issue #15608).

**How to avoid:**
- Read the existing `settings.json` first, merge only the `hooks` key, then write back.
- Use an atomic write: write to a `.tmp` file, then `fs.renameSync()` to the target. Rename is atomic on the same filesystem.
- After writing, read the file back and `JSON.parse()` it to confirm it is valid before returning success to the UI.
- Show the user a clear success/failure state in the UI — never silently swallow write errors.

**Warning signs:**
- The UI returns success but Claude Code's `/hooks` menu shows "No hooks configured yet."
- Hooks were previously working but stopped after a second Apply operation.
- `cat ~/.claude/settings.json` reveals truncated or syntactically invalid JSON.

**Phase to address:** Hook installation phase (the "Apply" button implementation).

---

### Pitfall 2: Hooks Snapshot at Session Start — Changes Require Restart

**What goes wrong:**
Claude Code captures a snapshot of hook configuration at session startup and uses that snapshot for the entire session (GitHub issue #22679, documented behavior in hooks reference). If the UI's "Apply" writes new hooks while a Claude Code session is already running, those hooks do not fire in the current session. The user sees no response to the Apply, assumes something is broken, and may Apply repeatedly, potentially corrupting the file.

**Why it happens:**
This is an intentional security design: Claude Code prevents mid-session hook changes from taking effect without user review via the `/hooks` menu. But users applying hooks for the first time have no reason to know this.

**How to avoid:**
- Document prominently in the UI: "After clicking Apply, restart your Claude Code session for hooks to take effect."
- Display this as a confirmation message after successful write, not buried in a README.
- Consider adding a session-restart reminder as the final step of the Apply flow.

**Warning signs:**
- Sound effects do not play immediately after Apply, even though the settings.json looks correct.
- The `/hooks` UI in Claude Code shows "No hooks configured" despite valid file content. (Note: this may also indicate the unrelated bug in Pitfall 3 below.)

**Phase to address:** Hook installation phase; README/onboarding copy.

---

### Pitfall 3: Hook Event Name Mapping Has No Direct 1:1 Equivalents

**What goes wrong:**
The opencode plugin uses event types like `session.idle`, `permission.asked`, `permission.replied`, `message.updated`, `tui.command.execute`, and `tool.execute.before`/`tool.execute.after`. Claude Code hooks use completely different lifecycle names: `Stop`, `PermissionRequest`, `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Notification`. The semantic meaning does not always match exactly. For example:

- `session.idle` in opencode → nearest equivalent is the `Stop` hook in Claude Code, but `Stop` fires when Claude finishes responding, not when the session is genuinely idle between turns.
- `permission.asked` → `PermissionRequest` or `Notification` with matcher `permission_prompt`. They carry different payloads and have different decision control capabilities.
- `message.updated` with `role: "user"` → `UserPromptSubmit`. The deduplication logic using `lastMessageId` is irrelevant in hooks (each hook invocation is a fresh process).
- `tool.execute.before`/`after` → `PreToolUse`/`PostToolUse`. These are close equivalents but the JSON input schema is completely different.

Mapping events 1:1 without reading the hooks reference produces hooks that either never fire or fire on the wrong trigger.

**Why it happens:**
The conversion looks mechanical — "rename event type, adjust format" — but the two systems model the session lifecycle differently. opencode events are WebSocket push events; Claude Code hooks are shell commands invoked at lifecycle points. The conceptual model underneath is different.

**How to avoid:**
- Do not use opencode event names as a mapping guide. Start from the Claude Code hooks reference and map backwards.
- For each opencode trigger, verify the closest Claude Code hook event by reading what input the hook receives and when it fires, not just the name.
- The `Stop` hook is the closest equivalent to "session idle" but has important differences: it fires after each response, not after a configurable idle period. Treat this as a UX change, not a bug.
- The `Notification` hook with matcher `idle_prompt` is worth evaluating for the idle-state use case.

**Warning signs:**
- Hooks are configured but sounds only play at wrong moments (e.g., every response instead of only on idle).
- Some sounds never play at all despite correct file paths.
- The event name in the hook config still contains opencode-style names.

**Phase to address:** Event mapping design, before any hook script is written.

---

### Pitfall 4: Hook Scripts Receive JSON via stdin — Not Environment Variables or Arguments

**What goes wrong:**
The current index.js receives structured event data as JavaScript function arguments through the opencode plugin API. Claude Code hooks receive JSON on stdin. If the hook script (the shell command that plays sounds) tries to inspect `process.argv` or environment variables for event context instead of reading stdin, it gets nothing useful and either plays sounds unconditionally or fails silently.

More specifically: the hook command is a shell string. If the sound-playing script needs to know which tool fired (to play different sounds per tool), it must read the `tool_name` field from the stdin JSON. Shell scripts that don't read stdin at all will play sounds on every invocation, regardless of configuration.

**Why it happens:**
Plugin APIs pass structured arguments to handler functions. Hook systems pass structured context via stdin. The mental model shifts from "function call" to "subprocess with stdin pipe." Developers porting logic often forget this shift and write scripts that ignore stdin.

**How to avoid:**
- The hook script entry point must read all of stdin before doing anything: `const input = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'))` (or equivalent).
- Test hook scripts manually by piping sample JSON: `echo '{"hook_event_name":"PostToolUse","tool_name":"Write"}' | node play-sound.js`.
- For simple use cases (play a sound on any Stop event), stdin can be ignored and the command is just `afplay /path/to/sound.wav &`. Know which approach you're taking.

**Warning signs:**
- Hook plays sounds on every tool use regardless of configured trigger mapping.
- Hook never plays sounds even when the event fires (script erroring silently after reading stdin incorrectly).

**Phase to address:** Hook script implementation phase.

---

### Pitfall 5: afplay Must Be Backgrounded to Avoid Blocking the Hook

**What goes wrong:**
Claude Code waits for the hook command to exit before continuing. `afplay` plays a sound synchronously and does not return until the audio file finishes. A 2-second sound file means Claude Code pauses for 2 seconds on every tool use or stop event. At scale (many PreToolUse hooks), this accumulates into noticeable latency throughout the session.

The existing codebase uses `spawn(..., { detached: true })` + `child.unref()` specifically to avoid this. If the hook command is a simple shell string like `afplay /path/to/sound.wav` without backgrounding, that performance property is lost.

**Why it happens:**
When writing a shell hook command, `afplay sound.wav` is the obvious first attempt. The need to background it (`afplay sound.wav &`) is not immediately obvious unless you understand that hooks are synchronous by default.

**How to avoid:**
- Always append `&` to afplay invocations in hook commands: `afplay /path/to/sound.wav &`.
- Or use the hook's `async: true` field to run the entire hook in the background. Note: async hooks cannot block or return decisions — for sound-only hooks this is fine and preferable.
- The simplest correct command for PostToolUse: `{ "type": "command", "command": "afplay /absolute/path/to/sound.wav &" }`.

**Warning signs:**
- Claude Code noticeably pauses between tool calls.
- Claude Code feels sluggish after hooks are applied.
- Hook timeout errors appear in debug output.

**Phase to address:** Hook script implementation; hook configuration generation in the UI server.

---

### Pitfall 6: Absolute Paths Required — Repo-Relative Paths Break

**What goes wrong:**
The current codebase resolves sound file paths relative to `__dirname` using `resolve(__dirname, "sounds", filename)`. Hook commands are shell strings executed by Claude Code's process. Claude Code may be running from any working directory (the user's project root). A relative path like `./sounds/work-complete.wav` in a hook command resolves relative to wherever Claude Code was launched, not relative to the claude-peon repo.

The official hooks reference explicitly recommends using `$CLAUDE_PROJECT_DIR` for project-relative paths and absolute paths for everything else. Since claude-peon sounds live in the cloned repo (not in the user's project), the absolute path to the cloned repo must be embedded in the hook command at Apply time.

**Why it happens:**
Plugin APIs know where the plugin is installed and resolve paths internally. Hook commands are plain shell strings with no inherent knowledge of where a repo lives. The conversion requires baking in the absolute path at write time.

**How to avoid:**
- At Apply time (when the UI writes hooks to settings.json), compute the absolute path to the sounds directory from the running server's `__dirname` and embed it directly in the hook command string.
- The UI server already knows this: `const SOUNDS_DIR = resolve(ROOT, "sounds")`. Use this value when generating hook command strings.
- Do not use `~` tilde expansion in hook commands — it may not expand correctly in all shell contexts.

**Warning signs:**
- Sounds don't play after Apply. Running the hook command manually in the terminal with the same path fails with "No such file."
- Hooks work on the machine where Apply was run but not after copying settings.json to another machine.

**Phase to address:** Hook installation implementation (Apply button logic).

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| One hook command per event (no mapping logic in hook script) | Simpler — each hook just plays one hardcoded sound | No per-trigger sound variation; can't replicate the mapping system | Acceptable for v1 if mapping is simplified |
| Write hooks without reading existing settings.json first | Simpler write logic | Destroys existing user hook configurations on Apply | Never acceptable |
| Use `shell: true` or bash -c wrappers for complex commands | Easier string construction | Harder to debug, path quoting issues multiply | Acceptable if all paths are pre-quoted |
| Embed sound file path at Apply time with no validation | Simple | Hooks silently fail if user moves the repo | Acceptable for v1 with clear documentation |
| Fire sounds on every hook invocation without reading stdin | Simpler hook script | No per-tool or per-trigger customization | Only acceptable if trigger mapping is disabled |

---

## Integration Gotchas

Common mistakes when connecting to the Claude Code hooks system.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| settings.json write | Overwrite entire file | Read existing JSON, merge only `hooks` key, write back |
| settings.json write | Use `{ "hooks": [...] }` array format seen in some older examples | Use object format: `{ "hooks": { "PostToolUse": [...], "Stop": [...] } }` — the official schema (verified from docs) |
| Hook matcher | Match all tools with `"*"` | Omit matcher entirely to match all, or use regex. `"*"` is a valid regex matching a literal `*` (likely still works but semantically wrong) |
| Hook output | Print debug text to stdout | All non-JSON text on stdout may interfere with JSON decision parsing; use stderr for debug, stdout only for JSON |
| Notification hook | Use to detect idle state | `Notification` with matcher `idle_prompt` fires when Claude notifies the user it's idle — this is the closest hook to `session.idle` |

---

## Performance Traps

Patterns that affect response latency in a tool that runs on every session event.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous afplay in hook command | Claude pauses 1-3 seconds per sound | Background with `&` or use `async: true` | Immediately, on first hook fire |
| Hook script reads full transcript JSON | Hook takes 100ms+ for large sessions | Don't read the transcript unless necessary; the hook input on stdin has all needed context | Sessions with 50+ turns |
| Multiple overlapping sounds from rapid tool use | Audio pileup, unintelligible output | Use `async: true` on the hook (non-blocking); the existing spawn+detach+unref pattern already handles this in index.js and should be preserved in hook scripts | Rapid consecutive tool calls |

---

## Security Mistakes

Issues specific to writing to system configuration files from a web UI.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Writing hook commands containing user-supplied sound file paths without validation | Arbitrary shell command injection if path contains `;`, `&&`, `$(...)` | Validate that sound file paths contain only safe characters (alphanumeric, `/`, `.`, `-`, `_`); or use JSON array command format if supported |
| Path traversal in UI server sound file APIs (already documented in CONCERNS.md) | Read arbitrary files outside sounds directory | Apply `path.basename()` before joining; validate result starts with `SOUNDS_DIR` |
| No CORS restriction on UI server | Another local page could call the Apply endpoint | Bind to `127.0.0.1` only; add `Origin` header check on the Apply endpoint |
| Embedding hook commands in settings.json pointing to user's home directory | Hook paths break if run under a different user | Embed absolute paths; document this limitation clearly |

---

## UX Pitfalls

Common experience failures for first-time users of a clone-and-run project.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No feedback when Apply writes hooks (silent success) | User doesn't know it worked; may Apply multiple times | Show success message with path written and "restart Claude Code to activate" |
| README doesn't mention session restart requirement | Hooks applied but silent; user thinks it's broken | First paragraph of setup instructions must include "restart Claude Code after Apply" |
| UI refers to sounds by filename only, no preview | User can't tell which sound is which without listening | The existing "play" button in the UI already addresses this — keep it |
| No validation that afplay exists before Apply | Hooks written but will always fail silently on non-macOS | Check `process.platform === 'darwin'` in the UI server; show a warning banner on non-macOS |
| Hook commands use relative paths that break after repo is moved | All sounds stop playing after user moves the repo | Show the embedded absolute path in the UI after Apply so users are aware; document the move/re-apply requirement |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Apply button:** Writes hooks to settings.json — verify the existing `hooks` key is merged, not replaced, and that other settings.json content is preserved.
- [ ] **Hook commands:** Contain absolute paths — verify by reading back the written settings.json and confirming paths are absolute, not relative.
- [ ] **afplay backgrounded:** Confirm all generated hook commands end with `&` or the hook uses `async: true` — test by timing Claude Code response latency before and after Apply.
- [ ] **Session restart documented:** The UI's success message explicitly says to restart Claude Code — verify in the rendered UI, not just the template.
- [ ] **Event mapping verified:** Each configured trigger maps to a Claude Code hook event that actually fires for that scenario — test each one manually with `claude --debug`.
- [ ] **Non-macOS warning:** The UI shows a platform warning when `process.platform !== 'darwin'` — verify on a macOS machine by checking the condition is correct and the banner renders.
- [ ] **Rename complete:** No references to "openpeon", "opencode", or the old debug log path remain — search codebase for all three strings before marking done.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Corrupted settings.json | LOW | `cat ~/.claude/settings.json` to confirm corruption; delete the hooks key manually or restore from backup; re-run Apply |
| Hooks silently not firing | LOW | Run `claude --debug`, look for "Found 0 hook matchers"; check settings.json is valid JSON; restart session |
| Wrong event mapping (sounds play at wrong times) | MEDIUM | Map events from scratch using official docs, not opencode docs; update hook configuration in settings.json; restart session |
| Absolute path embedded at old repo location | LOW | Re-run Apply from the new repo location; the new paths overwrite the old ones |
| afplay blocking (synchronous) | LOW | Add `&` to the hook command in settings.json; no session restart needed if editing file directly (but hooks reload at next session) |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Corrupting settings.json on Apply | Hook installation implementation | Write a test: Apply hooks, then immediately Apply again; confirm settings.json is valid JSON and prior hooks are not duplicated |
| Hooks snapshot requiring restart | Hook installation UI + README | Manual test: Apply hooks mid-session, verify they don't fire; restart session, verify they do fire |
| Wrong event name mapping | Event mapping design (pre-implementation) | Map each opencode event to its Claude Code equivalent with explicit documentation before writing any hook script |
| stdin vs arguments confusion | Hook script implementation | Manual test: pipe sample JSON to the hook script and verify correct sound is selected |
| afplay blocking synchronously | Hook command generation (Apply logic) | Time tool-use round-trips before and after Apply; should be <100ms difference |
| Relative path breakage | Apply button implementation | Move repo to a temp directory, Apply, verify hooks still play |
| Malformed JSON silent failure | Apply implementation + post-write validation | Intentionally corrupt settings.json mid-write (simulate power loss); verify Apply detects and reports the error |

---

## Sources

- [Claude Code Hooks reference (official)](https://code.claude.com/docs/en/hooks) — HIGH confidence
- [GitHub issue #11544: Hooks not loading from settings.json](https://github.com/anthropics/claude-code/issues/11544) — HIGH confidence (confirmed regression, closed as completed)
- [GitHub issue #2835: Silent failure on malformed settings.json](https://github.com/anthropics/claude-code/issues/2835) — HIGH confidence
- [GitHub issue #15608: Config corruption with concurrent sessions](https://github.com/anthropics/claude-code/issues/15608) — HIGH confidence
- [GitHub issue #22679: Hook settings cached, changes require restart](https://github.com/anthropics/claude-code/issues/22679) — HIGH confidence
- [alexop.dev: How I added sound effects to Claude Code with hooks](https://alexop.dev/posts/how-i-added-sound-effects-to-claude-code-with-hooks/) — MEDIUM confidence (practitioner account)
- [github.com/ctoth/claudio: Hook-based audio plugin for Claude Code](https://github.com/ctoth/claudio) — MEDIUM confidence (comparable project, same domain)
- codebase/CONCERNS.md — HIGH confidence (direct audit of this codebase)
- .planning/PROJECT.md — HIGH confidence (project context)

---
*Pitfalls research for: Claude Code hooks integration — openpeon conversion*
*Researched: 2026-02-23*
