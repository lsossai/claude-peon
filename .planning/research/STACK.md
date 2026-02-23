# Stack Research

**Domain:** Claude Code hooks-based shell integration (sound effects plugin)
**Researched:** 2026-02-23
**Confidence:** HIGH — all findings verified directly against official Claude Code documentation at code.claude.com/docs

---

## Summary

The conversion from the opencode plugin API to Claude Code hooks requires replacing a JavaScript plugin runtime with shell scripts invoked by Claude Code's hooks system. The resulting stack is dramatically simpler: no plugin framework, no Node/Bun runtime for the core sound-firing path, just shell scripts that read JSON from stdin and call `afplay`. The UI server (Bun + HTTP) is unchanged. The only new technical obligation is writing valid JSON into `~/.claude/settings.json` (or `.claude/settings.json`).

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Bash (shell script) | Any POSIX sh | Hook handler — receives event JSON, calls afplay | Claude Code hooks invoke shell commands directly. No runtime needed. The simplest possible sound-playing hook is `afplay -v 0.5 /path/to/sound.wav` with zero dependencies. |
| `jq` | 1.6+ | Parse stdin JSON in hook scripts | Hooks receive full event context as JSON on stdin. `jq` is the standard tool for extracting fields in shell scripts; used in all official Claude Code examples. Install: `brew install jq`. |
| `afplay` | macOS built-in | Audio playback | macOS system binary at `/usr/bin/afplay`. No installation. Supports `-v <float>` volume flag. Already used in the existing codebase. |
| JSON (settings.json) | — | Hook registration | Claude Code reads hook config from `~/.claude/settings.json` or `.claude/settings.json`. The UI server's "Apply" button must write this file. No schema validation tool needed — plain JSON. |
| Bun | 1.x | UI server runtime | Already in use. Handles config UI HTTP server (`bun run ui`), config file writes, and settings.json patching. Keep as-is. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `fs` module | Built-in | Read/write `openpeon.json` and `~/.claude/settings.json` | Already used in `ui/server.js`. The "Apply" button will call a new endpoint that patches settings.json. |
| Node.js `os.homedir()` | Built-in | Resolve `~/.claude/settings.json` path | Used in existing deploy logic; same pattern applies for Claude Code settings path. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `/hooks` menu in Claude Code | Interactive hook verification | Type `/hooks` in Claude Code CLI to inspect registered hooks, verify they appear, and test they fire. Mandatory during development — do not rely on file edits alone. |
| `claude --debug` | Hook execution tracing | Prints which hooks matched, exit codes, and stdout/stderr for each hook invocation. Use during development to verify the sound script is being called. |
| `Ctrl+O` (verbose mode) | In-session hook output | Toggles hook output visibility in the Claude Code transcript without restarting. |
| `chmod +x` | Make hook scripts executable | Hook scripts must be executable or Claude Code cannot run them. This is a common failure mode. |

---

## Claude Code Hooks API

This section is the primary reference for the conversion. All details verified against official docs.

### Hook Location Options

| File | Scope | Notes |
|------|-------|-------|
| `~/.claude/settings.json` | All projects, all sessions | Correct target for user-installed sound hooks. The "Apply" button should write here. |
| `.claude/settings.json` | Single project only | Can be committed to repo; useful for project-scoped hooks but wrong for a personal sound plugin. |
| `.claude/settings.local.json` | Single project, not committed | Personal overrides; gitignored by default. |

**Decision for claude-peon:** Write hooks into `~/.claude/settings.json`. This is the user-global settings file that applies to every Claude Code session. The "Apply" button in the UI should merge hook entries into this file (not overwrite it wholesale — other hooks may already be present).

### settings.json Format

The hooks object is nested inside the top-level settings JSON:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash|Edit|Write|Read|Glob|Grep|Task|WebFetch|WebSearch",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/claude-peon/hooks/play-sound.sh tool_after",
            "async": true,
            "timeout": 10
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/claude-peon/hooks/play-sound.sh work_complete",
            "async": true,
            "timeout": 10
          }
        ]
      }
    ],
    "Notification": [
      {
        "matcher": "permission_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/claude-peon/hooks/play-sound.sh permission_asked",
            "async": true,
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

Three levels of nesting:
1. **Hook event name** (`PostToolUse`, `Stop`, `Notification`, etc.) — the lifecycle point
2. **Matcher group** — array of objects, each with a `matcher` regex and an inner `hooks` array
3. **Hook handler** — object with `type`, `command`, `async`, `timeout`

### Hook Events Relevant to claude-peon

| opencode event | Claude Code hook | Matcher | Notes |
|----------------|-----------------|---------|-------|
| `tool.execute.before` | `PreToolUse` | `Bash\|Edit\|Write\|Read\|Glob\|Grep\|Task\|WebFetch\|WebSearch` | Fires before tool runs. Use `async: true` — sound should not block tool execution. |
| `tool.execute.after` | `PostToolUse` | same as above | Fires after tool succeeds. Use `async: true`. |
| `session.idle` | `Stop` | (no matcher — fires on every Stop) | Claude finished responding. Closest equivalent to "idle". No matcher supported on `Stop`. |
| `permission.asked` | `Notification` | `permission_prompt` | Fires when permission dialog appears. |
| `session.created` / startup | `SessionStart` | `startup` | Session began. Use for startup sound. |

**No direct equivalent for `message.updated` (user message):** The closest available event is `UserPromptSubmit`, which fires when the user submits a prompt. This is a reasonable substitute for the "acknowledge" sound.

### Hook Handler Fields (command type)

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| `type` | yes | — | Must be `"command"` for shell scripts |
| `command` | yes | — | Shell command string. Receives event JSON on stdin. |
| `async` | no | `false` | **Must be `true` for sound hooks.** Async hooks run in the background; the hook does not block Claude Code's response cycle. Sound playback is inherently fire-and-forget. |
| `timeout` | no | 600 (sync), 600 (async) | Seconds. Set to 10 for sound hooks — they should complete instantly. |

**Critical: use `async: true` for all sound hooks.** Without it, Claude Code waits for the hook to finish before continuing. `afplay` blocks until the sound finishes playing. A 2-second audio clip would freeze the Claude Code UI for 2 seconds per tool call.

### stdin Payload (what the hook script receives)

All hook events receive common fields plus event-specific fields:

```json
{
  "session_id": "abc123",
  "transcript_path": "/Users/.../.claude/projects/.../transcript.jsonl",
  "cwd": "/Users/.../my-project",
  "permission_mode": "default",
  "hook_event_name": "PostToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "npm test" },
  "tool_response": { ... },
  "tool_use_id": "toolu_01ABC123..."
}
```

For claude-peon's sound-playing hooks, the stdin payload is largely irrelevant — the hook just plays a sound and exits. The `tool_name` field could be used to select different sounds per tool, but this is optional.

### Exit Code Contract

| Exit code | Meaning | Use for sound hooks |
|-----------|---------|---------------------|
| 0 | Success | Always exit 0. Sound hooks are observers only — never block. |
| 2 | Block the action | Never use. Sound hooks must not interfere with Claude Code's operation. |
| Other | Non-blocking error | Irrelevant for sound hooks. |

Sound hooks must always exit 0. They must never exit 2. They must never print to stdout in a way that affects Claude's context (use `async: true` and/or redirect stdout to `/dev/null`).

### Environment Variables Available in Hooks

| Variable | Value | Use in claude-peon |
|----------|-------|---------------------|
| `CLAUDE_PROJECT_DIR` | Project root | Reference hook scripts bundled in the project. Use `"$CLAUDE_PROJECT_DIR/.claude/hooks/play-sound.sh"` in settings.json so paths are always absolute. |
| `CLAUDE_CODE_REMOTE` | `"true"` in web | Can guard against running afplay in remote environments where it would fail. |

---

## Hook Script Pattern for Sound Playback

The minimal viable hook script for playing a sound:

```bash
#!/bin/bash
# .claude/hooks/play-sound.sh
# Usage: play-sound.sh <mapping_name>
# Called by Claude Code hooks with event JSON on stdin (ignored for sound playback)

# Discard stdin to avoid blocking
cat > /dev/null

REPO_DIR="$(dirname "$(dirname "$(realpath "$0")")")"
CONFIG="$REPO_DIR/claude-peon.json"
SOUNDS_DIR="$REPO_DIR/sounds"

# Read volume from config (default 5)
VOLUME=$(jq -r '.volume // 5' "$CONFIG" 2>/dev/null || echo "5")

# Convert volume 1-10 to afplay 0-1 with exponential curve
# Same formula as existing index.js
AFPLAY_VOL=$(echo "scale=4; ($VOLUME/10)^2" | bc)

# Play the sound (non-blocking — hook itself is async: true in settings)
SOUND_FILE=$(jq -r --arg name "$1" '.mappings[] | select(.name == $name) | .sounds[0]' "$CONFIG" 2>/dev/null)

if [ -n "$SOUND_FILE" ] && [ -f "$SOUNDS_DIR/$SOUND_FILE" ]; then
  afplay -v "$AFPLAY_VOL" "$SOUNDS_DIR/$SOUND_FILE"
fi

exit 0
```

Key points:
- `cat > /dev/null` consumes stdin immediately (required — Claude Code pipes JSON to stdin and the pipe blocks if the script never reads it)
- Uses absolute path via `realpath` + `dirname` — never relative paths
- Always exits 0
- The outer hook has `async: true`, so `afplay` blocking is fine (it runs in a detached background process from Claude Code's perspective)

---

## Opencode → Claude Code Event Mapping

| opencode trigger type | opencode event/tool | Claude Code hook event | Matcher |
|----------------------|---------------------|------------------------|---------|
| `event` | `tui.command.execute` | `UserPromptSubmit` | (none) |
| `event` | `permission.asked` | `Notification` | `permission_prompt` |
| `event` | `permission.replied` | `PostToolUse` | (any) |
| `event` | `session.idle` | `Stop` | (none) |
| `event` | `message.updated` (role: user) | `UserPromptSubmit` | (none) |
| `tool.before` | `question` | `Notification` | `permission_prompt` |
| `tool.before` | any tool | `PreToolUse` | tool name regex |
| `tool.after` | any tool | `PostToolUse` | tool name regex |
| `event` | `openpeon.startup` | `SessionStart` | `startup` |

The opencode event model was richer (arbitrary named events on an event bus). Claude Code hooks are more coarse-grained (lifecycle points, not arbitrary events). For claude-peon's actual sound mappings, the above substitutions cover all existing use cases.

---

## Installation

```bash
# No new dependencies needed for the hook scripts themselves.
# jq is required if hook scripts parse JSON (optional for simple sound hooks):
brew install jq

# The UI server already uses Bun:
bun install  # installs from package.json if present
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `async: true` + `afplay` in shell script | `afplay` in inline command string | Never — inline commands are harder to test and can't read config files easily |
| Write to `~/.claude/settings.json` from UI server | Have user run `claude /hooks` manually | Never — the PROJECT.md requirement is that "Apply" handles everything; manual config defeats the purpose |
| Single hook script with mapping_name argument | One hook script per mapping | Single script is easier to maintain and update from the UI |
| Merge into existing settings.json (preserve other keys) | Overwrite settings.json | Never overwrite — users may have other hooks; merge is required |
| `~/.claude/settings.json` (global) | `.claude/settings.json` (project-local) | Project-local is appropriate only if the user wants sounds in one specific project. Global is correct for a personal developer tool. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `async: false` (default) on sound hooks | Claude Code waits for the hook to complete before continuing. `afplay` blocks for the duration of the audio. A 2-second sound = 2-second freeze of the Claude Code UI. | `async: true` on every sound hook |
| `exit 2` in sound hooks | Exit 2 is a blocking error — it tells Claude Code to cancel the tool call or reject the prompt. A sound hook that accidentally exits 2 breaks Claude Code's normal operation. | Always `exit 0` in sound hooks |
| Writing JSON to stdout from sound hooks | Claude Code parses stdout JSON for decision control. Sound hooks printing anything to stdout can corrupt this. | Redirect stdout to `/dev/null` or print nothing |
| Storing absolute paths in settings.json without `$CLAUDE_PROJECT_DIR` | The path will break if the user moves the repo. | Use `"$CLAUDE_PROJECT_DIR/.claude/hooks/play-sound.sh"` — the variable is expanded at runtime |
| Overwriting the entire `hooks` object in settings.json | Destroys any existing hooks the user has configured | Deep-merge: read existing settings.json, update only the claude-peon hook entries, write back |
| MCP server integration | Adds setup complexity (MCP config, server process) for no gain — hooks are sufficient for fire-and-forget sound triggers | Hooks-only approach |
| Plugin-based approach (`hooks/hooks.json`) | The Claude Code plugin system is a separate distribution mechanism. For a clone-and-run project, writing directly to settings.json is simpler. | Direct settings.json writing from the UI server |

---

## Version Compatibility

| Concern | Notes |
|---------|-------|
| `async` hook field | Documented in current official docs (verified 2026-02-23). Treat as stable. |
| `Stop` hook (no matcher) | Documented. `Stop` does not support matchers — it always fires when Claude finishes. |
| `Notification` hook with `permission_prompt` matcher | Documented matcher value. |
| `PostToolUse` tool name matchers | Case-sensitive regex. Tool names are PascalCase: `Bash`, `Edit`, `Write`, `Read`, `Glob`, `Grep`, `Task`, `WebFetch`, `WebSearch`. |
| settings.json location | `~/.claude/settings.json` for user-global. This is the correct path for claude-peon. |
| `$CLAUDE_PROJECT_DIR` env var | Available in all hook contexts, not just command hooks. Safe to use in command strings. |

---

## Sources

- `https://code.claude.com/docs/en/hooks` — Hooks reference (official). All hook events, settings.json schema, stdin payload schema, exit code contract, async hook semantics, matcher syntax. Fetched 2026-02-23. **Confidence: HIGH.**
- `https://code.claude.com/docs/en/hooks-guide` — Hooks quickstart guide (official). Practical examples, troubleshooting, notification hook example using macOS osascript, async test-running example. Fetched 2026-02-23. **Confidence: HIGH.**
- `https://claude.com/blog/how-to-configure-hooks` — Anthropic blog post on hooks configuration. Corroborates settings.json format. Fetched 2026-02-23. **Confidence: MEDIUM** (blog post, but from anthropic.com domain).
- Existing codebase (`/Users/lucassossai/dev/pessoal/claude-peon/index.js`, `ui/server.js`) — Current opencode implementation. Used to map existing event/tool trigger types to Claude Code equivalents. **Confidence: HIGH** (source of truth for what currently exists).

---

*Stack research for: Claude Code hooks-based sound effects integration*
*Researched: 2026-02-23*
