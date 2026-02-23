# Architecture Research

**Domain:** Claude Code hooks-based sound plugin (conversion from opencode plugin)
**Researched:** 2026-02-23
**Confidence:** HIGH — Claude Code hooks docs verified via official source (code.claude.com/docs/en/hooks)

---

## What Changes vs What Stays the Same

### What Stays the Same

- Sound playback engine (`playSound`, `afplay`, volume curve) — unchanged
- Config schema: `{ volume, mappings, randomPreset }` — unchanged
- Preset system: `ui/presets/*.json` files — unchanged
- Web UI server structure (`ui/server.js`) — largely unchanged
- Sound asset directories (`sounds/`) — unchanged
- `loadConfig`, `loadPreset`, `listPresets` helper functions — unchanged
- Duplicate-event prevention logic — replaced by a simpler approach (hooks fire once per event by design)

### What Changes

| Old (opencode) | New (Claude Code) |
|---|---|
| `OpenPeonPlugin` factory function exported from `index.js` | Deleted entirely — no plugin API |
| `event`, `tool.execute.before`, `tool.execute.after` handlers | Replaced by hook shell scripts read from stdin |
| `tool:` object with `peon_*` tools | Deleted — no MCP, no tools |
| Plugin registered with `@opencode-ai/plugin` | Hooks registered in `~/.claude/settings.json` |
| Deploy: copy files to `~/.config/opencode/plugins/openpeon/` | Deploy: write hook entries into `~/.claude/settings.json` |
| Duplicate detection via in-memory ID tracking | Not needed — each hook invocation is a fresh process |
| Single long-lived plugin process | Stateless short-lived hook processes per event |
| In-memory runtime state (`mappings`, `volume`, `currentPreset`) | Each hook process reads config from disk on invocation |

---

## Standard Architecture

### System Overview

```
Claude Code (runtime)
    │
    │  fires lifecycle event
    ▼
~/.claude/settings.json
    │  (matcher resolves which hook to run)
    ▼
Hook Shell Script   ←──── reads JSON from stdin (event context)
    │
    │  reads
    ▼
claude-peon/claude-peon.json    (config: volume, mappings, preset)
    │
    │  resolves sound file path
    ▼
claude-peon/sounds/{category}/{file}.wav
    │
    │  spawns
    ▼
afplay -v {volume} {sound-path}     (macOS audio playback)
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|---|---|---|
| `~/.claude/settings.json` hook entries | Declares which hook scripts run on which Claude Code events. Written by UI "Apply" | Claude Code runtime (reads it); UI server (writes it) |
| Hook dispatcher script (`play.js` or `play.sh`) | Single entry point for all hook events. Reads stdin JSON, reads config, selects and plays sound | Config file (read), afplay (spawn), sound files (path resolution) |
| Config file (`claude-peon.json`) | Persistent mapping of trigger names to sound files and volume. Source of truth | Hook dispatcher (read-only), UI server (read/write) |
| Preset files (`ui/presets/*.json`) | Named configurations with a full set of mappings + volume | UI server (read/write), hook dispatcher (can be loaded as active config) |
| UI server (`ui/server.js`) | HTTP API + static file serving. Manages config, presets, hook installation, sound preview | Config file (read/write), settings.json (write on Apply), browser |
| Sound assets (`sounds/`) | Audio files organized by game/faction | Hook dispatcher (path resolution), UI server (listing, preview streaming) |

---

## Recommended Project Structure

```
claude-peon/
├── play.js                       # Hook dispatcher: reads stdin, reads config, plays sound
├── claude-peon.json              # Active config (volume + mappings)
├── package.json                  # Updated: removes @opencode-ai/plugin dep
├── ui/
│   ├── server.js                 # Web UI server (updated: Apply writes settings.json)
│   ├── index.html                # Config UI frontend
│   ├── presets/                  # Preset JSON files
│   │   ├── wc2-peon.json
│   │   ├── wc3-peasant.json
│   │   └── scbw-scv.json
│   └── [static assets]
└── sounds/
    ├── wc2-horde/
    ├── wc3-peasant/
    └── [other categories]
```

### Structure Rationale

- **`play.js` at root:** Hook scripts need a stable absolute path in `settings.json`. Root-level placement makes the path easy to reference and document. Using `.js` run via `node` or `bun` keeps the existing JS codebase consistent.
- **`claude-peon.json` at root:** Config is read by `play.js` on every hook invocation. Keeping it at root alongside the dispatcher is the simplest co-location.
- **`ui/` directory preserved:** The web UI is a separate concern and keeps its own server. Its internal structure does not change.
- **`index.js` deleted (not repurposed):** The old plugin entry point contains the plugin factory pattern which is incompatible with the hooks model. Creating `play.js` fresh is cleaner than retrofitting `index.js`.

---

## Architectural Patterns

### Pattern 1: Stateless Hook Dispatcher

**What:** Each hook invocation is an independent, short-lived process. It reads configuration from disk, selects a sound, plays it, and exits. No shared memory between invocations.

**When to use:** Always — this is the fundamental constraint imposed by Claude Code's hooks model. Hooks are shell commands, not long-lived processes.

**Trade-offs:**
- Pro: Simple — no state management, no race conditions
- Pro: Each invocation reflects latest config (no stale in-memory state)
- Con: Disk read on every hook event (acceptable for a JSON config file of < 10KB)
- Con: No cross-event deduplication via shared memory (not needed; hooks fire once per discrete event)

**Example:**
```javascript
// play.js — called by Claude Code as a hook command
const input = JSON.parse(fs.readFileSync('/dev/stdin', 'utf8'))
const hookEvent = input.hook_event_name   // e.g. "PreToolUse"
const toolName = input.tool_name          // e.g. "Bash"

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
const mapping = selectMapping(config.mappings, hookEvent, toolName)
if (mapping) playSound(randomFrom(mapping.sounds), config.volume)
```

### Pattern 2: Event-to-Trigger Mapping via Config

**What:** The mapping between Claude Code hook events and sounds is data, not code. The dispatcher reads a mapping table at runtime rather than having hardcoded if/else branches.

**When to use:** Always — this is what enables the web UI to reconfigure behavior without changing code.

**Trade-offs:**
- Pro: Web UI can modify sound behavior without touching scripts
- Pro: Presets are just different config files; switching presets is a file copy
- Con: Slightly more complex dispatcher logic (must interpret the mapping format)

**Config format (unchanged from opencode):**
```json
{
  "volume": 7,
  "mappings": [
    {
      "name": "acknowledge",
      "triggers": [
        { "type": "PreToolUse" },
        { "type": "UserPromptSubmit" }
      ],
      "sounds": ["acknowledge1.wav", "acknowledge2.wav"]
    },
    {
      "name": "work-complete",
      "triggers": [{ "type": "Stop" }],
      "sounds": ["work-complete.wav"]
    }
  ]
}
```

**Note:** The trigger `type` values change from opencode event names (`"message.updated"`, `"tool.before"`) to Claude Code hook event names (`"PreToolUse"`, `"Stop"`). This is the critical schema migration.

### Pattern 3: UI-Managed Hook Installation

**What:** The web UI's "Apply" button reads the user's `~/.claude/settings.json`, merges in the claude-peon hook entries, and writes it back. Users never touch JSON manually.

**When to use:** On "Apply" button click. Also supports a "Remove" operation that strips claude-peon hooks from the settings file.

**Trade-offs:**
- Pro: Zero-friction setup — clone repo, open UI, click Apply, done
- Pro: Clean uninstall path
- Con: UI must read and carefully merge settings.json to avoid clobbering unrelated hooks
- Con: Settings file is owned by Claude Code; concurrent writes are a risk if Claude Code is running

**Settings.json hook entry format (authoritative — from official docs):**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node /absolute/path/to/claude-peon/play.js",
            "async": true
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node /absolute/path/to/claude-peon/play.js",
            "async": true
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /absolute/path/to/claude-peon/play.js",
            "async": true
          }
        ]
      }
    ]
  }
}
```

**Critical design note on `async: true`:** Sound playback must be async. If the hook blocks Claude Code (synchronous default), each sound would stall Claude's execution until `afplay` finishes. With `async: true`, the hook fires and Claude continues immediately. The trade-off is that async hooks cannot block or return decisions — which is exactly what we want for a sound plugin.

---

## Data Flow

### Hook Trigger Flow (new architecture)

```
User submits prompt
    │
    ▼
Claude Code fires UserPromptSubmit event
    │
    ▼
settings.json matcher resolves → play.js (async)
    │
    ▼
play.js reads stdin JSON:
  { hook_event_name: "UserPromptSubmit", ... }
    │
    ▼
play.js reads claude-peon.json from disk
    │
    ▼
selectMapping(): find mapping where trigger.type === "UserPromptSubmit"
    │
    ▼
randomFrom(mapping.sounds) → "acknowledge2.wav"
    │
    ▼
playSound(): spawn afplay -v {volume} {sounds/wc3-peasant/acknowledge2.wav}
    │
    ▼
afplay plays sound, exits
Claude Code continues (was not blocked)
```

### Web UI Apply Flow (new architecture)

```
User clicks "Apply" in browser
    │
    ▼
Browser POSTs to /api/apply
    │
    ▼
ui/server.js: readFileSync(~/.claude/settings.json)
    │
    ▼
merge: insert claude-peon hook entries under each hook event key
  (preserve any existing user hooks)
    │
    ▼
writeFileSync(~/.claude/settings.json, merged JSON)
    │
    ▼
Return { success: true, installedHooks: [...] } to browser
    │
    ▼
Browser shows confirmation: "Hooks installed. Restart Claude Code to activate."
```

### Event-to-Hook Mapping (trigger name translation)

| opencode trigger | Claude Code hook event | Notes |
|---|---|---|
| `message.updated` (role: user) | `UserPromptSubmit` | User sends message |
| `tool.execute.before` (any tool) | `PreToolUse` | Before any tool runs |
| `tool.execute.after` (any tool) | `PostToolUse` | After any tool completes |
| `session.idle` | `Stop` | Claude finishes responding |
| `permission.asked` | `Notification` (matcher: `permission_prompt`) | Permission dialog shown |
| `openpeon.startup` | `SessionStart` | Session begins |

**Note:** The Claude Code hooks model does not distinguish tool-specific pre/post by tool name in the command itself — the matcher in settings.json handles that. For a sound plugin, matching all tools with an empty matcher `""` is the right approach (one dispatcher handles all tool names, selects sound based on config).

---

## Anti-Patterns

### Anti-Pattern 1: Synchronous Hook (blocking audio)

**What people do:** Omit `async: true` on the hook command.
**Why it's wrong:** The hook blocks Claude Code's execution until `afplay` finishes playing the sound. Every tool call stalls by the duration of the audio clip (1-3 seconds). This makes the plugin unusable.
**Do this instead:** Always set `async: true` on all claude-peon hook commands. Sound playback is a pure side effect; it never needs to block.

### Anti-Pattern 2: Per-Event Separate Scripts

**What people do:** Register a different script file for each hook event (`pre-tool.js`, `post-tool.js`, `stop.js`).
**Why it's wrong:** Code duplication. The config loading, sound selection, and playback logic is identical across events. Maintenance becomes fragmented.
**Do this instead:** Use a single `play.js` dispatcher that reads `hook_event_name` from stdin and routes accordingly. One file to maintain, one path to configure in settings.json.

### Anti-Pattern 3: Hardcoded Sound-to-Event Mapping in Script

**What people do:** Put `if (event === 'PreToolUse') playSound('acknowledge.wav')` directly in `play.js`.
**Why it's wrong:** Makes the sound selection non-configurable without editing code. Defeats the purpose of the web UI.
**Do this instead:** Keep all trigger-to-sound mappings in `claude-peon.json`. The script reads config and dispatches dynamically.

### Anti-Pattern 4: Overwriting settings.json Instead of Merging

**What people do:** The "Apply" endpoint writes a fresh settings.json containing only claude-peon hooks.
**Why it's wrong:** Destroys any other hooks the user has configured (from other projects, tools, or their own workflows).
**Do this instead:** Read the existing settings.json, merge only the `hooks` keys that claude-peon owns, write back. Define a namespace convention (e.g., tag hook entries with a comment or group them under identifiable structure) so "Remove" can find and clean them up later.

---

## Integration Points

### Claude Code Settings File

| Location | Purpose | Notes |
|---|---|---|
| `~/.claude/settings.json` | User-scope hook installation | Applied to all Claude Code sessions on the machine |
| `.claude/settings.json` | Project-scope hook installation | Alternative if user prefers per-project scoping |

The UI "Apply" flow targets `~/.claude/settings.json` (user scope) by default. This is the right choice for a personal sound plugin — install once, works everywhere.

### Claude Code Hook Events Used

| Event | Matcher | Purpose |
|---|---|---|
| `UserPromptSubmit` | none (fires always) | Play sound when user sends message |
| `PreToolUse` | `""` (all tools) | Play sound before tool executes |
| `PostToolUse` | `""` (all tools) | Play sound after tool completes |
| `Stop` | none | Play "work complete" sound when Claude finishes |
| `Notification` | `permission_prompt` | Play alert sound when permission dialog appears |
| `SessionStart` | `startup` | Play startup sound on new session |

### macOS afplay

| Integration | Pattern | Notes |
|---|---|---|
| afplay | `spawn(afplayPath, ['-v', volume, soundPath])` with detached + unref | Unchanged from current implementation |
| Platform check | `process.platform === 'darwin'` at script top | Exit 0 silently on non-macOS; hook must not crash |

### Internal Boundaries

| Boundary | Communication | Notes |
|---|---|---|
| `play.js` ↔ `claude-peon.json` | Direct file read (`readFileSync`) | No API; same machine, same filesystem |
| `ui/server.js` ↔ `~/.claude/settings.json` | Direct file read/write | Must handle JSON parse errors gracefully; file may not exist yet |
| `ui/server.js` ↔ `claude-peon.json` | Direct file read/write | Unchanged from current server.js pattern |
| Browser ↔ `ui/server.js` | HTTP REST API | Unchanged |

---

## Build Order Implications

Dependencies between components determine the correct implementation sequence:

1. **`play.js` (hook dispatcher)** — No dependencies on UI changes. Can be built and manually tested independently by running `echo '{"hook_event_name":"Stop"}' | node play.js`. This is the load-bearing piece; everything else depends on it working.

2. **Trigger schema migration** — `claude-peon.json` default config and presets need their `triggers` updated from opencode event names to Claude Code hook event names. Must happen alongside `play.js` since the dispatcher and config must speak the same trigger vocabulary.

3. **`ui/server.js` Apply/Remove endpoints** — Depends on knowing the exact hook entry schema (verified from docs). Can be built once `play.js` is working (so Apply can point to a real, tested path). The rest of server.js (config read/write, presets, sound listing, preview) is unchanged.

4. **`ui/index.html` Apply button** — Depends on Apply/Remove API endpoints existing. Frontend change only — add button, call endpoint, show result.

5. **Branding pass** — Rename `openpeon.json` → `claude-peon.json`, update string references, update `package.json`. Can be done last or in parallel with any step; no architectural dependency.

---

## Scaling Considerations

This is a single-user local tool. Scaling is not a relevant concern. The only "scale" question is reliability:

| Concern | At 1 user (actual use case) | Notes |
|---|---|---|
| Config read latency | Negligible — JSON < 10KB, local SSD | Disk read per hook invocation is fine |
| Concurrent settings.json writes | Low risk — Apply is a deliberate one-time action | Don't apply while Claude Code is mid-session if possible |
| afplay process count | One per sound event, exits after 1-3 seconds | No accumulation; short-lived detached processes |

---

## Sources

- Claude Code Hooks Reference (official): https://code.claude.com/docs/en/hooks — HIGH confidence
- Claude Code Settings documentation (official): https://code.claude.com/docs/en/settings — HIGH confidence
- Existing codebase: `/Users/lucassossai/dev/pessoal/claude-peon/index.js`, `ui/server.js` — direct read
- Project context: `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md` — direct read

---

*Architecture research for: claude-peon hooks conversion*
*Researched: 2026-02-23*
