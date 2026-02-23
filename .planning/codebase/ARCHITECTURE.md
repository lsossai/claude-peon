# Architecture

**Analysis Date:** 2026-02-23

## Pattern Overview

**Overall:** Event-Driven Plugin Architecture with Configuration-Based Sound Mapping

**Key Characteristics:**
- Pub/sub event system for responsive sound triggers
- Configuration-driven mapping between triggers and sounds
- Layered separation between plugin initialization, event handling, and audio playback
- Preset system for sound configuration variants
- Web UI for configuration management separate from core plugin
- Platform-aware audio handling (macOS-specific with graceful degradation)

## Layers

**Plugin Core Layer:**
- Purpose: Main plugin export and initialization, event handler registration, tool definitions
- Location: `/Users/lucassossai/dev/pessoal/claude-peon/index.js`
- Contains: Plugin factory function `OpenPeonPlugin`, event handlers, tool implementations
- Depends on: `@opencode-ai/plugin` (peer dependency), Node.js built-ins (fs, path, child_process, os)
- Used by: OpenCode plugin runtime

**Configuration Layer:**
- Purpose: Load, validate, and manage configuration and preset files
- Location: `/Users/lucassossai/dev/pessoal/claude-peon/index.js` (lines 10-105)
- Contains: `loadConfig()`, `loadPreset()`, `listPresets()` functions
- Depends on: File system (fs module), JSON parsing
- Used by: Plugin initialization, preset switching tool

**Event Handling Layer:**
- Purpose: Match incoming events to trigger conditions and execute sound mappings
- Location: `/Users/lucassossai/dev/pessoal/claude-peon/index.js` (lines 207-289)
- Contains: `matchesEventTrigger()`, `fireEvent()`, event handler registration
- Depends on: Configuration layer for mapping definitions
- Used by: OpenCode event system

**Audio Playback Layer:**
- Purpose: Execute actual sound playback via system command
- Location: `/Users/lucassossai/dev/pessoal/claude-peon/index.js` (lines 138-167)
- Contains: `playSound()`, volume calculation, afplay process spawning
- Depends on: macOS afplay utility, child_process module
- Used by: Event handlers, tool implementations

**Tool Interface Layer:**
- Purpose: Expose configuration management functions as tools to Claude
- Location: `/Users/lucassossai/dev/pessoal/claude-peon/index.js` (lines 325-404)
- Contains: `peon_list_presets`, `peon_switch_preset`, `peon_current_config`, `peon_set_volume` tools
- Depends on: Configuration layer, file system
- Used by: Claude/OpenCode runtime

**Web UI Server Layer:**
- Purpose: HTTP REST API and static file serving for config UI
- Location: `/Users/lucassossai/dev/pessoal/claude-peon/ui/server.js`
- Contains: API endpoints, static file serving, deployment logic
- Depends on: Bun runtime, Node.js fs/path modules
- Used by: Browser, deployment workflow

## Data Flow

**Plugin Initialization:**

1. OpenPeon plugin loads from `index.js`
2. `loadConfig()` reads `openpeon.json` or returns DEFAULT_CONFIG
3. If `config.randomPreset` is true, `listPresets()` finds available presets and `loadPreset()` loads one randomly
4. Current mappings and volume set from config or preset
5. Audio capability checked (platform detection: Darwin required, afplay path validation)
6. Event handlers and tools registered with OpenCode runtime
7. `fireEvent("openpeon.startup")` triggers welcome sound

**Event Trigger Flow:**

1. OpenCode system emits event (e.g., "message.updated", "session.idle")
2. Plugin's `event` handler receives event object with properties (role, id, etc.)
3. `matchesEventTrigger()` checks each mapping's triggers against event type, role, and tool name
4. Duplicate detection: compares message/permission IDs to prevent repeated triggers
5. Matching mapping found
6. `playMappingSound()` selects random sound from mapping.sounds array
7. `playSound()` converts volume (1-10 scale) to afplay volume (0-1 exponential), spawns afplay process
8. Detached child process plays in background; errors logged if `OPENPEON_DEBUG` set

**Tool Execution Flow:**

1. Claude executes `peon_switch_preset` tool with preset name argument
2. `loadPreset()` loads preset JSON from `ui/presets/[name].json`
3. `reloadMappings()` updates in-memory mappings and volume
4. `currentPreset` variable updated
5. Subsequent events trigger sounds from new preset

**Web UI Configuration Flow:**

1. User navigates to http://localhost:3456 (served by `ui/server.js`)
2. Frontend fetches `/api/config` to load current configuration
3. Frontend fetches `/api/sounds/directories` to list sound categories
4. User selects sounds, creates trigger-sound mappings
5. User clicks Save
6. Frontend POSTs to `/api/config` with updated config
7. `saveConfig()` writes to `openpeon.json`
8. User clicks Deploy
9. `deployPlugin()` copies files to `~/.config/opencode/plugins/openpeon/`
10. Loader script written to `~/.config/opencode/plugins/openpeon.js`

**State Management:**

- **Persistent state:** Stored in `openpeon.json` (config) and `ui/presets/*.json` (presets)
- **Runtime state:** In-memory variables in plugin closure: `mappings`, `volume`, `currentPreset`, `lastMessageId`, `lastPermissionRequestId`, `audioDisabled`
- **Stateless:** Web UI server is stateless; reads/writes files for all operations
- **No database:** File-based configuration only

## Key Abstractions

**Mapping:**
- Purpose: Describes trigger conditions and associated sound files to play
- Examples:
  - `{ name: "acknowledge", triggers: [...], sounds: [...] }`
  - Defined in `DEFAULT_CONFIG.mappings` and preset JSON files
- Pattern: JSON object with trigger array (event/tool/before/after types) and sounds array (filenames)

**Trigger:**
- Purpose: Describes when a mapping should execute
- Examples:
  - `{ type: "event", event: "message.updated", role: "user" }`
  - `{ type: "tool.before", tool: "question" }`
  - `{ type: "tool.after", tool: "bash" }`
- Pattern: Polymorphic trigger types; matched against incoming events or tool executions

**Configuration Schema:**
- Defined implicitly in `DEFAULT_CONFIG` structure
- Contains: `volume` (1-10), `mappings` (array), optional `randomPreset` (boolean)
- No explicit schema validation; defensive reads with type checks

**Sound Asset:**
- Purpose: Audio file referenced by mapping
- Location: `sounds/[category]/[filename].(wav|mp3)`
- Examples: `"wc3-peasant/peasant-acknowledge-1.wav"`, `"buildings-blacksmith.wav"`
- Categories: wc2-alliance, wc2-horde, wc3-peasant, sc2-protoss/terran/zerg, scbw-* (StarCraft: Brood War)

**Preset:**
- Purpose: Predefined configuration with specific sound mappings and volume
- Location: `ui/presets/[name].json`
- Examples: `wc2-peon.json`, `wc3-peasant.json`, `scbw-scv.json`
- Pattern: JSON file containing same structure as config (volume, mappings)

## Entry Points

**Plugin Entry Point:**
- Location: `index.js` (exported as `OpenPeonPlugin`)
- Triggers: OpenCode plugin system loads via registration
- Responsibilities: Initialize plugin state, register event handlers and tools, set up audio system

**Event Handlers:**
- **`event`** handler (lines 242-290): Receives all OpenCode events, matches against mappings, triggers sounds
- **`tool.execute.before`** handler (lines 291-307): Fires before tool execution, matches tool-specific triggers
- **`tool.execute.after`** handler (lines 308-324): Fires after tool execution, matches tool-specific triggers

**Tools (Tool Entry Points):**
- **`peon_list_presets`** (lines 326-342): Lists available preset names
- **`peon_switch_preset`** (lines 343-364): Switches active preset by name
- **`peon_current_config`** (lines 365-381): Returns formatted current configuration display
- **`peon_set_volume`** (lines 382-403): Sets volume 1-10 and saves to config

**Web UI Entry Points:**
- **GET `/`** (index.html): Serves UI frontend
- **GET `/api/meta`** (line 197): Returns trigger types, event values, tool values for UI dropdowns
- **GET/POST `/api/config`** (lines 205-214): Read/write current configuration
- **GET `/api/sounds/directories`** (lines 216-218): List sound categories
- **GET `/api/sounds/list/{dir}`** (lines 220-223): List sounds in category
- **GET `/api/sounds/play/{path}`** (lines 225-236): Stream sound file for browser playback
- **GET/POST/DELETE `/api/presets/{name}`** (lines 238-271): Manage preset files
- **POST `/api/deploy`** (lines 273-276): Copy plugin to deployment location

## Error Handling

**Strategy:** Defensive programming with graceful degradation. Errors logged to debug file but do not crash plugin.

**Patterns:**

- **Config Loading Errors:** If config file missing or invalid JSON, return DEFAULT_CONFIG (lines 57-76)
- **Platform Incompatibility:** Check platform at init; disable audio on non-macOS and log reason (lines 125-134)
- **Audio Playback Errors:** Catch spawn errors and afplay process errors; set `audioDisabled = true` and log (lines 156-165)
- **Debug Logging:** Conditional logging to `~/.config/opencode/openpeon-debug.log` if `OPENPEON_DEBUG` env var set
- **Duplicate Event Prevention:** Track last message/permission request IDs; skip if duplicate (lines 256-267)
- **Tool Error Responses:** Return descriptive error strings from tools rather than throwing (e.g., lines 352-355)

## Cross-Cutting Concerns

**Logging:**
- Implementation: `logDebug()` function writes to `~/.config/opencode/openpeon-debug.log`
- Conditional on `OPENPEON_DEBUG` environment variable
- Called on initialization, config loading, audio errors, event triggers

**Validation:**
- Configuration: Type checking on `mappings` (Array), `volume` (number), `randomPreset` (boolean)
- No deep schema validation; relies on structural checks
- Sound file path validation: Only played if file passed through getSoundPath()

**Platform Support:**
- macOS (Darwin) only for audio playback
- Other platforms: Audio disabled gracefully, all other functionality works
- Uses Bun's `which()` to find afplay or falls back to `/usr/bin/afplay`

**Concurrency:**
- Sound playback spawned asynchronously with setTimeout(..., 0) to not block event handler
- Child processes spawned detached (unref()) to not block plugin
- No race conditions on config state: mappings/volume only updated on preset switch (tool) or startup

**State Consistency:**
- Config file as source of truth between sessions
- Runtime state updated immediately but async file writes (peon_set_volume)
- No locking; assumes single process instance

---

*Architecture analysis: 2026-02-23*
